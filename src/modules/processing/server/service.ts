import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Transaction } from "@/server/db";
import { getConfig } from "@/server/config";
import { AppError } from "@/server/errors";
import {
  requireActor,
  requirePermission,
  lockActor,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import { scopedIds } from "@/modules/master-data/server/service";
import type { Actor } from "@/modules/identity/contracts";
import {
  modelRequestSchema,
  modelResultSchema,
  processOptionsSchema,
  type ModelRequest,
  type ModelResult,
  type ProcessingJobSummary,
} from "../contracts";

const jobColumns = sql`j.id,j.document_id AS "documentId",j.document_revision AS "documentRevision",j.input_sha256 AS "inputSha256",j.status,j.stage,j.attempt,j.max_attempts AS "maxAttempts",j.remote_job_id AS "remoteJobId",j.provider,j.model_name AS "modelName",j.model_version AS "modelVersion",j.prompt_version AS "promptVersion",j.error_code AS "errorCode",j.error_message AS "errorMessage",j.retryable,j.created_at AS "createdAt",j.updated_at AS "updatedAt",j.completed_at AS "completedAt"`;

function visible(actor: Actor) {
  return sql`d.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}

function asSummary(row: Record<string, unknown>): ProcessingJobSummary {
  return {
    ...row,
    createdAt: new Date(String(row.createdAt)).toISOString(),
    updatedAt: new Date(String(row.updatedAt)).toISOString(),
    completedAt: row.completedAt ? new Date(String(row.completedAt)).toISOString() : null,
  } as ProcessingJobSummary;
}

function inputUrl(documentId: string, revision: number, sha256: string) {
  const config = getConfig();
  if (config.MODEL_API_MODE === "http") {
    if (!config.MODEL_INPUT_BASE_URL)
      throw new AppError(503, "MODEL_INPUT_NOT_CONFIGURED", "Model input delivery is not configured.");
    return `${config.MODEL_INPUT_BASE_URL.replace(/\/$/, "")}/${documentId}/${revision}?sha256=${sha256}`;
  }
  return `mock://document/${documentId}/${revision}`;
}

async function requestForJob(
  tx: Transaction,
  jobId: string,
): Promise<{ job: Record<string, unknown>; request: ModelRequest; document: Record<string, unknown> }> {
  const result = await tx.execute(sql`SELECT j.*,d.original_name,d.mime_type,d.page_count,d.revision AS current_revision,d.sha256 AS current_sha256,sv.version AS schema_version,sv.id AS schema_version_id,sv.json_schema,dt.code AS type_code
    FROM processing_jobs j JOIN documents d ON d.id=j.document_id LEFT JOIN document_schema_versions sv ON sv.id=j.schema_version_id LEFT JOIN document_types dt ON dt.id=sv.type_id WHERE j.id=${jobId}`);
  if (!result.rows.length) throw new AppError(404, "NOT_FOUND", "Processing job not found.");
  const row = result.rows[0] as Record<string, unknown>;
  if (!row.schema_version || !row.json_schema)
    throw new AppError(409, "SCHEMA_REQUIRED", "A document schema is required before processing.");
  const request = modelRequestSchema.parse({
    contract_version: "1.0",
    request_id: String(row.request_id),
    document_id: String(row.document_id),
    document_revision: Number(row.document_revision),
    input: {
      download_url: inputUrl(String(row.document_id), Number(row.document_revision), String(row.input_sha256)),
      sha256: String(row.input_sha256),
      mime_type: String(row.mime_type),
    },
    tasks: Array.isArray(row.tasks) ? row.tasks : ["ocr"],
    language_hints: Array.isArray(row.language_hints) ? row.language_hints : [],
    schema: {
      id: String(row.type_code ?? "document"),
      version: Number(row.schema_version),
      json_schema: row.json_schema as Record<string, unknown>,
    },
    requested_model_version: row.requested_model_version ? String(row.requested_model_version) : null,
  });
  return { job: row, request, document: row };
}

export async function submitProcessing(
  token: string | undefined,
  documentId: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "processing.submit");
  z.uuid().parse(documentId);
  z.uuid().parse(requestId);
  const options = processOptionsSchema.parse(input ?? {});
  const db = getDb();
  return db.transaction(async (tx) => {
    await lockActor(tx, token, actor, "processing.submit");
    const found = await tx.execute(sql`SELECT d.id,d.revision,d.sha256,d.status,d.schema_version_id,d.department_id,di.jurisdiction_id FROM documents d JOIN villages v ON v.id=d.village_id JOIN tehsils t ON t.id=v.tehsil_id JOIN districts di ON di.id=t.district_id WHERE d.id=${documentId} AND ${visible(actor)} FOR UPDATE OF d`);
    if (!found.rows.length) throw new AppError(404, "NOT_FOUND", "Document not found.");
    const doc = found.rows[0] as Record<string, unknown>;
    if (!doc.schema_version_id)
      throw new AppError(409, "SCHEMA_REQUIRED", "Assign a document type before processing.");
    const existing = await tx.execute(sql`SELECT ${jobColumns} FROM processing_jobs j WHERE j.document_id=${documentId} AND j.document_revision=${Number(doc.revision)} LIMIT 1`);
    if (existing.rows.length) return { job: asSummary(existing.rows[0]), reused: true };
    if (!["UPLOADED", "PROCESSING_FAILED"].includes(String(doc.status)))
      throw new AppError(409, "PROCESSING_IN_PROGRESS", "This document already has a processing run.");
    const schema = await tx.execute(sql`SELECT sv.version,sv.json_schema,dt.code FROM document_schema_versions sv JOIN document_types dt ON dt.id=sv.type_id WHERE sv.id=${doc.schema_version_id} AND sv.department_id=${actor.departmentId}`);
    if (!schema.rows.length) throw new AppError(409, "SCHEMA_REQUIRED", "The pinned document schema is unavailable.");
    const schemaRow = schema.rows[0] as Record<string, unknown>;
    const jobRequestId = randomUUID();
    const payloadHash = createHash("sha256").update(JSON.stringify({
      documentId,
      revision: Number(doc.revision),
      sha256: String(doc.sha256),
      tasks: options.tasks,
      languageHints: options.languageHints,
      requestedModelVersion: options.requestedModelVersion,
      schemaId: String(schemaRow.code),
      schemaVersion: Number(schemaRow.version),
    })).digest("hex");
    const inserted = await tx.execute(sql`INSERT INTO processing_jobs(document_id,department_id,document_revision,input_sha256,schema_version_id,status,stage,request_id,payload_hash,tasks,language_hints,requested_model_version,next_attempt_at,created_by) VALUES(${documentId},${actor.departmentId},${Number(doc.revision)},${String(doc.sha256)},${String(doc.schema_version_id)},'QUEUED','QUEUED',${jobRequestId},${payloadHash},${JSON.stringify(options.tasks)}::jsonb,${JSON.stringify(options.languageHints)}::jsonb,${options.requestedModelVersion},now(),${actor.id}) RETURNING id`);
    const jobId = String(inserted.rows[0].id);
    await tx.execute(sql`INSERT INTO processing_outbox(job_id,event_type) VALUES(${jobId},'PROCESSING_SUBMIT')`);
    await tx.execute(sql`INSERT INTO processing_job_history(job_id,to_status,stage,reason) VALUES(${jobId},'QUEUED','QUEUED','Processing requested')`);
    await tx.execute(sql`INSERT INTO document_status_history(document_id,from_status,to_status,actor_id,reason) VALUES(${documentId},${String(doc.status)},'QUEUED',${actor.id},'Processing job queued')`);
    await tx.execute(sql`UPDATE documents SET status='QUEUED' WHERE id=${documentId}`);
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "processing.submitted",
      entityId: documentId,
      requestId,
      details: { jobId, revision: Number(doc.revision), tasks: options.tasks },
    });
    const job = await tx.execute(sql`SELECT ${jobColumns} FROM processing_jobs j WHERE j.id=${jobId}`);
    return { job: asSummary(job.rows[0]), reused: false };
  });
}

