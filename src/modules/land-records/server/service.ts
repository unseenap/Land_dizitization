import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Transaction } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  requireActor,
  requirePermission,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import { scopedIds } from "@/modules/master-data/server/service";
import type { Actor } from "@/modules/identity/contracts";
import {
  recordFiltersSchema,
  type ApprovedLandRecordField,
  type LandRecordDetail,
  type LandRecordOwner,
  type LandRecordRegistration,
  type LandRecordSummary,
  type LandRecordMutation,
  type LandRecordVersionSummary,
  type LandRecordsResult,
  type MaterializedRecord,
} from "../contracts";

type SnapshotField = {
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean";
  normalizedValue: unknown;
  confidence: number | null;
};

type SnapshotDecision = {
  fieldKey: string;
  value: unknown;
};

type ApprovalSnapshot = {
  fields?: SnapshotField[];
  decisions?: SnapshotDecision[];
  approvalReason?: string;
  run?: { artifactSha256?: string };
  document?: { sha256?: string };
};

const recordColumns = sql`lr.id,lr.display_id AS "displayId",d.id AS "documentId",d.display_id AS "documentDisplayId",d.title AS "documentTitle",
  v.id AS "versionId",v.task_id AS "taskId",v.snapshot,v.source_sha256 AS "sourceSha256",v.artifact_sha256 AS "artifactSha256",
  v.version,v.owner_name AS "ownerName",v.survey_number AS "surveyNumber",v.khasra_number AS "khasraNumber",v.khata_number AS "khataNumber",
  v.plot_area AS "plotArea",v.area_unit AS "areaUnit",v.land_classification AS "landClassification",v.ownership_status AS "ownershipStatus",
  v.registration_number AS "registrationNumber",v.registration_date AS "registrationDate",v.is_mutated AS "isMutated",v.approved_at AS "approvedAt",
  vi.name AS village,t.name AS tehsil,di.name AS district,s.name AS state,dt.name AS "typeName"`;

const versionJoins = sql`FROM land_records lr
  JOIN land_record_versions v ON v.id=lr.current_version_id
  JOIN documents d ON d.id=v.document_id
  JOIN villages vi ON vi.id=v.village_id
  JOIN tehsils t ON t.id=vi.tehsil_id
  JOIN districts di ON di.id=t.district_id
  JOIN states s ON s.id=di.state_id
  LEFT JOIN document_schema_versions sv ON sv.id=v.schema_version_id
  LEFT JOIN document_types dt ON dt.id=sv.type_id`;

const allVersionJoins = sql`FROM land_records lr
  JOIN land_record_versions v ON v.record_id=lr.id
  JOIN documents d ON d.id=v.document_id
  JOIN villages vi ON vi.id=v.village_id
  JOIN tehsils t ON t.id=vi.tehsil_id
  JOIN districts di ON di.id=t.district_id
  JOIN states s ON s.id=di.state_id
  LEFT JOIN document_schema_versions sv ON sv.id=v.schema_version_id
  LEFT JOIN document_types dt ON dt.id=sv.type_id`;

