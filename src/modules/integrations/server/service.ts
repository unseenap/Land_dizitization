import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Transaction } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  lockActor,
  requireActor,
  requirePermission,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import { scopedIds } from "@/modules/master-data/server/service";
import type { Actor } from "@/modules/identity/contracts";
import {
  createIntegrationExportSchema,
  createIntegrationSchema,
  integrationMappingSchema,
  integrationRunFiltersSchema,
  retryIntegrationExportSchema,
  type IntegrationExportRun,
  type IntegrationMutationResult,
  type IntegrationRunsResult,
  type IntegrationSummary,
  type IntegrationsResult,
} from "../contracts";

export type IntegrationExportContext = {
  run: {
    id: string;
    departmentId?: string;
    recordId: string;
    recordVersionId: string;
    idempotencyKey: string;
    attempt: number;
    maxAttempts: number;
  };
  integration: {
    id: string;
    adapter: IntegrationSummary["adapter"];
    name: string;
    mode: IntegrationSummary["mode"];
    contractVersion: string;
    mappingVersion: number;
    mapping: IntegrationSummary["mapping"];
  };
  record: {
    displayId: string;
    version: number;
    documentId: string;
    documentType: string | null;
    village: string;
    tehsil: string;
    district: string;
    state: string;
    approvedAt: string;
    approvedBy: string | null;
    sourceSha256: string;
    artifactSha256: string;
    snapshot: Record<string, unknown>;
  };
  parcelLinks: Array<{
    parcelId: string;
    parcelNumber: string;
    sourceCrs: string;
    targetCrs: string;
  }>;
};

type QueryExecutor = Pick<Transaction, "execute">;

function iso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function integrationSummary(row: Record<string, unknown>): IntegrationSummary {
  return {
    id: String(row.id),
    adapter: String(row.adapter) as IntegrationSummary["adapter"],
    name: String(row.name),
    mode: String(row.mode) as IntegrationSummary["mode"],
    contractVersion: String(row.contractVersion),
    mappingVersion: Number(row.mappingVersion),
    mapping: integrationMappingSchema.parse(row.mapping),
    active: Boolean(row.active),
    notes:
      row.notes === null || row.notes === undefined ? null : String(row.notes),
    createdAt: iso(row.createdAt),
  };
}

function runSummary(row: Record<string, unknown>): IntegrationExportRun {
  return {
    id: String(row.id),
    integrationId: String(row.integrationId),
    integrationName: String(row.integrationName),
    adapter: String(row.adapter) as IntegrationExportRun["adapter"],
    mode: String(row.mode) as IntegrationExportRun["mode"],
    recordId: String(row.recordId),
    recordDisplayId: String(row.recordDisplayId),
    recordVersionId: String(row.recordVersionId),
    recordVersion: Number(row.recordVersion),
    status: String(row.status) as IntegrationExportRun["status"],
    payloadSha256:
      row.payloadSha256 === null || row.payloadSha256 === undefined
        ? null
        : String(row.payloadSha256),
    acknowledgement:
      row.acknowledgement === null || row.acknowledgement === undefined
        ? null
        : (row.acknowledgement as IntegrationExportRun["acknowledgement"]),
    attempt: Number(row.attempt),
    maxAttempts: Number(row.maxAttempts),
    nextAttemptAt:
      row.nextAttemptAt === null || row.nextAttemptAt === undefined
        ? null
        : iso(row.nextAttemptAt),
    errorCode:
      row.errorCode === null || row.errorCode === undefined
        ? null
        : String(row.errorCode),
    errorMessage:
      row.errorMessage === null || row.errorMessage === undefined
        ? null
        : String(row.errorMessage),
    retryable:
      row.retryable === null || row.retryable === undefined
        ? null
        : Boolean(row.retryable),
    createdAt: iso(row.createdAt),
    acknowledgedAt:
      row.acknowledgedAt === null || row.acknowledgedAt === undefined
        ? null
        : iso(row.acknowledgedAt),
  };
}

const runColumns = sql`r.id,r.integration_id AS "integrationId",r.record_id AS "recordId",lr.display_id AS "recordDisplayId",
  r.record_version_id AS "recordVersionId",v.version AS "recordVersion",r.status,r.payload_sha256 AS "payloadSha256",
  r.acknowledgement,r.attempt,r.max_attempts AS "maxAttempts",r.next_attempt_at AS "nextAttemptAt",
  r.error_code AS "errorCode",r.error_message AS "errorMessage",r.retryable,r.created_at AS "createdAt",
  r.acknowledged_at AS "acknowledgedAt",i.name AS "integrationName",i.adapter,i.mode`;

const runJoins = sql`FROM integration_export_runs r
  JOIN integrations i ON i.id=r.integration_id
  JOIN land_records lr ON lr.id=r.record_id
  JOIN land_record_versions v ON v.id=r.record_version_id`;