export async function getProcessingJob(token: string | undefined, documentId: string) {
  const actor = await requireActor(token);
  requirePermission(actor, "processing.read");
  z.uuid().parse(documentId);
  const result = await getDb().execute(sql`SELECT ${jobColumns} FROM processing_jobs j JOIN documents d ON d.id=j.document_id JOIN villages v ON v.id=d.village_id JOIN tehsils t ON t.id=v.tehsil_id JOIN districts di ON di.id=t.district_id WHERE j.document_id=${documentId} AND ${visible(actor)} ORDER BY j.created_at DESC LIMIT 1`);
  if (!result.rows.length) return null;
  const job = asSummary(result.rows[0]);
  const [attempts, artifacts, history] = await Promise.all([
    getDb().execute(sql`SELECT operation,attempt,status,remote_job_id AS "remoteJobId",error_code AS "errorCode",error_message AS "errorMessage",started_at AS "startedAt",completed_at AS "completedAt" FROM processing_attempts WHERE job_id=${job.id} ORDER BY started_at, id`),
    getDb().execute(sql`SELECT kind,accepted,rejection_code AS "rejectionCode",sha256,created_at AS "createdAt" FROM processing_artifacts WHERE job_id=${job.id} ORDER BY created_at,id`),
    getDb().execute(sql`SELECT from_status AS "fromStatus",to_status AS "toStatus",stage,reason,created_at AS "createdAt" FROM processing_job_history WHERE job_id=${job.id} ORDER BY created_at,id`),
  ]);
  return { job, attempts: attempts.rows, artifacts: artifacts.rows, history: history.rows };
}

