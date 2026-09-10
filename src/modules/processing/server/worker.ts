import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { AppError } from "@/server/errors";
import { getModelClient } from "./model-client";
import {
  ingestModelResult,
  processingJobForWorker,
  recordModelError,
} from "./service";

type OutboxEvent = {
  id: string;
  jobId: string;
  eventType: "PROCESSING_SUBMIT" | "PROCESSING_POLL";
};

async function claimNextEvent(): Promise<OutboxEvent | null> {
  return getDb().transaction(async (tx) => {
    const result = await tx.execute(sql`WITH candidate AS (
      SELECT id FROM processing_outbox
      WHERE published_at IS NULL
        AND available_at <= now()
        AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
      ORDER BY available_at,id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE processing_outbox o
    SET locked_at=now(),attempts=o.attempts+1
    FROM candidate
    WHERE o.id=candidate.id
    RETURNING o.id,o.job_id AS "jobId",o.event_type AS "eventType"`);
    return result.rows.length ? (result.rows[0] as OutboxEvent) : null;
  });
}

async function completeEvent(event: OutboxEvent) {
  await getDb().execute(sql`UPDATE processing_outbox SET published_at=now(),locked_at=NULL WHERE id=${event.id}`);
}

async function rescheduleEvent(event: OutboxEvent, delaySeconds: number, error?: string) {
  await getDb().execute(sql`UPDATE processing_outbox SET locked_at=NULL,available_at=now()+(${delaySeconds} * interval '1 second'),last_error=${error ?? null} WHERE id=${event.id}`);
}

async function processSubmit(event: OutboxEvent) {
  const context = await processingJobForWorker(event.jobId);
  const client = getModelClient();
  const attempt = await getDb().transaction(async (tx) => {
    const updated = await tx.execute(sql`UPDATE processing_jobs SET status='SUBMITTING',stage='SUBMITTING',attempt=attempt+1,provider=${client.provider},started_at=COALESCE(started_at,now()),updated_at=now() WHERE id=${event.jobId} AND status IN ('QUEUED','SUBMITTING') RETURNING attempt,request_id AS "requestId",payload_hash AS "payloadHash"`);
    if (!updated.rows.length) return null;
    const row = updated.rows[0] as Record<string, unknown>;
    await tx.execute(sql`INSERT INTO processing_attempts(job_id,operation,attempt,status,request_id,payload_hash) VALUES(${event.jobId},'submit',${Number(row.attempt)},'RUNNING',${row.requestId},${row.payloadHash})`);
    return Number(row.attempt);
  });
  if (!attempt) return;
  try {
    const response = await client.submitJob(context.request, context.request.request_id);
    if (response.requestId !== context.request.request_id)
      throw new AppError(503, "MODEL_IDENTITY_MISMATCH", "The model submission did not preserve the request ID.");
    await getDb().transaction(async (tx) => {
      await tx.execute(sql`UPDATE processing_jobs SET status='SUBMITTED',stage='POLLING',remote_job_id=${response.jobId},updated_at=now(),error_code=NULL,error_message=NULL,retryable=NULL WHERE id=${event.jobId}`);
      await tx.execute(sql`UPDATE processing_attempts SET status='SUCCEEDED',remote_job_id=${response.jobId},completed_at=now() WHERE job_id=${event.jobId} AND operation='submit' AND attempt=${attempt}`);
      await tx.execute(sql`INSERT INTO processing_job_history(job_id,from_status,to_status,stage,reason) VALUES(${event.jobId},'SUBMITTING','SUBMITTED','POLLING','Model job accepted')`);
      await tx.execute(sql`INSERT INTO processing_outbox(job_id,event_type,available_at) VALUES(${event.jobId},'PROCESSING_POLL',now()) ON CONFLICT(job_id,event_type) DO UPDATE SET published_at=NULL,available_at=now(),locked_at=NULL`);
    });
    await completeEvent(event);
  } catch (error) {
    await getDb().execute(sql`UPDATE processing_attempts SET status='FAILED',error_code=${error instanceof AppError ? error.code : "MODEL_UNAVAILABLE"},error_message=${error instanceof Error ? error.message : "Model submission failed"},completed_at=now() WHERE job_id=${event.jobId} AND operation='submit' AND attempt=${attempt}`);
    await handleFailure(event, error);
  }
}