async function requireScopedIntegration(
  actor: Actor,
  integrationId: string,
  tx: QueryExecutor,
) {
  const rows = await tx.execute(
    sql`SELECT id,department_id,adapter,name,mode,contract_version,mapping_version AS "mappingVersion",mapping,active
        FROM integrations WHERE id=${integrationId} AND department_id=${actor.departmentId}`,
  );
  if (!rows.rows.length)
    throw new AppError(404, "NOT_FOUND", "Integration not found.");
  return rows.rows[0] as Record<string, unknown>;
}

export async function listIntegrations(
  token: string | undefined,
): Promise<IntegrationsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "integrations.read");
  const rows = await getDb().execute(
    sql`SELECT id,adapter,name,mode,contract_version AS "contractVersion",
        mapping_version AS "mappingVersion",mapping,active,notes,created_at AS "createdAt"
        FROM integrations WHERE department_id=${actor.departmentId} ORDER BY created_at DESC,id`,
  );
  return {
    items: rows.rows.map((row) => integrationSummary(row as Record<string, unknown>)),
  };
}

export async function createIntegration(
  token: string | undefined,
  input: unknown,
  requestId: string,
): Promise<IntegrationMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "integrations.manage");
  const data = createIntegrationSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "integrations.manage");
    const inserted = await tx.execute(
      sql`INSERT INTO integrations(department_id,adapter,name,mode,contract_version,mapping_version,mapping,active,notes,created_by)
          VALUES(${actor.departmentId},${data.adapter},${data.name},${data.mode},${data.contractVersion},
                 ${data.mappingVersion},${data.mapping},true,${data.notes ?? null},${actor.id})
          ON CONFLICT(department_id,adapter,name) DO NOTHING RETURNING id`,
    );
    let integrationId: string;
    if (inserted.rows.length) {
      integrationId = String(inserted.rows[0].id);
    } else {
      throw new AppError(
        409,
        "INTEGRATION_EXISTS",
        "An integration with this adapter and name already exists.",
      );
    }
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "integration.created",
      entityId: integrationId,
      requestId,
      details: {
        adapter: data.adapter,
        mode: data.mode,
        contractVersion: data.contractVersion,
        mappingVersion: data.mappingVersion,
        fieldKeys: data.mapping.fieldKeys,
        note: "Configuration is append-only; no credentials are stored.",
      },
    });
    return { id: integrationId, status: "QUEUED" };
  });
}

export async function createIntegrationExport(
  token: string | undefined,
  integrationId: string,
  input: unknown,
  requestId: string,
): Promise<IntegrationMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "integrations.export");
  z.uuid().parse(integrationId);
  const data = createIntegrationExportSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "integrations.export");
    const integration = await requireScopedIntegration(actor, integrationId, tx);
    if (!Boolean(integration.active))
      throw new AppError(
        409,
        "INTEGRATION_INACTIVE",
        "This integration is inactive.",
      );
    if (String(integration.mode) !== "MOCK")
      throw new AppError(
        422,
        "LIVE_INTEGRATION_UNSUPPORTED",
        "Live government integration is not configured in this phase.",
      );
    const record = await tx.execute(
      sql`SELECT lr.id AS "recordId",lr.display_id AS "recordDisplayId",v.id AS "recordVersionId",v.version,v.snapshot
          FROM land_records lr
          JOIN land_record_versions v ON v.id=lr.current_version_id AND v.record_id=lr.id
          JOIN villages vi ON vi.id=v.village_id
          JOIN tehsils t ON t.id=vi.tehsil_id
          JOIN districts di ON di.id=t.district_id
          WHERE lr.id=${data.recordId} AND v.id=${data.recordVersionId}
            AND lr.department_id=${actor.departmentId}
            AND di.jurisdiction_id IN (${scopedIds(actor)})
          FOR UPDATE OF lr`,
    );
    if (!record.rows.length)
      throw new AppError(
        404,
        "NOT_FOUND",
        "Approved record version not found in your scope.",
      );
    const mapping = integrationMappingSchema.parse(integration.mapping);
    const snapshot = (record.rows[0] as { snapshot: { fields?: Array<{ fieldKey: string }> } })
      .snapshot;
    const availableFields = new Set((snapshot.fields ?? []).map((field) => field.fieldKey));
    const missingFields = mapping.fieldKeys.filter((fieldKey) => !availableFields.has(fieldKey));
    if (missingFields.length)
      throw new AppError(
        422,
        "INTEGRATION_MAPPING_INVALID",
        `The approved version does not contain these mapped fields: ${missingFields.join(", ")}.`,
      );
    const inserted = await tx.execute(
      sql`INSERT INTO integration_export_runs(integration_id,department_id,record_id,record_version_id,idempotency_key,status,max_attempts,created_by)
          VALUES(${integrationId},${actor.departmentId},${data.recordId},${data.recordVersionId},${randomUUID()},'QUEUED',3,${actor.id})
          ON CONFLICT(integration_id,record_version_id) DO NOTHING RETURNING id,status`,
    );
    const run = inserted.rows.length
      ? (inserted.rows[0] as { id: string; status: IntegrationMutationResult["status"] })
      : ((
          await tx.execute(
            sql`SELECT id,status FROM integration_export_runs
                WHERE integration_id=${integrationId} AND record_version_id=${data.recordVersionId}`,
          )
        ).rows[0] as { id: string; status: IntegrationMutationResult["status"] });
    if (inserted.rows.length) {
      await tx.execute(
        sql`INSERT INTO integration_outbox(run_id,event_type) VALUES(${run.id},'INTEGRATION_DELIVER')`,
      );
      await tx.execute(
        sql`INSERT INTO integration_export_history(run_id,from_status,to_status,reason,actor_id)
            VALUES(${run.id},NULL,'QUEUED','Approved record version queued for export',${actor.id})`,
      );
      await appendAudit(tx, {
        actorId: actor.id,
        departmentId: actor.departmentId,
        action: "integration.export_queued",
        entityId: run.id,
        requestId,
        details: {
          integrationId,
          recordId: data.recordId,
          recordVersionId: data.recordVersionId,
          isMock: true,
        },
      });
    }
    return { id: run.id, status: run.status };
  });
}

