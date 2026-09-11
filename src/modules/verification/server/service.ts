import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Transaction } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  requireActor,
  requirePermission,
  lockActor,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import { scopedIds } from "@/modules/master-data/server/service";
import { materializeApprovedRecord } from "@/modules/land-records/server/service";
import type { Actor } from "@/modules/identity/contracts";
import {
  approvalSubmitSchema,
  correctionSubmitSchema,
  reviewSubmitSchema,
  type VerificationField,
  type VerificationTaskStatus,
  type VerificationTaskView,
} from "../contracts";

type FieldRow = {
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean";
  required: boolean;
  critical: boolean;
  sourceValue: unknown;
  normalizedValue: unknown;
  confidence: number | null;
  missingReason: string | null;
  evidence: Array<Record<string, unknown>>;
};

function visible(actor: Actor) {
  return sql`t.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}

function iso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function normalizeValue(type: FieldRow["fieldType"], value: unknown) {
  if (type === "text") {
    if (typeof value !== "string" || value.trim() === "")
      return { value: null, valid: false };
    return { value: value.trim().replace(/\s+/g, " "), valid: true };
  }
  if (type === "number") {
    if (typeof value === "number" && Number.isFinite(value) && value > 0)
      return { value, valid: true };
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace(/,/g, ""));
      if (Number.isFinite(parsed) && parsed > 0) return { value: parsed, valid: true };
    }
    return { value: null, valid: false };
  }
  if (type === "date") {
    if (typeof value !== "string") return { value: null, valid: false };
    const parsed = new Date(`${value}T00:00:00.000Z`);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime());
    return { value: valid ? value : null, valid };
  }
  return { value, valid: typeof value === "boolean" };
}

function assertUniqueFieldKeys(keys: string[], fields: Map<string, FieldRow>) {
  const seen = new Set<string>();
  for (const key of keys) {
    if (!fields.has(key))
      throw new AppError(422, "UNKNOWN_FIELD", `Unknown verification field: ${key}.`);
    if (seen.has(key))
      throw new AppError(422, "DUPLICATE_FIELD", `Field ${key} was submitted twice.`);
    seen.add(key);
  }
}

async function loadTaskRecord(
  tx: Transaction,
  actor: Actor,
  taskId: string,
  lock = false,
) {
  const result = await tx.execute(
    sql`SELECT t.id,t.run_id AS "runId",t.document_id AS "documentId",t.document_revision AS "documentRevision",
               t.status,t.returned_reason AS "returnedReason",t.created_at AS "createdAt",t.updated_at AS "updatedAt",
               t.department_id,t.schema_version_id AS "schemaVersionId",
               d.display_id AS "displayId",d.title,d.mime_type AS "mimeType",d.sha256,d.revision AS "currentRevision",
               s.name AS state,di.name AS district,te.name AS tehsil,v.name AS village,
               dt.name AS "typeName",sv.version AS "schemaVersion",
               r.status AS "runStatus",r.blocker_count AS "blockerCount",r.duplicate_count AS "duplicateCount",
               pa.sha256 AS "artifactSha256"
        FROM verification_tasks t
        JOIN extraction_runs r ON r.id=t.run_id
        LEFT JOIN processing_artifacts pa ON pa.id=r.artifact_id
        JOIN documents d ON d.id=t.document_id
        JOIN villages v ON v.id=d.village_id
        JOIN tehsils te ON te.id=v.tehsil_id
        JOIN districts di ON di.id=te.district_id
        JOIN states s ON s.id=di.state_id
        LEFT JOIN document_schema_versions sv ON sv.id=t.schema_version_id
        LEFT JOIN document_types dt ON dt.id=sv.type_id
        WHERE t.id=${taskId} AND ${visible(actor)}
        ${lock ? sql`FOR UPDATE OF t` : sql``}`,
  );
  if (!result.rows.length)
    throw new AppError(404, "NOT_FOUND", "Verification task not found.");
  return result.rows[0] as Record<string, unknown>;
}

async function taskFields(tx: Transaction, runId: string) {
  const result = await tx.execute(
    sql`SELECT field_key AS "fieldKey",label,field_type AS "fieldType",required,critical,
               source_value AS "sourceValue",normalized_value AS "normalizedValue",confidence,
               missing_reason AS "missingReason",evidence
        FROM extraction_fields WHERE run_id=${runId} ORDER BY field_key`,
  );
  return result.rows.map((row) => {
    const field = row as Record<string, unknown> & { evidence?: Array<Record<string, unknown>> };
    return {
      ...field,
      confidence: field.confidence === null ? null : Number(field.confidence),
      evidence: (field.evidence ?? []).map((item) => ({
        page: Number(item.page),
        blockIds: (item.block_ids ?? []) as string[],
        bbox: (item.bbox ?? []) as number[],
        sourceText: String(item.source_text ?? ""),
      })),
    } as unknown as FieldRow;
  });
}

async function taskCollections(tx: Transaction, task: Record<string, unknown>, latest: boolean) {
  const taskId = String(task.id);
  const findings = await tx.execute(
    sql`SELECT field_key AS "fieldKey",code,status,severity,message,details,source
        FROM validation_findings WHERE run_id=${String(task.runId)}
        ORDER BY severity DESC,code,field_key NULLS LAST`,
  );
  const duplicates = await tx.execute(
    sql`SELECT dc.id,dc.candidate_document_id AS "candidateDocumentId",d.display_id AS "candidateDisplayId",
               d.title AS "candidateTitle",dc.score,dc.status,dc.resolution_reason AS "resolutionReason"
        FROM duplicate_candidates dc
        JOIN documents d ON d.id=dc.candidate_document_id
        WHERE dc.document_id=${String(task.documentId)}
        ORDER BY dc.score DESC,dc.created_at DESC`,
  );
  const decisions = await (latest
    ? tx.execute(
        sql`SELECT DISTINCT ON (field_key) field_key AS "fieldKey",decision,value,reason,decided_by AS "decidedBy",created_at AS "createdAt"
            FROM verification_field_decisions WHERE task_id=${taskId}
            ORDER BY field_key,created_at DESC,id DESC`,
      )
    : tx.execute(
        sql`SELECT field_key AS "fieldKey",decision,value,reason,decided_by AS "decidedBy",created_at AS "createdAt"
            FROM verification_field_decisions WHERE task_id=${taskId}
            ORDER BY created_at,id`,
      ));
  const corrections = await (latest
    ? tx.execute(
        sql`SELECT DISTINCT ON (field_key) field_key AS "fieldKey",value,reason,corrected_by AS "correctedBy",created_at AS "createdAt"
            FROM verification_field_corrections WHERE task_id=${taskId}
            ORDER BY field_key,created_at DESC,id DESC`,
      )
    : tx.execute(
        sql`SELECT field_key AS "fieldKey",value,reason,corrected_by AS "correctedBy",created_at AS "createdAt"
            FROM verification_field_corrections WHERE task_id=${taskId}
            ORDER BY created_at,id`,
      ));
  const history = await tx.execute(
    sql`SELECT from_status AS "fromStatus",to_status AS "toStatus",action,reason,actor_id AS "actorId",created_at AS "createdAt"
        FROM verification_history WHERE task_id=${taskId} ORDER BY created_at,id`,
  );
  const approval = await tx.execute(
    sql`SELECT reason,approved_by AS "approvedBy",created_at AS "createdAt",snapshot
        FROM verification_approvals WHERE task_id=${taskId}`,
  );
  return {
    findings: findings.rows as VerificationTaskView["findings"],
    duplicates: duplicates.rows.map((row) => ({
      ...(row as Record<string, unknown>),
      score: Number((row as { score: number }).score),
    })) as VerificationTaskView["duplicates"],
    decisions: decisions.rows.map((row) => ({
      ...(row as Record<string, unknown>),
      createdAt: iso((row as { createdAt: unknown }).createdAt),
    })) as VerificationTaskView["decisions"],
    corrections: corrections.rows.map((row) => ({
      ...(row as Record<string, unknown>),
      createdAt: iso((row as { createdAt: unknown }).createdAt),
    })) as VerificationTaskView["corrections"],
    history: history.rows.map((row) => ({
      ...(row as Record<string, unknown>),
      createdAt: iso((row as { createdAt: unknown }).createdAt),
    })) as VerificationTaskView["history"],
    approval: approval.rows.length
      ? {
          reason: String((approval.rows[0] as { reason: string }).reason),
          approvedBy: String((approval.rows[0] as { approvedBy: string }).approvedBy),
          createdAt: iso((approval.rows[0] as { createdAt: unknown }).createdAt),
          snapshot: ((approval.rows[0] as { snapshot: Record<string, unknown> }).snapshot ?? {}),
        }
      : null,
  };
}

async function buildTaskView(tx: Transaction, task: Record<string, unknown>) {
  const fields = await taskFields(tx, String(task.runId));
  const collections = await taskCollections(tx, task, true);
  return {
    task: {
      id: String(task.id),
      runId: String(task.runId),
      documentId: String(task.documentId),
      documentRevision: Number(task.documentRevision),
      status: String(task.status) as VerificationTaskStatus,
      returnedReason: task.returnedReason === null ? null : String(task.returnedReason),
      createdAt: iso(task.createdAt),
      updatedAt: iso(task.updatedAt),
    },
    document: {
      displayId: String(task.displayId),
      title: String(task.title),
      mimeType: String(task.mimeType),
      sha256: String(task.sha256),
      state: String(task.state),
      district: String(task.district),
      tehsil: String(task.tehsil),
      village: String(task.village),
      typeName: task.typeName === null ? null : String(task.typeName),
      schemaVersion: task.schemaVersion === null ? null : Number(task.schemaVersion),
    },
    run: {
      status: String(task.runStatus) as "VALIDATED" | "BLOCKED",
      blockerCount: Number(task.blockerCount),
      duplicateCount: Number(task.duplicateCount),
      artifactSha256: String(task.artifactSha256 ?? ""),
    },
    fields: fields as VerificationField[],
    ...collections,
  } satisfies VerificationTaskView;
}

export async function createVerificationTask(
  tx: Transaction,
  input: {
    runId: string;
    documentId: string;
    departmentId: string;
    schemaVersionId: string;
    documentRevision: number;
    actorId: string | null;
    requestId: string;
  },
) {
  const inserted = await tx.execute(
    sql`INSERT INTO verification_tasks(run_id,document_id,department_id,schema_version_id,document_revision)
        VALUES(${input.runId},${input.documentId},${input.departmentId},${input.schemaVersionId},${input.documentRevision})
        ON CONFLICT(run_id) DO NOTHING RETURNING id`,
  );
  if (!inserted.rows.length) return { created: false as const, id: null };
  const taskId = String(inserted.rows[0].id);
  await tx.execute(
    sql`INSERT INTO verification_history(task_id,from_status,to_status,action,reason,actor_id)
        SELECT ${taskId},NULL,'PENDING_REVIEW','TASK_CREATED','Accepted model result ready for human review',${input.actorId}
        WHERE NOT EXISTS(SELECT 1 FROM verification_history WHERE task_id=${taskId})`,
  );
  await tx.execute(
    sql`INSERT INTO document_status_history(document_id,from_status,to_status,actor_id,reason)
        SELECT id,status,'VERIFICATION_PENDING',${input.actorId},'Verification task created'
        FROM documents WHERE id=${input.documentId}`,
  );
  await tx.execute(
    sql`UPDATE documents SET status='VERIFICATION_PENDING' WHERE id=${input.documentId}`,
  );
  await appendAudit(tx, {
    actorId: input.actorId ?? undefined,
    departmentId: input.departmentId,
    action: "verification.task_created",
    entityId: input.documentId,
    requestId: input.requestId,
    details: { taskId, runId: input.runId, documentRevision: input.documentRevision },
  });
  return { created: true as const, id: taskId };
}

async function transitionTask(
  tx: Transaction,
  task: Record<string, unknown>,
  actor: Actor,
  input: {
    status: VerificationTaskStatus;
    action: string;
    reason: string;
    requestId: string;
    documentStatus: string;
    auditDetails: Record<string, unknown>;
    returnedReason?: string | null;
  },
) {
  const fromStatus = String(task.status);
  await tx.execute(
    sql`UPDATE verification_tasks
        SET status=${input.status},returned_reason=${input.returnedReason ?? null},updated_at=now()
        WHERE id=${String(task.id)}`,
  );
  await tx.execute(
    sql`INSERT INTO verification_history(task_id,from_status,to_status,action,reason,actor_id)
        VALUES(${String(task.id)},${fromStatus},${input.status},${input.action},${input.reason},${actor.id})`,
  );
  await tx.execute(
    sql`INSERT INTO document_status_history(document_id,from_status,to_status,actor_id,reason)
        SELECT id,status,${input.documentStatus},${actor.id},${input.reason}
        FROM documents WHERE id=${String(task.documentId)}`,
  );
  await tx.execute(
    sql`UPDATE documents SET status=${input.documentStatus} WHERE id=${String(task.documentId)}`,
  );
  await appendAudit(tx, {
    actorId: actor.id,
    departmentId: actor.departmentId,
    action: `verification.${input.action.toLowerCase()}`,
    entityId: String(task.id),
    requestId: input.requestId,
    details: { ...input.auditDetails, fromStatus, toStatus: input.status, documentId: String(task.documentId) },
  });
  task.status = input.status;
  task.updatedAt = new Date();
  if (input.returnedReason !== undefined) task.returnedReason = input.returnedReason;
}

function assertExpectedStatus(task: Record<string, unknown>, expected: string) {
  if (String(task.status) !== expected)
    throw new AppError(
      409,
      "VERIFICATION_STATUS_CONFLICT",
      "This verification task changed. Refresh and try again.",
    );
}

export async function getVerificationTask(token: string | undefined, taskId: string) {
  const actor = await requireActor(token);
  requirePermission(actor, "verification.read");
  z.uuid().parse(taskId);
  return getDb().transaction(async (tx) => {
    const task = await loadTaskRecord(tx, actor, taskId);
    return buildTaskView(tx, task);
  });
}

export async function getVerificationTaskForDocument(
  token: string | undefined,
  documentId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "verification.read");
  z.uuid().parse(documentId);
  return getDb().transaction(async (tx) => {
    const found = await tx.execute(
      sql`SELECT t.id FROM verification_tasks t
          JOIN documents d ON d.id=t.document_id
          JOIN villages v ON v.id=d.village_id
          JOIN tehsils te ON te.id=v.tehsil_id
          JOIN districts di ON di.id=te.district_id
          WHERE t.document_id=${documentId} AND ${visible(actor)}
          ORDER BY t.created_at DESC,t.id DESC LIMIT 1`,
    );
    if (!found.rows.length) return null;
    const task = await loadTaskRecord(tx, actor, String(found.rows[0].id));
    return buildTaskView(tx, task);
  });
}

export async function submitReview(
  token: string | undefined,
  taskId: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "verification.review");
  z.uuid().parse(taskId);
  const data = reviewSubmitSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "verification.review");
    const task = await loadTaskRecord(tx, actor, taskId, true);
    assertExpectedStatus(task, data.expectedStatus);
    const fields = await taskFields(tx, String(task.runId));
    const fieldMap = new Map(fields.map((field) => [field.fieldKey, field]));
    assertUniqueFieldKeys(data.decisions.map((decision) => decision.fieldKey), fieldMap);

    if (data.action === "SUBMIT") {
      if (data.decisions.length !== fields.length)
        throw new AppError(422, "DECISIONS_INCOMPLETE", "Every extracted field requires a human decision.");
      for (const decision of data.decisions) {
        const field = fieldMap.get(decision.fieldKey)!;
        let value: unknown;
        if (decision.decision === "ACCEPT_MODEL") {
          value = field.normalizedValue;
          if ((field.required || field.critical) && value === null)
            throw new AppError(
              409,
              "MODEL_VALUE_UNUSABLE",
              `Field ${field.fieldKey} requires a correction before approval.`,
            );
        } else {
          const normalized = normalizeValue(field.fieldType, decision.correctedValue);
          if (!normalized.valid)
            throw new AppError(
              422,
              "CORRECTION_INVALID",
              `Field ${field.fieldKey} has an invalid corrected value.`,
            );
          value = normalized.value;
        }
        await tx.execute(
          sql`INSERT INTO verification_field_decisions(task_id,field_key,decision,value,reason,decided_by)
              VALUES(${taskId},${decision.fieldKey},${decision.decision},${JSON.stringify(value)}::jsonb,${decision.reason},${actor.id})`,
        );
      }
    }

    const status =
      data.action === "RETURN"
        ? "RETURNED_FOR_EDIT"
        : data.action === "REJECT"
          ? "REJECTED"
          : "PENDING_APPROVAL";
    const documentStatus =
      data.action === "RETURN"
        ? "RETURNED_FOR_EDIT"
        : data.action === "REJECT"
          ? "VERIFICATION_REJECTED"
          : "VERIFICATION_PENDING";
    await transitionTask(tx, task, actor, {
      status,
      action: data.action,
      reason: data.reason,
      requestId,
      documentStatus,
      returnedReason: data.action === "RETURN" ? data.reason : null,
      auditDetails: { decisionCount: data.decisions.length },
    });
    return buildTaskView(tx, task);
  });
}

export async function submitCorrections(
  token: string | undefined,
  taskId: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "verification.correct");
  z.uuid().parse(taskId);
  const data = correctionSubmitSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "verification.correct");
    const task = await loadTaskRecord(tx, actor, taskId, true);
    assertExpectedStatus(task, data.expectedStatus);
    const fields = await taskFields(tx, String(task.runId));
    const fieldMap = new Map(fields.map((field) => [field.fieldKey, field]));
    assertUniqueFieldKeys(data.corrections.map((correction) => correction.fieldKey), fieldMap);
    for (const correction of data.corrections) {
      const field = fieldMap.get(correction.fieldKey)!;
      const normalized = normalizeValue(field.fieldType, correction.value);
      if (!normalized.valid)
        throw new AppError(
          422,
          "CORRECTION_INVALID",
          `Field ${field.fieldKey} has an invalid corrected value.`,
        );
      await tx.execute(
        sql`INSERT INTO verification_field_corrections(task_id,field_key,value,reason,corrected_by)
            VALUES(${taskId},${correction.fieldKey},${JSON.stringify(normalized.value)}::jsonb,${correction.reason},${actor.id})`,
      );
    }
    await transitionTask(tx, task, actor, {
      status: "CORRECTED",
      action: "CORRECTED",
      reason: `Operator submitted ${data.corrections.length} field correction(s).`,
      requestId,
      documentStatus: "VERIFICATION_PENDING",
      returnedReason: null,
      auditDetails: { correctionCount: data.corrections.length },
    });
    return buildTaskView(tx, task);
  });
}

export async function approveVerification(
  token: string | undefined,
  taskId: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "verification.review");
  z.uuid().parse(taskId);
  const data = approvalSubmitSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "verification.review");
    const task = await loadTaskRecord(tx, actor, taskId, true);
    assertExpectedStatus(task, data.expectedStatus);
    const fields = await taskFields(tx, String(task.runId));
    const collections = await taskCollections(tx, task, true);
    const decisions = new Map(collections.decisions.map((decision) => [decision.fieldKey, decision]));
    for (const field of fields) {
      const decision = decisions.get(field.fieldKey);
      if (!decision)
        throw new AppError(409, "APPROVAL_BLOCKED", `Field ${field.fieldKey} has no review decision.`);
      if ((field.required || field.critical) && decision.value === null)
        throw new AppError(409, "APPROVAL_BLOCKED", `Field ${field.fieldKey} has no approved value.`);
    }
    const pendingOrConfirmedDuplicates = collections.duplicates.filter(
      (duplicate) => duplicate.status !== "RESOLVED_NOT_DUPLICATE",
    );
    if (pendingOrConfirmedDuplicates.length)
      throw new AppError(
        409,
        "APPROVAL_BLOCKED",
        "Resolve every duplicate as not a duplicate before approval.",
      );
    const unresolvedGlobalBlockers = collections.findings.filter(
      (finding) =>
        finding.severity === "BLOCKING" &&
        finding.fieldKey === null &&
        finding.code !== "DUPLICATE_CANDIDATES_FOUND",
    );
    if (unresolvedGlobalBlockers.length)
      throw new AppError(409, "APPROVAL_BLOCKED", "Unresolved record-level blockers remain.");

    const allFields = await taskFields(tx, String(task.runId));
    const allCollections = await taskCollections(tx, task, false);
    const snapshot = {
      task: {
        id: String(task.id),
        runId: String(task.runId),
        documentId: String(task.documentId),
        documentRevision: Number(task.documentRevision),
      },
      document: {
        displayId: String(task.displayId),
        title: String(task.title),
        sha256: String(task.sha256),
        village: String(task.village),
        tehsil: String(task.tehsil),
        district: String(task.district),
        state: String(task.state),
        typeName: task.typeName === null ? null : String(task.typeName),
        schemaVersion: task.schemaVersion === null ? null : Number(task.schemaVersion),
      },
      run: {
        status: String(task.runStatus),
        blockerCount: Number(task.blockerCount),
        duplicateCount: Number(task.duplicateCount),
        artifactSha256: String(task.artifactSha256 ?? ""),
      },
      fields: allFields,
      findings: allCollections.findings,
      duplicates: allCollections.duplicates,
      decisions: allCollections.decisions,
      corrections: allCollections.corrections,
      approvalReason: data.reason,
    };
    await tx.execute(
      sql`INSERT INTO verification_approvals(task_id,snapshot,reason,approved_by)
          VALUES(${taskId},${JSON.stringify(snapshot)}::jsonb,${data.reason},${actor.id})`,
    );
    await materializeApprovedRecord(tx, {
      taskId,
      actor,
      requestId,
      snapshot,
    });
    await transitionTask(tx, task, actor, {
      status: "APPROVED",
      action: "APPROVED",
      reason: data.reason,
      requestId,
      documentStatus: "VERIFICATION_APPROVED",
      auditDetails: { fieldCount: fields.length },
    });
    return buildTaskView(tx, task);
  });
}
