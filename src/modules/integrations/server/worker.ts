import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { AppError } from "@/server/errors";
import { appendAudit } from "@/modules/audit/server/writer";
import {
  buildIntegrationEnvelope,
  deliverMockIntegration,
  mockAcknowledgementSchema,
} from "./mock-adapter";
import {
  integrationMappingSchema,
  type IntegrationExportAcknowledgement,
} from "../contracts";
import type { IntegrationExportContext } from "./service";

type OutboxEvent = {
  id: string;
  runId: string;
  eventType: "INTEGRATION_DELIVER";
};

async function claimNextEvent(): Promise<OutboxEvent | null> {
  return getDb().transaction(async (tx) => {
    const result = await tx.execute(sql`WITH candidate AS (
      SELECT id FROM integration_outbox
      WHERE published_at IS NULL
        AND available_at <= now()
        AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
      ORDER BY available_at,id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE integration_outbox o
    SET locked_at=now(),attempts=o.attempts+1
    FROM candidate
    WHERE o.id=candidate.id
    RETURNING o.id,o.run_id AS "runId",o.event_type AS "eventType"`);
    return result.rows.length
      ? (result.rows[0] as OutboxEvent)
      : null;
  });
}

async function completeEvent(event: OutboxEvent) {
  await getDb().execute(
    sql`UPDATE integration_outbox SET published_at=now(),locked_at=NULL,last_error=NULL WHERE id=${event.id}`,
  );
}

async function rescheduleEvent(
  event: OutboxEvent,
  delaySeconds: number,
  error: string,
) {
  await getDb().execute(
    sql`UPDATE integration_outbox SET locked_at=NULL,available_at=now()+(${delaySeconds} * interval '1 second'),last_error=${error} WHERE id=${event.id}`,
  );
}

async function loadContext(runId: string): Promise<IntegrationExportContext> {
  const db = getDb();
  const rows = await db.execute(
    sql`SELECT r.id,r.department_id AS "departmentId",r.record_id AS "recordId",r.record_version_id AS "recordVersionId",r.idempotency_key AS "idempotencyKey",
               r.attempt,r.max_attempts AS "maxAttempts",i.id AS "integrationId",i.adapter,i.name,i.mode,
               i.contract_version AS "contractVersion",i.mapping_version AS "mappingVersion",i.mapping,
               lr.display_id AS "displayId",v.version,v.document_id AS "documentId",dt.name AS "documentType",
               vi.name AS village,t.name AS tehsil,di.name AS district,s.name AS state,
               v.approved_at AS "approvedAt",v.approved_by AS "approvedBy",
               v.source_sha256 AS "sourceSha256",v.artifact_sha256 AS "artifactSha256",v.snapshot
        FROM integration_export_runs r
        JOIN integrations i ON i.id=r.integration_id
        JOIN land_records lr ON lr.id=r.record_id
        JOIN land_record_versions v ON v.id=r.record_version_id
        JOIN villages vi ON vi.id=v.village_id
        JOIN tehsils t ON t.id=vi.tehsil_id
        JOIN districts di ON di.id=t.district_id
        JOIN states s ON s.id=di.state_id
        LEFT JOIN document_schema_versions sv ON sv.id=v.schema_version_id
        LEFT JOIN document_types dt ON dt.id=sv.type_id
        WHERE r.id=${runId}`,
  );
  if (!rows.rows.length)
    throw new AppError(404, "EXPORT_RUN_NOT_FOUND", "Export run not found.");
  const row = rows.rows[0] as Record<string, unknown>;
  const mapping = integrationMappingSchema.parse(row.mapping);
  const parcelRows = mapping.includeParcelLinks
    ? await db.execute(
        sql`SELECT p.id AS "parcelId",p.parcel_number AS "parcelNumber",p.source_crs AS "sourceCrs",p.target_crs AS "targetCrs"
            FROM gis_record_links l
            JOIN gis_parcels p ON p.id=l.parcel_id
            WHERE l.record_version_id=${String(row.recordVersionId)} AND l.status='APPROVED'
            ORDER BY p.parcel_number,p.id`,
      )
    : { rows: [] as unknown[] };
  return {
    run: {
      id: String(row.id),
      departmentId: String(row.departmentId),
      recordId: String(row.recordId),
      recordVersionId: String(row.recordVersionId),
      idempotencyKey: String(row.idempotencyKey),
      attempt: Number(row.attempt),
      maxAttempts: Number(row.maxAttempts),
    },
    integration: {
      id: String(row.integrationId),
      adapter: String(row.adapter) as IntegrationExportContext["integration"]["adapter"],
      name: String(row.name),
      mode: String(row.mode) as IntegrationExportContext["integration"]["mode"],
      contractVersion: String(row.contractVersion),
      mappingVersion: Number(row.mappingVersion),
      mapping,
    },
    record: {
      displayId: String(row.displayId),
      version: Number(row.version),
      documentId: String(row.documentId),
      documentType:
        row.documentType === null || row.documentType === undefined
          ? null
          : String(row.documentType),
      village: String(row.village),
      tehsil: String(row.tehsil),
      district: String(row.district),
      state: String(row.state),
      approvedAt: new Date(String(row.approvedAt)).toISOString(),
      approvedBy:
        row.approvedBy === null || row.approvedBy === undefined
          ? null
          : String(row.approvedBy),
      sourceSha256: String(row.sourceSha256),
      artifactSha256: String(row.artifactSha256),
      snapshot: (row.snapshot ?? {}) as Record<string, unknown>,
    },
    parcelLinks: parcelRows.rows.map((link) => link as IntegrationExportContext["parcelLinks"][number]),
  };
}