export async function listIntegrationRuns(
  token: string | undefined,
  integrationId: string,
  input: unknown = {},
): Promise<IntegrationRunsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "integrations.read");
  z.uuid().parse(integrationId);
  const filters = integrationRunFiltersSchema.parse(input);
  const db = getDb();
  const integration = await requireScopedIntegration(actor, integrationId, db);
  const where = sql`r.integration_id=${String(integration.id)}`;
  const [rows, count] = await Promise.all([
    db.execute(
      sql`SELECT ${runColumns} ${runJoins} WHERE ${where}
          ORDER BY r.created_at DESC,r.id LIMIT 25 OFFSET ${(filters.page - 1) * 25}`,
    ),
    db.execute(sql`SELECT count(*)::int AS total ${runJoins} WHERE ${where}`),
  ]);
  return {
    items: rows.rows.map((row) => runSummary(row as Record<string, unknown>)),
    page: filters.page,
    page_size: 25,
    total: Number(count.rows[0].total),
  };
}

export async function retryIntegrationExport(
  token: string | undefined,
  integrationId: string,
  runId: string,
  input: unknown,
  requestId: string,
): Promise<IntegrationMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "integrations.export");
  z.uuid().parse(integrationId);
  z.uuid().parse(runId);
  const data = retryIntegrationExportSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "integrations.export");
    const integration = await requireScopedIntegration(actor, integrationId, tx);
    if (String(integration.mode) !== "MOCK")
      throw new AppError(
        422,
        "LIVE_INTEGRATION_UNSUPPORTED",
        "Live government integration is not configured in this phase.",
      );
    const rows = await tx.execute(
      sql`SELECT id,status,retryable FROM integration_export_runs
          WHERE id=${runId} AND integration_id=${integrationId}
            AND department_id=${actor.departmentId}
          FOR UPDATE`,
    );
    if (!rows.rows.length)
      throw new AppError(
        404,
        "NOT_FOUND",
        "Integration export run not found.",
      );
    const run = rows.rows[0] as {
      id: string;
      status: string;
      retryable: boolean | null;
    };
    if (run.status !== "FAILED" || run.retryable !== true)
      throw new AppError(
        409,
        "EXPORT_NOT_RETRYABLE",
        "Only failed retryable exports can be retried.",
      );
    await tx.execute(
      sql`UPDATE integration_export_runs SET status='QUEUED',error_code=NULL,error_message=NULL,
          retryable=NULL,next_attempt_at=NULL,updated_at=now() WHERE id=${runId}`,
    );
    await tx.execute(
      sql`INSERT INTO integration_export_history(run_id,from_status,to_status,reason,actor_id)
          VALUES(${runId},'FAILED','QUEUED',${data.reason},${actor.id})`,
    );
    await tx.execute(
      sql`INSERT INTO integration_outbox(run_id,event_type) VALUES(${runId},'INTEGRATION_DELIVER')
          ON CONFLICT(run_id,event_type) DO UPDATE SET published_at=NULL,available_at=now(),locked_at=NULL`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "integration.export_retried",
      entityId: runId,
      requestId,
      details: { integrationId, reason: data.reason },
    });
    return { id: runId, status: "QUEUED" };
  });
}
