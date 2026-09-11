import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  requireActor,
  requirePermission,
} from "@/modules/identity/server/service";
import { scopedIds } from "@/modules/master-data/server/service";
import type {
  DashboardAccuracyMetrics,
  DashboardErrorStat,
  DashboardRegionalProgress,
  DashboardSummary,
  DashboardValidationMetrics,
  DashboardWorkflowMetrics,
} from "../contracts";

const lowConfidenceThreshold = 0.7;

function number(row: Record<string, unknown>, key: string) {
  return Number(row[key] ?? 0);
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function regional(row: Record<string, unknown>): DashboardRegionalProgress {
  const documents = number(row, "documents");
  const processed = number(row, "processed");
  const approved = number(row, "approved");
  return {
    id: String(row.id),
    name: String(row.name),
    stateName:
      row.stateName === null || row.stateName === undefined
        ? null
        : String(row.stateName),
    documents,
    processed,
    pendingVerification: number(row, "pendingVerification"),
    approved,
    processingFailed: number(row, "processingFailed"),
    processedRate: rate(processed, documents),
    approvedRate: rate(approved, documents),
  };
}

export async function getDashboardSummary(
  token: string | undefined,
): Promise<DashboardSummary> {
  const actor = await requireActor(token);
  requirePermission(actor, "dashboard.read");
  const db = getDb();
  const scope = scopedIds(actor);
  const scopedDocuments = sql`SELECT d.id,d.status,s.id AS state_id,di.id AS district_id
    FROM documents d
    JOIN villages v ON v.id=d.village_id
    JOIN tehsils t ON t.id=v.tehsil_id
    JOIN districts di ON di.id=t.district_id
    JOIN states s ON s.id=di.state_id
    WHERE d.department_id=${actor.departmentId}
      AND di.jurisdiction_id IN (${scope})`;

  const [workflowRows, validationRows, confidenceRows, stateRows, districtRows, errorRows] =
    await Promise.all([
      db.execute(sql`WITH scoped_documents AS (${scopedDocuments})
        SELECT count(*)::int AS "documentsTotal",
          (count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM processing_jobs j
            WHERE j.document_id=scoped_documents.id AND j.status='SUCCEEDED'
          )))::int AS "documentsProcessed",
          (count(*) FILTER (WHERE status IN ('UPLOADED','QUEUED','MODEL_PROCESSING')))::int AS "documentsInProcessing",
          (count(*) FILTER (WHERE status IN ('VERIFICATION_PENDING','RETURNED_FOR_EDIT')))::int AS "documentsPendingVerification",
          (count(*) FILTER (WHERE status='VERIFICATION_APPROVED'))::int AS "documentsApproved",
          (count(*) FILTER (WHERE status='VERIFICATION_REJECTED'))::int AS "documentsRejected",
          (count(*) FILTER (WHERE status='PROCESSING_FAILED'))::int AS "documentsProcessingFailed"
        FROM scoped_documents`),
      db.execute(sql`WITH scoped_documents AS (${scopedDocuments}),
        ranked_runs AS (
          SELECT er.*,row_number() OVER (
            PARTITION BY er.document_id ORDER BY er.created_at DESC,er.id DESC
          ) AS row_number
          FROM extraction_runs er
          JOIN scoped_documents ON scoped_documents.id=er.document_id
        ),
        current_runs AS (SELECT * FROM ranked_runs WHERE row_number=1)
        SELECT (SELECT count(*)::int FROM current_runs) AS "currentRuns",
          (SELECT count(*)::int FROM current_runs WHERE status='VALIDATED') AS "validatedRuns",
          (SELECT count(*)::int FROM current_runs WHERE status='BLOCKED') AS "blockedRuns",
          (SELECT count(*)::int FROM validation_findings vf
            JOIN current_runs cr ON cr.id=vf.run_id WHERE vf.status='PASS') AS "passFindings",
          (SELECT count(*)::int FROM validation_findings vf
            JOIN current_runs cr ON cr.id=vf.run_id WHERE vf.status='WARNING') AS "warningFindings",
          (SELECT count(*)::int FROM validation_findings vf
            JOIN current_runs cr ON cr.id=vf.run_id WHERE vf.status='FAIL') AS "failFindings",
          (SELECT count(*)::int FROM validation_findings vf
            JOIN current_runs cr ON cr.id=vf.run_id WHERE vf.status='NOT_CHECKED') AS "notCheckedFindings"`),
      db.execute(sql`WITH scoped_documents AS (${scopedDocuments}),
        ranked_runs AS (
          SELECT er.*,row_number() OVER (
            PARTITION BY er.document_id ORDER BY er.created_at DESC,er.id DESC
          ) AS row_number
          FROM extraction_runs er
          JOIN scoped_documents ON scoped_documents.id=er.document_id
        ),
        current_runs AS (SELECT * FROM ranked_runs WHERE row_number=1)
        SELECT count(ef.id)::int AS fields,
          (count(ef.id) FILTER (WHERE ef.confidence IS NOT NULL))::int AS "fieldsWithConfidence",
          (count(ef.id) FILTER (WHERE ef.confidence IS NULL))::int AS "fieldsWithoutConfidence",
          (count(ef.id) FILTER (WHERE ef.confidence < ${lowConfidenceThreshold}))::int AS "lowConfidenceFields",
          avg(ef.confidence) AS "averageConfidence"
        FROM current_runs cr
        JOIN extraction_fields ef ON ef.run_id=cr.id`),
      db.execute(sql`WITH scoped_documents AS (${scopedDocuments})
        SELECT s.id,s.name,count(sd.id)::int AS documents,
          (count(sd.id) FILTER (WHERE EXISTS (
            SELECT 1 FROM processing_jobs j
            WHERE j.document_id=sd.id AND j.status='SUCCEEDED'
          )))::int AS processed,
          (count(sd.id) FILTER (WHERE sd.status IN ('VERIFICATION_PENDING','RETURNED_FOR_EDIT')))::int AS "pendingVerification",
          (count(sd.id) FILTER (WHERE sd.status='VERIFICATION_APPROVED'))::int AS approved,
          (count(sd.id) FILTER (WHERE sd.status='PROCESSING_FAILED'))::int AS "processingFailed"
        FROM states s
        JOIN districts di ON di.state_id=s.id
        LEFT JOIN scoped_documents sd
          ON sd.state_id=s.id AND sd.district_id=di.id
        WHERE s.department_id=${actor.departmentId}
          AND di.jurisdiction_id IN (${scope})
        GROUP BY s.id,s.name
        ORDER BY s.name,s.id`),
      db.execute(sql`WITH scoped_documents AS (${scopedDocuments})
        SELECT di.id,di.name,s.name AS "stateName",count(sd.id)::int AS documents,
          (count(sd.id) FILTER (WHERE EXISTS (
            SELECT 1 FROM processing_jobs j
            WHERE j.document_id=sd.id AND j.status='SUCCEEDED'
          )))::int AS processed,
          (count(sd.id) FILTER (WHERE sd.status IN ('VERIFICATION_PENDING','RETURNED_FOR_EDIT')))::int AS "pendingVerification",
          (count(sd.id) FILTER (WHERE sd.status='VERIFICATION_APPROVED'))::int AS approved,
          (count(sd.id) FILTER (WHERE sd.status='PROCESSING_FAILED'))::int AS "processingFailed"
        FROM districts di
        JOIN states s ON s.id=di.state_id
        LEFT JOIN scoped_documents sd ON sd.district_id=di.id
        WHERE di.department_id=${actor.departmentId}
          AND di.jurisdiction_id IN (${scope})
        GROUP BY di.id,di.name,s.name
        ORDER BY s.name,di.name,di.id`),
      db.execute(sql`WITH scoped_documents AS (${scopedDocuments})
        SELECT COALESCE(error_code,'UNKNOWN') AS code,count(*)::int AS count,
          max(error_message) AS "lastMessage"
        FROM processing_jobs j
        JOIN scoped_documents ON scoped_documents.id=j.document_id
        WHERE j.status IN ('FAILED','CANCELLED','RESULT_REJECTED')
        GROUP BY COALESCE(error_code,'UNKNOWN')
        ORDER BY count(*) DESC,code
        LIMIT 10`),
    ]);

  const workflowRow = workflowRows.rows[0] as Record<string, unknown>;
  const validationRow = validationRows.rows[0] as Record<string, unknown>;
  const confidenceRow = confidenceRows.rows[0] as Record<string, unknown>;
  const documentsTotal = number(workflowRow, "documentsTotal");
  const documentsProcessed = number(workflowRow, "documentsProcessed");
  const documentsApproved = number(workflowRow, "documentsApproved");
  const workflow: DashboardWorkflowMetrics = {
    documentsTotal,
    documentsProcessed,
    documentsInProcessing: number(workflowRow, "documentsInProcessing"),
    documentsPendingVerification: number(
      workflowRow,
      "documentsPendingVerification",
    ),
    documentsApproved,
    documentsRejected: number(workflowRow, "documentsRejected"),
    documentsProcessingFailed: number(workflowRow, "documentsProcessingFailed"),
    processedRate: rate(documentsProcessed, documentsTotal),
    approvedRate: rate(documentsApproved, documentsTotal),
  };
  const validation: DashboardValidationMetrics = {
    currentRuns: number(validationRow, "currentRuns"),
    validatedRuns: number(validationRow, "validatedRuns"),
    blockedRuns: number(validationRow, "blockedRuns"),
    passFindings: number(validationRow, "passFindings"),
    warningFindings: number(validationRow, "warningFindings"),
    failFindings: number(validationRow, "failFindings"),
    notCheckedFindings: number(validationRow, "notCheckedFindings"),
  };
  const accuracy: DashboardAccuracyMetrics = {
    status: "NOT_MEASURED",
    value: null,
    evaluatedFields: 0,
    note: "Accuracy requires verified/reference evaluation data from Phase 10. Model confidence is not accuracy.",
  };

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      departmentId: actor.departmentId,
      departmentName: actor.departmentName,
      jurisdictionCount: actor.scopes.length,
    },
    workflow,
    validation,
    confidence: {
      fields: number(confidenceRow, "fields"),
      fieldsWithConfidence: number(confidenceRow, "fieldsWithConfidence"),
      fieldsWithoutConfidence: number(confidenceRow, "fieldsWithoutConfidence"),
      lowConfidenceFields: number(confidenceRow, "lowConfidenceFields"),
      averageConfidence:
        confidenceRow.averageConfidence === null ||
        confidenceRow.averageConfidence === undefined
          ? null
          : Number(confidenceRow.averageConfidence),
      lowConfidenceThreshold,
    },
    accuracy,
    states: stateRows.rows.map((row) => regional(row as Record<string, unknown>)),
    districts: districtRows.rows.map((row) =>
      regional(row as Record<string, unknown>),
    ),
    errors: errorRows.rows.map(
      (row) =>
        ({
          code: String((row as Record<string, unknown>).code),
          count: number(row as Record<string, unknown>, "count"),
          lastMessage:
            row.lastMessage === null || row.lastMessage === undefined
              ? null
              : String(row.lastMessage),
        }) satisfies DashboardErrorStat,
    ),
  };
}