async function processPoll(event: OutboxEvent) {
  const context = await processingJobForWorker(event.jobId);
  const remoteJobId = context.job.remote_job_id;
  if (!remoteJobId) {
    await handleFailure(event, new AppError(503, "MODEL_JOB_ID_MISSING", "The model did not return a job ID."));
    return;
  }
  const client = getModelClient();
  const attempt = await getDb().transaction(async (tx) => {
    const updated = await tx.execute(sql`UPDATE processing_jobs SET status='RUNNING',stage='POLLING',updated_at=now() WHERE id=${event.jobId} AND status IN ('SUBMITTED','RUNNING') RETURNING request_id AS "requestId",payload_hash AS "payloadHash"`);
    if (!updated.rows.length) return null;
    const row = updated.rows[0] as Record<string, unknown>;
    const next = await tx.execute(sql`SELECT COALESCE(max(attempt),0)::int+1 AS next_attempt FROM processing_attempts WHERE job_id=${event.jobId} AND operation='poll'`);
    const nextAttempt = Number(next.rows[0].next_attempt);
    await tx.execute(sql`INSERT INTO processing_attempts(job_id,operation,attempt,status,remote_job_id,request_id,payload_hash) VALUES(${event.jobId},'poll',${nextAttempt},'RUNNING',${remoteJobId},${row.requestId},${row.payloadHash})`);
    return nextAttempt;
  });
  if (!attempt) return;
  try {
    const status = await client.getJob(String(remoteJobId));
    if (status.request_id !== String(context.job.request_id) || status.job_id !== String(remoteJobId))
      throw new AppError(503, "MODEL_IDENTITY_MISMATCH", "The model status did not match this job.");
    if (status.status === "QUEUED" || status.status === "RUNNING") {
      await getDb().execute(sql`UPDATE processing_attempts SET status='SUCCEEDED',completed_at=now() WHERE job_id=${event.jobId} AND operation='poll' AND attempt=${attempt}`);
      await getDb().execute(sql`UPDATE processing_jobs SET status='RUNNING',stage='POLLING',updated_at=now() WHERE id=${event.jobId}`);
      await rescheduleEvent(event, 2);
      return;
    }
    if (status.status === "FAILED" || status.status === "CANCELLED") {
      const failure = new AppError(status.status === "CANCELLED" ? 409 : 503, status.error?.code ?? "MODEL_FAILED", status.error?.message ?? "The model job failed.");
      await getDb().execute(sql`UPDATE processing_attempts SET status='FAILED',error_code=${failure.code},error_message=${failure.message},completed_at=now() WHERE job_id=${event.jobId} AND operation='poll' AND attempt=${attempt}`);
      await handleFailure(event, failure, status.error?.retryable ?? false);
      return;
    }
    const result = await client.getResult(String(remoteJobId));
    const ingested = await ingestModelResult(event.jobId, result);
    await getDb().execute(sql`UPDATE processing_attempts SET status=${ingested.accepted ? "SUCCEEDED" : "REJECTED"},error_code=${ingested.accepted ? null : ingested.code},error_message=${ingested.accepted ? null : ingested.message},completed_at=now() WHERE job_id=${event.jobId} AND operation='poll' AND attempt=${attempt}`);
    await completeEvent(event);
  } catch (error) {
    await getDb().execute(sql`UPDATE processing_attempts SET status='FAILED',error_code=${error instanceof AppError ? error.code : "MODEL_UNAVAILABLE"},error_message=${error instanceof Error ? error.message : "Model polling failed"},completed_at=now() WHERE job_id=${event.jobId} AND operation='poll' AND attempt=${attempt}`);
    await handleFailure(event, error);
  }
}

async function handleFailure(event: OutboxEvent, error: unknown, explicitRetryable?: boolean) {
  const retryable = explicitRetryable ?? (error instanceof AppError ? error.status >= 500 : true);
  const outcome = await recordModelError(event.jobId, error, retryable);
  if (outcome?.exhausted) await completeEvent(event);
  else await rescheduleEvent(event, Math.min(60, 2 ** Math.max(0, (outcome ? 1 : 0))));
}

export async function runProcessingOnce() {
  const event = await claimNextEvent();
  if (!event) return false;
  if (event.eventType === "PROCESSING_SUBMIT") await processSubmit(event);
  else await processPoll(event);
  return true;
}
