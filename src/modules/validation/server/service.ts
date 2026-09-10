import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Transaction } from "@/server/db";
import {
  requireActor,
  requirePermission,
} from "@/modules/identity/server/service";
import { scopedIds } from "@/modules/master-data/server/service";
import type { Actor } from "@/modules/identity/contracts";
import type { FieldDefinition } from "@/modules/document-types/contracts";
import type { ModelResult } from "@/modules/processing/contracts";
import type {
  DuplicateCandidateView,
  DuplicateSignalView,
} from "@/modules/duplicates/contracts";
import type { ValidationView } from "../contracts";

const confidenceThreshold = 0.7;
const areaTolerance = 0.01;

type Finding = {
  fieldKey: string | null;
  code: string;
  status: "PASS" | "WARNING" | "FAIL" | "NOT_CHECKED";
  severity: "INFO" | "WARNING" | "BLOCKING";
  message: string;
  details?: Record<string, unknown>;
  source: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeValue(type: FieldDefinition["type"], value: unknown) {
  if (value === null || value === undefined) return { value: null, valid: true };
  if (type === "text") {
    if (typeof value !== "string") return { value: null, valid: false };
    return { value: normalizeText(value), valid: true };
  }
  if (type === "number") {
    if (typeof value === "number" && Number.isFinite(value))
      return { value, valid: value > 0 };
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value.replace(/,/g, ""));
      return { value: Number.isFinite(parsed) ? parsed : null, valid: Number.isFinite(parsed) && parsed > 0 };
    }
    return { value: null, valid: false };
  }
  if (type === "date") {
    if (typeof value !== "string") return { value: null, valid: false };
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return { value: /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) ? value : null, valid: /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) };
  }
  if (typeof value !== "boolean") return { value: null, valid: false };
  return { value, valid: true };
}

function normalizedText(fields: Map<string, unknown>, key: string) {
  const value = fields.get(key);
  return typeof value === "string" ? normalizeText(value).toLowerCase() : null;
}