export async function listProcessingJobs(token: string | undefined, page = 1) {
  const actor = await requireActor(token);
  requirePermission(actor, "processing.read");
  const p = z.coerce.number().int().min(1).max(10000).parse(page);
  const result = await getDb().execute(sql`SELECT ${jobColumns} FROM processing_jobs j JOIN documents d ON d.id=j.document_id JOIN villages v ON v.id=d.village_id JOIN tehsils t ON t.id=v.tehsil_id JOIN districts di ON di.id=t.district_id WHERE ${visible(actor)} ORDER BY j.created_at DESC,j.id LIMIT 25 OFFSET ${(p - 1) * 25}`);
  const count = await getDb().execute(sql`SELECT count(*)::int AS total FROM processing_jobs j JOIN documents d ON d.id=j.document_id JOIN villages v ON v.id=d.village_id JOIN tehsils t ON t.id=v.tehsil_id JOIN districts di ON di.id=t.district_id WHERE ${visible(actor)}`);
  return { items: result.rows.map(asSummary), page: p, page_size: 25, total: Number(count.rows[0].total) };
}

export async function ingestModelResult(jobId: string, raw: unknown) {
  z.uuid().parse(jobId);
  const parsed = modelResultSchema.safeParse(raw);
  const payload = raw && typeof raw === "object" ? raw : { value: raw };
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return getDb().transaction(async (tx) => {
    const result = await tx.execute(sql`SELECT j.*,d.revision AS current_revision,d.sha256 AS current_sha256,d.page_count,sv.version AS current_schema_version,dt.code AS current_schema_id,sv.json_schema FROM processing_jobs j JOIN documents d ON d.id=j.document_id LEFT JOIN document_schema_versions sv ON sv.id=j.schema_version_id LEFT JOIN document_types dt ON dt.id=sv.type_id WHERE j.id=${jobId} FOR UPDATE OF j`);
    if (!result.rows.length) throw new AppError(404, "NOT_FOUND", "Processing job not found.");
    const job = result.rows[0] as Record<string, unknown>;
    const reject = async (code: string, message: string) => {
      await tx.execute(sql`INSERT INTO processing_artifacts(job_id,kind,accepted,rejection_code,payload,sha256) VALUES(${jobId},'model_result',false,${code},${JSON.stringify(payload)}::jsonb,${payloadHash})`);
      await tx.execute(sql`UPDATE processing_jobs SET status='RESULT_REJECTED',stage='FAILED',error_code=${code},error_message=${message},retryable=false,updated_at=now(),completed_at=now() WHERE id=${jobId}`);
      await tx.execute(sql`INSERT INTO processing_job_history(job_id,from_status,to_status,stage,reason) VALUES(${jobId},${String(job.status)},'RESULT_REJECTED','FAILED',${message})`);
      return { accepted: false as const, code, message };
    };
    if (!parsed.success) return reject("MODEL_INVALID_RESPONSE", "The model result failed contract validation.");
    const value: ModelResult = parsed.data;
    if (value.request_id !== String(job.request_id) || value.job_id !== job.remote_job_id)
      return reject("MODEL_IDENTITY_MISMATCH", "The model result does not match this processing job.");
    if (value.document_id !== String(job.document_id) || value.document_revision !== Number(job.document_revision) || value.input_sha256 !== String(job.input_sha256))
      return reject("MODEL_INPUT_MISMATCH", "The model result is for a different document revision or input hash.");
    if (Number(job.current_revision) !== Number(job.document_revision) || String(job.current_sha256) !== String(job.input_sha256))
      return reject("STALE_RESULT", "The document changed after this model job was submitted.");
    if (value.schema_version !== Number(job.current_schema_version) || value.schema_id !== String(job.current_schema_id))
      return reject("MODEL_SCHEMA_MISMATCH", "The model result uses a different schema version.");
    const properties = (job.json_schema as { properties?: Record<string, unknown> } | null)?.properties ?? {};
    const unknown = Object.keys(value.fields).find((key) => !Object.prototype.hasOwnProperty.call(properties, key));
    if (unknown) return reject("MODEL_FIELD_NOT_ALLOWED", `The model returned an unknown field: ${unknown}.`);
    if (value.pages.some((page) => page.page > Number(job.page_count)))
      return reject("MODEL_PAGE_OUT_OF_RANGE", "The model returned evidence for a page that does not exist.");
    await tx.execute(sql`INSERT INTO processing_artifacts(job_id,kind,accepted,payload,sha256) VALUES(${jobId},'model_result',true,${JSON.stringify(value)}::jsonb,${payloadHash})`);
    await tx.execute(sql`UPDATE processing_jobs SET status='SUCCEEDED',stage='COMPLETED',provider=${value.model.provider},model_name=${value.model.name},model_version=${value.model.version},prompt_version=${value.model.prompt_version},updated_at=now(),completed_at=now(),error_code=NULL,error_message=NULL,retryable=NULL WHERE id=${jobId}`);
    await tx.execute(sql`INSERT INTO processing_job_history(job_id,from_status,to_status,stage,reason) VALUES(${jobId},${String(job.status)},'SUCCEEDED','COMPLETED','Validated model result ingested')`);
    await tx.execute(sql`UPDATE documents SET status='MODEL_COMPLETED' WHERE id=${job.document_id}`);
    return { accepted: true as const, result: value };
  });
}