function visible(actor: Actor) {
  return sql`lr.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}

function iso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function summary(row: Record<string, unknown>): LandRecordSummary {
  return {
    ...row,
    version: Number(row.version),
    plotArea: row.plotArea === null ? null : Number(row.plotArea),
    isMutated: Boolean(row.isMutated),
    approvedAt: iso(row.approvedAt),
  } as LandRecordSummary;
}

function versionSummary(row: Record<string, unknown>): LandRecordVersionSummary {
  const current = summary(row);
  return {
    versionId: String(row.versionId),
    taskId: String(row.taskId),
    version: current.version,
    ownerName: current.ownerName,
    surveyNumber: current.surveyNumber,
    khasraNumber: current.khasraNumber,
    khataNumber: current.khataNumber,
    plotArea: current.plotArea,
    areaUnit: current.areaUnit,
    landClassification: current.landClassification,
    ownershipStatus: current.ownershipStatus,
    registrationNumber: current.registrationNumber,
    registrationDate: current.registrationDate,
    isMutated: current.isMutated,
    approvedAt: current.approvedAt,
    village: current.village,
    tehsil: current.tehsil,
    district: current.district,
    state: current.state,
    typeName: current.typeName,
  };
}

function decisionMap(snapshot: ApprovalSnapshot) {
  return new Map((snapshot.decisions ?? []).map((decision) => [decision.fieldKey, decision.value]));
}

function textValue(values: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = values.get(key);
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

function numberValue(values: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = values.get(key);
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function dateValue(values: Map<string, unknown>, keys: string[]) {
  const value = textValue(values, keys);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function booleanValue(values: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = values.get(key);
    if (typeof value === "boolean") return value;
  }
  return false;
}

function detailsFor(values: Map<string, unknown>, prefix: string) {
  return Object.fromEntries(
    [...values.entries()]
      .filter(([key, value]) => key.startsWith(prefix) && value !== null && value !== undefined)
      .map(([key, value]) => [key, value]),
  );
}

function approvedFields(snapshot: ApprovalSnapshot): ApprovedLandRecordField[] {
  const decisions = decisionMap(snapshot);
  return (snapshot.fields ?? []).map((field) => ({
    fieldKey: field.fieldKey,
    label: field.label,
    fieldType: field.fieldType,
    value: decisions.get(field.fieldKey) ?? field.normalizedValue ?? null,
    confidence: field.confidence ?? null,
  }));
}

async function loadRecord(
  tx: Transaction | ReturnType<typeof getDb>,
  actor: Actor,
  id: string,
) {
  const result = await tx.execute(
    sql`SELECT ${recordColumns} ${versionJoins} WHERE lr.id=${id} AND ${visible(actor)}`,
  );
  if (!result.rows.length)
    throw new AppError(404, "NOT_FOUND", "Land record not found.");
  return result.rows[0] as Record<string, unknown>;
}

export async function materializeApprovedRecord(
  tx: Transaction,
  input: {
    taskId: string;
    actor: Actor;
    requestId: string;
    snapshot: Record<string, unknown>;
  },
): Promise<MaterializedRecord> {
  requirePermission(input.actor, "verification.review");
  z.uuid().parse(input.taskId);
  const existing = await tx.execute(
    sql`SELECT record_id AS "recordId",id AS "versionId",version FROM land_record_versions WHERE task_id=${input.taskId}`,
  );
  if (existing.rows.length) {
    const row = existing.rows[0] as Record<string, unknown>;
    return {
      recordId: String(row.recordId),
      versionId: String(row.versionId),
      version: Number(row.version),
    };
  }

  const source = await tx.execute(
    sql`SELECT t.id AS task_id,t.document_id,t.department_id,t.schema_version_id,d.village_id,d.sha256
        FROM verification_tasks t JOIN documents d ON d.id=t.document_id
        WHERE t.id=${input.taskId} AND t.department_id=${input.actor.departmentId}`,
  );
  if (!source.rows.length)
    throw new AppError(404, "NOT_FOUND", "Approved verification task not found.");
  const task = source.rows[0] as Record<string, unknown>;
  const documentId = String(task.document_id);
  const departmentId = String(task.department_id);

  const insertedRecord = await tx.execute(
    sql`INSERT INTO land_records(department_id,document_id,display_id)
        VALUES(${departmentId},${documentId},${`LR-${randomUUID()}`})
        ON CONFLICT(document_id) DO NOTHING RETURNING id`,
  );
  let recordId: string;
  if (insertedRecord.rows.length) {
    recordId = String(insertedRecord.rows[0].id);
  } else {
    const found = await tx.execute(
      sql`SELECT id FROM land_records WHERE document_id=${documentId} FOR UPDATE`,
    );
    if (!found.rows.length)
      throw new AppError(409, "RECORD_CONFLICT", "Land record could not be locked.");
    recordId = String(found.rows[0].id);
  }

  const count = await tx.execute(
    sql`SELECT count(*)::int AS total FROM land_record_versions WHERE record_id=${recordId}`,
  );
  const version = Number(count.rows[0].total) + 1;
  const snapshot = input.snapshot as ApprovalSnapshot;
  const values = decisionMap(snapshot);
  const ownerName = textValue(values, ["owner_name", "landowner_name"]);
  const surveyNumber = textValue(values, ["survey_number", "survey_no"]);
  const khasraNumber = textValue(values, ["khasra_number", "khasra_no"]);
  const khataNumber = textValue(values, ["khata_number", "khata_no"]);
  const plotArea = numberValue(values, ["plot_area", "area"]);
  const areaUnit = textValue(values, ["area_unit", "unit"]);
  const landClassification = textValue(values, ["land_classification", "classification"]);
  const ownershipStatus = textValue(values, ["ownership_status", "ownership"]);
  const registrationNumber = textValue(values, ["registration_number", "registration_no"]);
  const registrationDate = dateValue(values, ["registration_date"]);
  const isMutated = booleanValue(values, ["is_mutated", "mutated"]);
  const sourceSha256 = textValue(values, ["source_sha256"]) ?? String(snapshot.document?.sha256 ?? task.sha256);
  const artifactSha256 = textValue(values, ["artifact_sha256"]) ?? String(snapshot.run?.artifactSha256 ?? "");
  if (!sourceSha256 || !artifactSha256)
    throw new AppError(422, "SNAPSHOT_INCOMPLETE", "The approval snapshot lacks source integrity hashes.");

  const insertedVersion = await tx.execute(
    sql`INSERT INTO land_record_versions(record_id,department_id,version,task_id,document_id,village_id,schema_version_id,snapshot,
        survey_number,khasra_number,khata_number,owner_name,plot_area,area_unit,land_classification,ownership_status,
        registration_number,registration_date,is_mutated,source_sha256,artifact_sha256,approved_by)
        VALUES(${recordId},${departmentId},${version},${input.taskId},${documentId},${String(task.village_id)},${String(task.schema_version_id)},
        ${JSON.stringify(input.snapshot)}::jsonb,${surveyNumber},${khasraNumber},${khataNumber},${ownerName},${plotArea},${areaUnit},
        ${landClassification},${ownershipStatus},${registrationNumber},${registrationDate}::date,${isMutated},${sourceSha256},${artifactSha256},${input.actor.id})
        RETURNING id`,
  );
  const versionId = String(insertedVersion.rows[0].id);

  if (ownerName) {
    await tx.execute(
      sql`INSERT INTO landowners(version_id,sequence,name,relationship,ownership_share,details)
          VALUES(${versionId},1,${ownerName},${textValue(values, ["owner_relationship", "relationship"])},
          ${numberValue(values, ["ownership_share", "owner_share"])},${JSON.stringify(detailsFor(values, "owner_"))}::jsonb)`,
    );
  }

  const hasMutation = isMutated || [...values.keys()].some((key) => key.startsWith("mutation_"));
  if (hasMutation) {
    await tx.execute(
      sql`INSERT INTO mutation_records(version_id,sequence,mutation_number,mutation_date,details)
          VALUES(${versionId},1,${textValue(values, ["mutation_number", "mutation_no"])},
          ${dateValue(values, ["mutation_date"])}::date,${JSON.stringify(detailsFor(values, "mutation_"))}::jsonb)`,
    );
  }

  const hasRegistration = Boolean(registrationNumber || registrationDate) ||
    [...values.keys()].some((key) => key.startsWith("registration_"));
  if (hasRegistration) {
    await tx.execute(
      sql`INSERT INTO registration_records(version_id,sequence,registration_number,registration_date,details)
          VALUES(${versionId},1,${registrationNumber},${registrationDate}::date,
          ${JSON.stringify(detailsFor(values, "registration_"))}::jsonb)`,
    );
  }

  await tx.execute(
    sql`UPDATE land_records SET current_version_id=${versionId},updated_at=now() WHERE id=${recordId}`,
  );
  await appendAudit(tx, {
    actorId: input.actor.id,
    departmentId,
    action: "records.version_created",
    entityId: recordId,
    requestId: input.requestId,
    details: { versionId, version, taskId: input.taskId, documentId },
  });
  return { recordId, versionId, version };
}

export async function listLandRecords(
  token: string | undefined,
  input: unknown = {},
): Promise<LandRecordsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "records.read");
  const filters = recordFiltersSchema.parse(input);
  const q = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = sql`${visible(actor)} AND (${filters.q}='' OR lr.display_id ILIKE ${q} OR v.owner_name ILIKE ${q}
    OR v.survey_number ILIKE ${q} OR v.khasra_number ILIKE ${q} OR v.khata_number ILIKE ${q}
    OR v.registration_number ILIKE ${q} OR d.title ILIKE ${q})
    ${filters.villageId ? sql`AND v.village_id=${filters.villageId}` : sql``}
    ${filters.typeId ? sql`AND dt.id=${filters.typeId}` : sql``}`;
  const db = getDb();
  const [rows, count] = await Promise.all([
    db.execute(
      sql`SELECT ${recordColumns} ${versionJoins} WHERE ${where} ORDER BY v.approved_at DESC,lr.id LIMIT 25 OFFSET ${(filters.page - 1) * 25}`,
    ),
    db.execute(sql`SELECT count(*)::int AS total ${versionJoins} WHERE ${where}`),
  ]);
  return {
    items: rows.rows.map((row) => summary(row as Record<string, unknown>)),
    page: filters.page,
    page_size: 25,
    total: Number(count.rows[0].total),
  };
}

export async function getLandRecord(
  token: string | undefined,
  id: string,
): Promise<LandRecordDetail> {
  const actor = await requireActor(token);
  requirePermission(actor, "records.read");
  z.uuid().parse(id);
  const db = getDb();
  const row = await loadRecord(db, actor, id);
  const versionId = String(row.versionId ?? "");
  if (!versionId) throw new AppError(409, "RECORD_INCOMPLETE", "The record has no current version.");
  const snapshot = (row.snapshot ?? {}) as ApprovalSnapshot;
  const [owners, mutations, registration] = await Promise.all([
    db.execute(sql`SELECT sequence,name,relationship,ownership_share AS "ownershipShare",details FROM landowners WHERE version_id=${versionId} ORDER BY sequence`),
    db.execute(sql`SELECT sequence,mutation_number AS "mutationNumber",mutation_date AS "mutationDate",details FROM mutation_records WHERE version_id=${versionId} ORDER BY sequence`),
    db.execute(sql`SELECT sequence,registration_number AS "registrationNumber",registration_date AS "registrationDate",details FROM registration_records WHERE version_id=${versionId} ORDER BY sequence`),
  ]);
  return {
    ...summary(row),
    taskId: String(row.taskId),
    sourceSha256: String(row.sourceSha256),
    artifactSha256: String(row.artifactSha256),
    approvalReason: String(snapshot.approvalReason ?? ""),
    owners: owners.rows.map((item) => ({
      ...(item as Record<string, unknown>),
      sequence: Number((item as { sequence: number }).sequence),
      ownershipShare: item.ownershipShare === null || item.ownershipShare === undefined
        ? null
        : Number(item.ownershipShare),
      details: (item.details ?? {}) as Record<string, unknown>,
    })) as LandRecordOwner[],
    mutations: mutations.rows.map((item) => ({
      ...(item as Record<string, unknown>),
      sequence: Number((item as { sequence: number }).sequence),
      mutationDate: item.mutationDate ? String(item.mutationDate).slice(0, 10) : null,
      details: (item.details ?? {}) as Record<string, unknown>,
    })) as LandRecordMutation[],
    registration: registration.rows.map((item) => ({
      ...(item as Record<string, unknown>),
      sequence: Number((item as { sequence: number }).sequence),
      registrationDate: item.registrationDate ? String(item.registrationDate).slice(0, 10) : null,
      details: (item.details ?? {}) as Record<string, unknown>,
    })) as LandRecordRegistration[],
    fields: approvedFields(snapshot),
  };
}

export async function getLandRecordVersions(
  token: string | undefined,
  id: string,
): Promise<LandRecordVersionSummary[]> {
  const actor = await requireActor(token);
  requirePermission(actor, "records.read");
  z.uuid().parse(id);
  const rows = await getDb().execute(
    sql`SELECT ${recordColumns} ${allVersionJoins}
        WHERE lr.id=${id} AND ${visible(actor)} ORDER BY v.version DESC,v.approved_at DESC`,
  );
  return rows.rows.map((row) => versionSummary(row as Record<string, unknown>));
}

export async function getLandRecordForDocument(
  token: string | undefined,
  documentId: string,
): Promise<LandRecordSummary | null> {
  const actor = await requireActor(token);
  requirePermission(actor, "records.read");
  z.uuid().parse(documentId);
  const rows = await getDb().execute(
    sql`SELECT ${recordColumns} ${versionJoins} WHERE d.id=${documentId} AND ${visible(actor)}`,
  );
  return rows.rows.length ? summary(rows.rows[0] as Record<string, unknown>) : null;
}