function normalizedNumber(fields: Map<string, unknown>, key: string) {
  const value = fields.get(key);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function insertFinding(tx: Transaction, runId: string, finding: Finding) {
  await tx.execute(
    sql`INSERT INTO validation_findings(run_id,field_key,code,status,severity,message,details,source)
        VALUES(${runId},${finding.fieldKey},${finding.code},${finding.status},${finding.severity},${finding.message},${JSON.stringify(finding.details ?? {})}::jsonb,${finding.source})`,
  );
}

async function duplicateSignals(
  tx: Transaction,
  documentId: string,
  departmentId: string,
  schemaVersionId: string,
  fields: Map<string, unknown>,
) {
  const result = await tx.execute(
    sql`WITH current_document AS (
          SELECT d.id,d.sha256,d.village_id,di.jurisdiction_id
          FROM documents d
          JOIN villages v ON v.id=d.village_id
          JOIN tehsils t ON t.id=v.tehsil_id
          JOIN districts di ON di.id=t.district_id
          WHERE d.id=${documentId}
        )
        SELECT d.id,d.display_id,d.title,d.sha256 AS source_sha256,cd.sha256 AS current_sha256,cd.village_id AS current_village_id,
               COALESCE(
                 (SELECT jsonb_object_agg(f.field_key,f.normalized_value)
                  FROM extraction_fields f
                  JOIN extraction_runs r ON r.id=f.run_id
                  WHERE r.document_id=d.id
                    AND r.id=(
                      SELECT r2.id FROM extraction_runs r2
                      WHERE r2.document_id=d.id
                      ORDER BY r2.created_at DESC,r2.id DESC LIMIT 1
                    )
                 ),'{}'::jsonb
               ) AS candidate_fields
        FROM documents d
        JOIN current_document cd ON true
        JOIN villages v ON v.id=d.village_id
        JOIN tehsils t ON t.id=v.tehsil_id
        JOIN districts di ON di.id=t.district_id
        WHERE d.id<>${documentId}
          AND d.department_id=${departmentId}
          AND d.schema_version_id=${schemaVersionId}
          AND di.jurisdiction_id=cd.jurisdiction_id
          AND d.village_id=cd.village_id
        ORDER BY d.created_at DESC,d.id
        LIMIT 100`,
  );
  return result.rows.map((row) => {
    const candidateFields = new Map(Object.entries((row.candidate_fields ?? {}) as Record<string, unknown>));
    const candidateSurvey = normalizedText(candidateFields, "survey_number");
    const currentSurvey = normalizedText(fields, "survey_number");
    const candidateOwner = normalizedText(candidateFields, "owner_name");
    const currentOwner = normalizedText(fields, "owner_name");
    const candidateArea = normalizedNumber(candidateFields, "area");
    const currentArea = normalizedNumber(fields, "area");
    const sameSource = String(row.source_sha256) === String(row.current_sha256);
    const signals: DuplicateSignalView[] = [
      { code: "SAME_SOURCE_HASH", label: "Identical source file", matched: sameSource, details: { sourceSha256: row.source_sha256 } },
      { code: "SAME_LOCATION", label: "Same assigned village", matched: true, details: { villageId: row.current_village_id } },
      { code: "SAME_SURVEY_NUMBER", label: "Same survey number", matched: Boolean(candidateSurvey && currentSurvey && candidateSurvey === currentSurvey), details: { currentSurveyNumber: currentSurvey, candidateSurveyNumber: candidateSurvey } },
      { code: "SAME_OWNER_NAME", label: "Same owner name", matched: Boolean(candidateOwner && currentOwner && candidateOwner === currentOwner), details: { currentOwnerName: currentOwner, candidateOwnerName: candidateOwner } },
      { code: "SIMILAR_AREA", label: "Similar plot area", matched: Boolean(candidateArea && currentArea && Math.abs(candidateArea - currentArea) <= Math.max(areaTolerance, currentArea * areaTolerance)), details: { currentArea, candidateArea, tolerance: areaTolerance } },
    ];
    const score = Math.min(
      1,
      signals.reduce((total, signal) => total + (signal.matched ? 0.25 : 0), 0),
    );
    return {
      candidateDocumentId: String(row.id),
      candidateDisplayId: String(row.display_id),
      candidateTitle: String(row.title),
      score,
      signals: signals.filter((signal) => signal.matched),
    };
  }).filter((candidate) => candidate.score >= 0.5 && candidate.signals.length >= 2);
}

export async function ingestExtractionRun(
  tx: Transaction,
  input: {
    jobId: string;
    artifactId: string;
    result: ModelResult;
    document: {
      id: string;
      departmentId: string;
      schemaVersionId: string;
      documentRevision: number;
      fields: FieldDefinition[];
      hierarchy: { state: string; district: string; tehsil: string; village: string };
    };
  },
) {
  z.uuid().parse(input.jobId);
  z.uuid().parse(input.artifactId);
  const runId = randomUUID();
  const findings: Finding[] = [];
  const normalizedByField = new Map<string, unknown>();
  const fieldRows: Array<{
    definition: FieldDefinition;
    sourceValue: unknown;
    normalizedValue: unknown;
    confidence: number | null;
    missingReason: string | null;
    evidence: unknown[];
  }> = [];

  for (const definition of input.document.fields) {
    const modelField = input.result.fields[definition.key] ?? null;
    const sourceValue = modelField?.value ?? null;
    const normalized = normalizeValue(definition.type, sourceValue);
    normalizedByField.set(definition.key, normalized.value);
    fieldRows.push({
      definition,
      sourceValue,
      normalizedValue: normalized.value,
      confidence: modelField?.confidence ?? null,
      missingReason:
        modelField?.missing_reason ?? (modelField ? null : "FIELD_NOT_RETURNED"),
      evidence: modelField?.evidence ?? [],
    });

    if (sourceValue === null || sourceValue === "") {
      findings.push({
        fieldKey: definition.key,
        code: definition.required ? "REQUIRED_FIELD_MISSING" : "OPTIONAL_FIELD_MISSING",
        status: definition.required ? "FAIL" : "NOT_CHECKED",
        severity: definition.required ? "BLOCKING" : "INFO",
        message: definition.required ? "A required field was not extracted." : "An optional field was not extracted.",
        source: "application",
      });
    } else if (!normalized.valid) {
      findings.push({
        fieldKey: definition.key,
        code: "FIELD_TYPE_INVALID",
        status: "FAIL",
        severity: "BLOCKING",
        message: `The extracted ${definition.type} value is invalid.`,
        details: { sourceValue },
        source: "application",
      });
    }
    if (definition.key === "area" && normalized.valid && typeof normalized.value === "number" && normalized.value <= 0) {
      findings.push({
        fieldKey: definition.key,
        code: "AREA_NOT_POSITIVE",
        status: "FAIL",
        severity: "BLOCKING",
        message: "Plot area must be greater than zero.",
        details: { area: normalized.value },
        source: "business-rule",
      });
    }
    if (modelField && modelField.confidence !== null && modelField.confidence < confidenceThreshold) {
      findings.push({
        fieldKey: definition.key,
        code: "LOW_CONFIDENCE",
        status: "WARNING",
        severity: "WARNING",
        message: "Model confidence is below the review threshold.",
        details: { confidence: modelField.confidence, threshold: confidenceThreshold },
        source: "model-confidence",
      });
    }
    const hierarchyKey = definition.key as keyof typeof input.document.hierarchy;
    if (["state", "district", "tehsil", "village"].includes(definition.key)) {
      const extracted = typeof sourceValue === "string" ? normalizeText(sourceValue).toLowerCase() : null;
      const expected = input.document.hierarchy[hierarchyKey].toLowerCase();
      if (extracted !== null) {
        findings.push({
          fieldKey: definition.key,
          code: extracted === expected ? "MASTER_DATA_MATCH" : "MASTER_DATA_MISMATCH",
          status: extracted === expected ? "PASS" : "FAIL",
          severity: extracted === expected ? "INFO" : "BLOCKING",
          message: extracted === expected ? "The extracted location matches the assigned master data." : "The extracted location does not match the assigned master data.",
          details: { extracted, expected },
          source: "master-data",
        });
      }
    }
  }

  const duplicates = await duplicateSignals(
    tx,
    input.document.id,
    input.document.departmentId,
    input.document.schemaVersionId,
    normalizedByField,
  );
  const duplicateBlockers = duplicates.length;
  const blockerCount = findings.filter((finding) => finding.severity === "BLOCKING").length + duplicateBlockers;
  const status = blockerCount > 0 ? "BLOCKED" : "VALIDATED";
  await tx.execute(
    sql`INSERT INTO extraction_runs(id,job_id,artifact_id,document_id,department_id,schema_version_id,document_revision,status,blocker_count,duplicate_count)
        VALUES(${runId},${input.jobId},${input.artifactId},${input.document.id},${input.document.departmentId},${input.document.schemaVersionId},${input.document.documentRevision},${status},${blockerCount},${duplicateBlockers})`,
  );
  for (const field of fieldRows) {
    await tx.execute(
      sql`INSERT INTO extraction_fields(run_id,field_key,label,field_type,required,critical,source_value,normalized_value,confidence,missing_reason,evidence)
          VALUES(${runId},${field.definition.key},${field.definition.label},${field.definition.type},${field.definition.required},${field.definition.critical},${JSON.stringify(field.sourceValue)}::jsonb,${field.normalizedValue === null ? null : JSON.stringify(field.normalizedValue)}::jsonb,${field.confidence},${field.missingReason},${JSON.stringify(field.evidence)}::jsonb)`,
    );
  }
  for (const duplicate of duplicates) {
    await tx.execute(
      sql`INSERT INTO duplicate_candidates(run_id,document_id,candidate_document_id,score,signals)
          VALUES(${runId},${input.document.id},${duplicate.candidateDocumentId},${duplicate.score},${JSON.stringify(duplicate.signals)}::jsonb)`,
    );
  }
  for (const finding of findings) await insertFinding(tx, runId, finding);
  if (duplicates.length) {
    await insertFinding(tx, runId, {
      fieldKey: null,
      code: "DUPLICATE_CANDIDATES_FOUND",
      status: "WARNING",
      severity: "BLOCKING",
      message: "One or more duplicate candidates require human resolution.",
      details: { count: duplicates.length, candidateDocumentIds: duplicates.map((duplicate) => duplicate.candidateDocumentId) },
      source: "duplicates",
    });
  }
  return { runId, status, blockerCount, duplicateCount: duplicates.length };
}

function visible(actor: Actor) {
  return sql`d.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}

export async function getValidation(
  token: string | undefined,
  documentId: string,
): Promise<ValidationView & { duplicates: DuplicateCandidateView[] }> {
  const actor = await requireActor(token);
  requirePermission(actor, "processing.read");
  z.uuid().parse(documentId);
  const db = getDb();
  const runResult = await db.execute(
    sql`SELECT r.id,r.document_id AS "documentId",r.document_revision AS "documentRevision",r.status,r.blocker_count AS "blockerCount",r.duplicate_count AS "duplicateCount",r.created_at AS "createdAt",r.completed_at AS "completedAt"
        FROM extraction_runs r
        JOIN documents d ON d.id=r.document_id
        JOIN villages v ON v.id=d.village_id
        JOIN tehsils t ON t.id=v.tehsil_id
        JOIN districts di ON di.id=t.district_id
        WHERE r.document_id=${documentId} AND ${visible(actor)}
        ORDER BY r.created_at DESC,r.id DESC LIMIT 1`,
  );
  if (!runResult.rows.length)
    return { run: null, fields: [], findings: [], duplicates: [] };
  const run = runResult.rows[0] as Record<string, unknown>;
  const [fields, findings, duplicates] = await Promise.all([
    db.execute(sql`SELECT field_key AS "fieldKey",label,field_type AS "fieldType",required,critical,source_value AS "sourceValue",normalized_value AS "normalizedValue",confidence,missing_reason AS "missingReason",evidence FROM extraction_fields WHERE run_id=${run.id} ORDER BY field_key`),
    db.execute(sql`SELECT field_key AS "fieldKey",code,status,severity,message,details,source FROM validation_findings WHERE run_id=${run.id} ORDER BY severity DESC,code,field_key NULLS LAST`),
    db.execute(sql`SELECT dc.id,dc.candidate_document_id AS "candidateDocumentId",d.display_id AS "candidateDisplayId",d.title AS "candidateTitle",dc.score,dc.signals,dc.status,dc.resolution_reason AS "resolutionReason",dc.resolved_at AS "resolvedAt",dc.created_at AS "createdAt"
                    FROM duplicate_candidates dc
                    JOIN documents d ON d.id=dc.candidate_document_id
                    JOIN villages v ON v.id=d.village_id
                    JOIN tehsils t ON t.id=v.tehsil_id
                    JOIN districts di ON di.id=t.district_id
                    WHERE dc.document_id=${documentId} AND ${visible(actor)}
                    ORDER BY dc.score DESC,dc.created_at DESC`),
  ]);
  return {
    run: {
      ...run,
      createdAt: new Date(String(run.createdAt)).toISOString(),
      completedAt: new Date(String(run.completedAt)).toISOString(),
    } as ValidationView["run"],
    fields: fields.rows.map((row) => {
      const field = row as Record<string, unknown> & { evidence?: Array<Record<string, unknown>> };
      return {
        ...field,
        evidence: (field.evidence ?? []).map((item) => ({
          page: Number(item.page),
          blockIds: item.block_ids ?? [],
          bbox: item.bbox ?? [],
          sourceText: item.source_text ?? "",
        })),
      };
    }) as ValidationView["fields"],
    findings: findings.rows as ValidationView["findings"],
    duplicates: duplicates.rows.map((row) => ({
      ...(row as Record<string, unknown>),
      score: Number((row as { score: number }).score),
      createdAt: new Date(String((row as { createdAt: string }).createdAt)).toISOString(),
      resolvedAt: (row as { resolvedAt: string | null }).resolvedAt
        ? new Date(String((row as { resolvedAt: string }).resolvedAt)).toISOString()
        : null,
    })) as DuplicateCandidateView[],
  };
}