export async function processingJobForWorker(jobId: string) {
  return getDb().transaction((tx) => requestForJob(tx, jobId));
}

export async function recordModelError(jobId: string, error: unknown, retryable: boolean) {
  const appError = error instanceof AppError ? error : new AppError(503, "MODEL_UNAVAILABLE", "The model service is unavailable.");
  return getDb().transaction(async (tx) => {
    const result = await tx.execute(sql`SELECT status,attempt,max_attempts,document_id FROM processing_jobs WHERE id=${jobId} FOR UPDATE`);
    if (!result.rows.length) return;
    const row = result.rows[0] as Record<string, unknown>;
    const attempt = Number(row.attempt);
    const exhausted = !retryable || attempt >= Number(row.max_attempts);
    await tx.execute(sql`UPDATE processing_jobs SET status=${exhausted ? "FAILED" : "QUEUED"},stage=${exhausted ? "FAILED" : "QUEUED"},error_code=${appError.code},error_message=${appError.message},retryable=${retryable},updated_at=now(),completed_at=${exhausted ? sql`now()` : sql`NULL`} WHERE id=${jobId}`);
    await tx.execute(sql`INSERT INTO processing_job_history(job_id,from_status,to_status,stage,reason) VALUES(${jobId},${String(row.status)},${exhausted ? "FAILED" : "QUEUED"},${exhausted ? "FAILED" : "QUEUED"},${appError.message})`);
    if (exhausted) await tx.execute(sql`UPDATE documents SET status='PROCESSING_FAILED' WHERE id=${row.document_id}`);
    return { exhausted };
  });
}