function validateAcknowledgement(
  context: IntegrationExportContext,
  acknowledgement: unknown,
): IntegrationExportAcknowledgement {
  const parsed = mockAcknowledgementSchema.parse(acknowledgement);
  if (
    parsed.adapter !== context.integration.adapter ||
    parsed.contract_version !== context.integration.contractVersion ||
    parsed.mapping_version !== context.integration.mappingVersion ||
    parsed.idempotency_key !== context.run.idempotencyKey ||
    parsed.is_mock !== true
  )
    throw new AppError(
      502,
      "MOCK_ACKNOWLEDGEMENT_INVALID",
      "The mock acknowledgement identity did not match the export.",
    );
  return parsed;
}

async function processEvent(event: OutboxEvent) {
  const context = await loadContext(event.runId);
  if (context.integration.mode !== "MOCK")
    throw new AppError(
      422,
      "LIVE_INTEGRATION_UNSUPPORTED",
      "Live government integration is not configured in this phase.",
    );
  const envelope = buildIntegrationEnvelope(context);
  const payloadSha256 = createHash("sha256")
    .update(JSON.stringify(envelope))
    .digest("hex");
  const attemptRows = await getDb().transaction(async (tx) => {
    const current = await tx.execute(
      sql`SELECT status FROM integration_export_runs WHERE id=${event.runId} FOR UPDATE`,
    );
    if (!current.rows.length) return null;
    const fromStatus = String(current.rows[0].status);
    const updated = await tx.execute(
      sql`UPDATE integration_export_runs SET status='DELIVERING',attempt=attempt+1,payload_sha256=${payloadSha256},
          next_attempt_at=NULL,updated_at=now()
          WHERE id=${event.runId} AND status IN ('QUEUED','FAILED','DELIVERING') RETURNING attempt`,
    );
    if (!updated.rows.length) return null;
    const attempt = Number(updated.rows[0].attempt);
    await tx.execute(
      sql`INSERT INTO integration_export_history(run_id,from_status,to_status,reason,actor_id)
          VALUES(${event.runId},${fromStatus},'DELIVERING','Worker claimed the durable outbox event',NULL)`,
    );
    return attempt;
  });
  if (attemptRows === null) {
    await completeEvent(event);
    return;
  }
  try {
    const rawAcknowledgement = deliverMockIntegration(context, envelope);
    const acknowledgement = validateAcknowledgement(context, rawAcknowledgement);
    await getDb().transaction(async (tx) => {
      await tx.execute(
        sql`UPDATE integration_export_runs SET status='DELIVERED',destination_reference=${acknowledgement.destination_reference},
            acknowledgement=${acknowledgement},acknowledged_at=now(),error_code=NULL,error_message=NULL,
            retryable=NULL,updated_at=now() WHERE id=${event.runId} AND status='DELIVERING'`,
      );
      await tx.execute(
        sql`INSERT INTO integration_export_attempts(run_id,attempt,operation,status,request_sha256,response,completed_at)
            VALUES(${event.runId},${attemptRows},'deliver','SUCCEEDED',${payloadSha256},${acknowledgement},now())`,
      );
      await tx.execute(
        sql`INSERT INTO integration_export_history(run_id,from_status,to_status,reason,actor_id)
            VALUES(${event.runId},'DELIVERING','DELIVERED','Mock adapter acknowledged the exact approved version',NULL)`,
      );
      await appendAudit(tx, {
        departmentId: context.run.departmentId,
        action: "integration.export_delivered",
        entityId: event.runId,
        requestId: randomUUID(),
        details: {
          integrationId: context.integration.id,
          recordId: context.run.recordId,
          recordVersionId: context.run.recordVersionId,
          is_mock: true,
          acknowledgementId: acknowledgement.acknowledgementId,
        },
      });
    });
    await completeEvent(event);
  } catch (error) {
    await handleFailure(event, context, attemptRows, error);
  }
}

async function handleFailure(
  event: OutboxEvent,
  context: IntegrationExportContext,
  attempt: number,
  error: unknown,
) {
  const retryable = error instanceof AppError ? error.status >= 500 : true;
  const errorCode =
    error instanceof AppError
      ? error.code
      : "INTEGRATION_UNAVAILABLE";
  const errorMessage =
    error instanceof Error ? error.message : "Integration delivery failed.";
  const exhausted = attempt >= context.run.maxAttempts;
  await getDb().transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO integration_export_attempts(run_id,attempt,operation,status,request_sha256,response,error_code,error_message,completed_at)
          VALUES(${event.runId},${attempt},'deliver','FAILED',NULL,NULL,${errorCode},${errorMessage},now())`,
    );
    await tx.execute(
      sql`UPDATE integration_export_runs SET status='FAILED',error_code=${errorCode},error_message=${errorMessage},
          retryable=${retryable},next_attempt_at=${retryable && !exhausted ? sql`now() + interval '5 seconds'` : sql`NULL`},updated_at=now()
          WHERE id=${event.runId} AND status='DELIVERING'`,
    );
    await tx.execute(
      sql`INSERT INTO integration_export_history(run_id,from_status,to_status,reason,actor_id)
          VALUES(${event.runId},'DELIVERING','FAILED',${errorMessage},NULL)`,
    );
    await appendAudit(tx, {
      departmentId: context.run.departmentId,
      action: "integration.export_failed",
      entityId: event.runId,
      requestId: randomUUID(),
      details: {
        integrationId: context.integration.id,
        attempt,
        errorCode,
        retryable,
        is_mock: true,
      },
    });
  });
  if (retryable && !exhausted) {
    await rescheduleEvent(event, 5, errorMessage);
  } else {
    await completeEvent(event);
  }
}

async function failEventWithoutContext(event: OutboxEvent, error: unknown) {
  const errorCode =
    error instanceof AppError ? error.code : "INTEGRATION_UNAVAILABLE";
  const errorMessage =
    error instanceof Error ? error.message : "Integration delivery failed.";
  await getDb().transaction(async (tx) => {
    const run = await tx.execute(
      sql`SELECT department_id AS "departmentId" FROM integration_export_runs WHERE id=${event.runId}`,
    );
    const departmentId = run.rows.length
      ? String((run.rows[0] as Record<string, unknown>).departmentId)
      : undefined;
    await tx.execute(
      sql`UPDATE integration_export_runs SET status='FAILED',error_code=${errorCode},error_message=${errorMessage},
          retryable=true,next_attempt_at=NULL,updated_at=now()
          WHERE id=${event.runId} AND status IN ('QUEUED','DELIVERING')`,
    );
    await tx.execute(
      sql`INSERT INTO integration_export_history(run_id,from_status,to_status,reason,actor_id)
          VALUES(${event.runId},NULL,'FAILED',${errorMessage},NULL)`,
    );
    await appendAudit(tx, {
      departmentId,
      action: "integration.export_failed",
      entityId: event.runId,
      requestId: randomUUID(),
      details: {
        errorCode,
        errorMessage,
        is_mock: true,
        stage: "before-attempt",
      },
    });
  });
  await completeEvent(event);
}

export async function runIntegrationOnce(): Promise<boolean> {
  const event = await claimNextEvent();
  if (!event) return false;
  try {
    await processEvent(event);
  } catch (error) {
    await failEventWithoutContext(event, error);
  }
  return true;
}
