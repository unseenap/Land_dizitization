import "server-only";
import { createHash } from "node:crypto";
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
  createFeedbackDatasetSchema,
  createFeedbackEvaluationSchema,
  reviewFeedbackDatasetSchema,
  type FeedbackDatasetMutationResult,
  type FeedbackDatasetStatus,
  type FeedbackDatasetSummary,
  type FeedbackDatasetsResult,
  type FeedbackEvaluationMetrics,
  type FeedbackEvaluationSummary,
  type FeedbackEvaluationsResult,
  type FeedbackExportPayload,
  type FeedbackExportResult,
  type FeedbackModelVersionSummary,
} from "../contracts";

type QueryExecutor = Pick<Transaction, "execute">;

function iso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function day(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function modelVersions(value: unknown): FeedbackModelVersionSummary[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      modelVersion: String(row.modelVersion),
      modelProvider: String(row.modelProvider),
      modelName: String(row.modelName),
      examples: Number(row.examples),
    };
  });
}

function metrics(value: unknown): FeedbackEvaluationMetrics {
  const row = value as Record<string, unknown>;
  return {
    totalExamples: Number(row.totalExamples),
    evaluatedFields: Number(row.evaluatedFields),
    correctFields: Number(row.correctFields),
    incorrectFields: Number(row.incorrectFields),
    missingPredictionFields: Number(row.missingPredictionFields),
    accuracy: row.accuracy === null || row.accuracy === undefined ? null : Number(row.accuracy),
    correctedFields: Number(row.correctedFields),
    correctionRate:
      row.correctionRate === null || row.correctionRate === undefined
        ? null
        : Number(row.correctionRate),
    averageConfidence:
      row.averageConfidence === null || row.averageConfidence === undefined
        ? null
        : Number(row.averageConfidence),
    byDocumentType: (row.byDocumentType ?? []) as FeedbackEvaluationMetrics["byDocumentType"],
    byLanguage: (row.byLanguage ?? []) as FeedbackEvaluationMetrics["byLanguage"],
    byField: (row.byField ?? []) as FeedbackEvaluationMetrics["byField"],
  };
}

function datasetSummary(row: Record<string, unknown>): FeedbackDatasetSummary {
  return {
    id: String(row.id),
    version: Number(row.version),
    name: String(row.name),
    fromDate: day(row.fromDate),
    toDate: day(row.toDate),
    status: String(row.status) as FeedbackDatasetStatus,
    itemCount: Number(row.itemCount),
    modelVersions: modelVersions(row.modelVersions),
    evaluationCount: Number(row.evaluationCount),
    export:
      row.exportId === null || row.exportId === undefined
        ? null
        : {
            id: String(row.exportId),
            payloadSha256: String(row.payloadSha256),
            exportedAt: iso(row.exportedAt),
          },
    createdAt: iso(row.createdAt),
    reviewedAt:
      row.reviewedAt === null || row.reviewedAt === undefined
        ? null
        : iso(row.reviewedAt),
    reviewReason:
      row.reviewReason === null || row.reviewReason === undefined
        ? null
        : String(row.reviewReason),
  };
}

function evaluationSummary(row: Record<string, unknown>): FeedbackEvaluationSummary {
  return {
    id: String(row.id),
    datasetId: String(row.datasetId),
    datasetName: String(row.datasetName),
    datasetVersion: Number(row.datasetVersion),
    modelVersion: String(row.modelVersion),
    metrics: metrics(row.metrics),
    evaluatedFields: Number(row.evaluatedFields),
    correctFields: Number(row.correctFields),
    createdAt: iso(row.createdAt),
  };
}

function scopedDatasetGuard(actor: Actor) {
  return sql`NOT EXISTS (
    SELECT 1
    FROM feedback_dataset_items fdi
    JOIN feedback_examples fe ON fe.id=fdi.example_id
    JOIN documents d ON d.id=fe.document_id
    JOIN villages v ON v.id=d.village_id
    JOIN tehsils t ON t.id=v.tehsil_id
    JOIN districts di ON di.id=t.district_id
    WHERE fdi.dataset_id=fd.id AND di.jurisdiction_id NOT IN (${scopedIds(actor)}))
  `;
}

async function requireScopedDataset(
  actor: Actor,
  datasetId: string,
  tx: QueryExecutor,
  options: { lock?: boolean; expectedStatus?: FeedbackDatasetStatus } = {},
) {
  const rows = await tx.execute(
    sql`SELECT fd.id,fd.version,fd.name,fd.from_date AS "fromDate",fd.to_date AS "toDate",
               fd.status,fd.reviewed_at AS "reviewedAt"
        FROM feedback_datasets fd
        WHERE fd.id=${datasetId} AND fd.department_id=${actor.departmentId}
          AND ${scopedDatasetGuard(actor)}
        ${options.lock ? sql`FOR UPDATE OF fd` : sql``}`,
  );
  if (!rows.rows.length)
    throw new AppError(404, "NOT_FOUND", "Feedback dataset not found in your scope.");
  const dataset = rows.rows[0] as Record<string, unknown>;
  if (
    options.expectedStatus &&
    String(dataset.status) !== options.expectedStatus
  )
    throw new AppError(
      409,
      "DATASET_STATUS_INVALID",
      `This dataset is ${String(dataset.status)}, not ${options.expectedStatus}.`,
    );
  return dataset;
}

export async function listFeedbackDatasets(
  token: string | undefined,
): Promise<FeedbackDatasetsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "feedback.read");
  const rows = await getDb().execute(
    sql`SELECT fd.id,fd.version,fd.name,fd.from_date AS "fromDate",fd.to_date AS "toDate",fd.status,
          (SELECT count(*)::int FROM feedback_dataset_items i WHERE i.dataset_id=fd.id) AS "itemCount",
          COALESCE((
            SELECT json_agg(json_build_object(
              'modelVersion',x.model_version,'modelProvider',x.model_provider,
              'modelName',x.model_name,'examples',x.examples
            ))
            FROM (
              SELECT fe.model_version,fe.model_provider,fe.model_name,count(*)::int AS examples
              FROM feedback_dataset_items i
              JOIN feedback_examples fe ON fe.id=i.example_id
              WHERE i.dataset_id=fd.id
              GROUP BY fe.model_version,fe.model_provider,fe.model_name
              ORDER BY fe.model_version,fe.model_provider,fe.model_name
            ) x
          ),'[]'::json) AS "modelVersions",
          (SELECT count(*)::int FROM evaluation_runs e WHERE e.dataset_id=fd.id) AS "evaluationCount",
          fer.id AS "exportId",fer.payload_sha256 AS "payloadSha256",fer.exported_at AS "exportedAt",
          fd.created_at AS "createdAt",fd.reviewed_at AS "reviewedAt",fd.review_reason AS "reviewReason"
        FROM feedback_datasets fd
        LEFT JOIN feedback_export_runs fer ON fer.dataset_id=fd.id
        WHERE fd.department_id=${actor.departmentId} AND ${scopedDatasetGuard(actor)}
        ORDER BY fd.created_at DESC,fd.id`,
  );
  return {
    items: rows.rows.map((row) =>
      datasetSummary(row as Record<string, unknown>),
    ),
  };
}

export async function createFeedbackDataset(
  token: string | undefined,
  input: unknown,
  requestId: string,
): Promise<FeedbackDatasetMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "feedback.manage");
  const data = createFeedbackDatasetSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "feedback.manage");
    await tx.execute(
      sql`WITH candidates AS (
            SELECT va.task_id,t.run_id,t.document_id,t.department_id,er.schema_version_id,
                   COALESCE(dt.name,'unknown') AS document_type,
                   COALESCE(NULLIF(d.language,''),'unknown') AS language,
                   COALESCE(pj.provider,'unknown') AS model_provider,
                   COALESCE(pj.model_name,'unknown') AS model_name,
                   COALESCE(pj.model_version,'unknown') AS model_version,
                   COALESCE(pj.prompt_version,'unknown') AS prompt_version,
                   COALESCE(pj.contract_version,'unknown') AS contract_version
            FROM verification_approvals va
            JOIN verification_tasks t ON t.id=va.task_id
            JOIN extraction_runs er ON er.id=t.run_id
            JOIN processing_jobs pj ON pj.id=er.job_id
            JOIN documents d ON d.id=t.document_id
            JOIN villages v ON v.id=d.village_id
            JOIN tehsils te ON te.id=v.tehsil_id
            JOIN districts di ON di.id=te.district_id
            LEFT JOIN document_schema_versions sv ON sv.id=t.schema_version_id
            LEFT JOIN document_types dt ON dt.id=sv.type_id
            WHERE t.department_id=${actor.departmentId}
              AND di.jurisdiction_id IN (${scopedIds(actor)})
              AND va.created_at >= ${data.fromDate}::date
              AND va.created_at < (${data.toDate}::date + interval '1 day')
          ), latest_decisions AS (
            SELECT DISTINCT ON (task_id,field_key) task_id,field_key,decision,value
            FROM verification_field_decisions
            ORDER BY task_id,field_key,created_at DESC,id DESC
          )
          INSERT INTO feedback_examples(
            task_id,run_id,document_id,department_id,schema_version_id,document_type,language,
            field_key,field_type,source_value,prediction,truth,truth_available,confidence,
            was_corrected,evidence,model_provider,model_name,model_version,prompt_version,contract_version
          )
          SELECT c.task_id,c.run_id,c.document_id,c.department_id,c.schema_version_id,
                 c.document_type,c.language,ef.field_key,ef.field_type,ef.source_value,
                 CASE WHEN ef.normalized_value IS NULL OR jsonb_typeof(ef.normalized_value)='null'
                      THEN NULL ELSE ef.normalized_value END,
                 CASE WHEN vd.value IS NULL OR jsonb_typeof(vd.value)='null'
                      THEN NULL ELSE vd.value END,
                 vd.value IS NOT NULL AND jsonb_typeof(vd.value) <> 'null',ef.confidence,
                 vd.decision='ACCEPT_CORRECTION',ef.evidence,
                 c.model_provider,c.model_name,c.model_version,c.prompt_version,c.contract_version
          FROM candidates c
          JOIN extraction_fields ef ON ef.run_id=c.run_id
          JOIN latest_decisions vd ON vd.task_id=c.task_id AND vd.field_key=ef.field_key
          ON CONFLICT(task_id,field_key) DO NOTHING`,
    );
    const available = await tx.execute(
      sql`SELECT count(*)::int AS total
          FROM feedback_examples fe
          JOIN verification_approvals va ON va.task_id=fe.task_id
          JOIN verification_tasks t ON t.id=fe.task_id
          JOIN documents d ON d.id=fe.document_id
          JOIN villages v ON v.id=d.village_id
          JOIN tehsils te ON te.id=v.tehsil_id
          JOIN districts di ON di.id=te.district_id
          WHERE fe.department_id=${actor.departmentId}
            AND di.jurisdiction_id IN (${scopedIds(actor)})
            AND va.created_at >= ${data.fromDate}::date
            AND va.created_at < (${data.toDate}::date + interval '1 day')`,
    );
    const itemCount = Number(
      (available.rows[0] as { total: number }).total,
    );
    if (!itemCount)
      throw new AppError(
        422,
        "NO_APPROVED_EXAMPLES",
        "No approved prediction/truth pairs were found for this range and scope.",
      );
    const inserted = await tx.execute(
      sql`INSERT INTO feedback_datasets(department_id,version,name,from_date,to_date,created_by)
          SELECT ${actor.departmentId},COALESCE(max(version),0)+1,${data.name},
                 ${data.fromDate}::date,${data.toDate}::date,${actor.id}
          FROM feedback_datasets WHERE department_id=${actor.departmentId}
          RETURNING id,version`,
    );
    const dataset = inserted.rows[0] as { id: string; version: number };
    await tx.execute(
      sql`INSERT INTO feedback_dataset_items(dataset_id,example_id)
          SELECT ${dataset.id},fe.id
          FROM feedback_examples fe
          JOIN verification_approvals va ON va.task_id=fe.task_id
          JOIN verification_tasks t ON t.id=fe.task_id
          JOIN documents d ON d.id=fe.document_id
          JOIN villages v ON v.id=d.village_id
          JOIN tehsils te ON te.id=v.tehsil_id
          JOIN districts di ON di.id=te.district_id
          WHERE fe.department_id=${actor.departmentId}
            AND di.jurisdiction_id IN (${scopedIds(actor)})
            AND va.created_at >= ${data.fromDate}::date
            AND va.created_at < (${data.toDate}::date + interval '1 day')
          ON CONFLICT DO NOTHING`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "feedback.dataset_created",
      entityId: dataset.id,
      requestId,
      details: {
        version: dataset.version,
        fromDate: data.fromDate,
        toDate: data.toDate,
        itemCount,
      },
    });
    return {
      id: dataset.id,
      status: "PENDING_REVIEW",
      itemCount,
    };
  });
}

export async function reviewFeedbackDataset(
  token: string | undefined,
  datasetId: string,
  input: unknown,
  requestId: string,
): Promise<FeedbackDatasetMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "feedback.manage");
  z.uuid().parse(datasetId);
  const data = reviewFeedbackDatasetSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "feedback.manage");
    await requireScopedDataset(actor, datasetId, tx, {
      lock: true,
      expectedStatus: "PENDING_REVIEW",
    });
    await tx.execute(
      sql`UPDATE feedback_datasets
          SET status=${data.decision},review_reason=${data.reason},reviewed_by=${actor.id},reviewed_at=now()
          WHERE id=${datasetId} AND status='PENDING_REVIEW'`,
    );
    const count = await tx.execute(
      sql`SELECT count(*)::int AS total FROM feedback_dataset_items WHERE dataset_id=${datasetId}`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: `feedback.dataset_${data.decision.toLowerCase()}`,
      entityId: datasetId,
      requestId,
      details: { reason: data.reason },
    });
    return {
      id: datasetId,
      status: data.decision,
      itemCount: Number((count.rows[0] as { total: number }).total),
    };
  });
}

async function segmentMetrics(
  tx: QueryExecutor,
  datasetId: string,
  modelVersion: string,
  column: "document_type" | "language" | "field_key",
) {
  const rows = await tx.execute(
    sql`SELECT fe.${sql.raw(column)} AS label,count(*)::int AS examples,
          CAST(count(*) FILTER (WHERE fe.truth_available) AS int) AS "evaluatedFields",
          CAST(count(*) FILTER (WHERE fe.truth_available AND fe.prediction IS NOT DISTINCT FROM fe.truth) AS int) AS "correctFields"
        FROM feedback_dataset_items i
        JOIN feedback_examples fe ON fe.id=i.example_id
        WHERE i.dataset_id=${datasetId} AND fe.model_version=${modelVersion}
        GROUP BY fe.${sql.raw(column)}
        ORDER BY fe.${sql.raw(column)}`,
  );
  return rows.rows.map((row) => {
    const item = row as Record<string, unknown>;
    const evaluated = Number(item.evaluatedFields);
    const correct = Number(item.correctFields);
    return {
      label: String(item.label),
      examples: Number(item.examples),
      evaluatedFields: evaluated,
      correctFields: correct,
      accuracy: evaluated ? correct / evaluated : null,
    };
  });
}

export async function createFeedbackEvaluation(
  token: string | undefined,
  input: unknown,
  requestId: string,
): Promise<{ id: string; datasetId: string; modelVersion: string }> {
  const actor = await requireActor(token);
  requirePermission(actor, "feedback.manage");
  const data = createFeedbackEvaluationSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "feedback.manage");
    await requireScopedDataset(actor, data.datasetId, tx, {
      lock: true,
      expectedStatus: "APPROVED",
    });
    const model = await tx.execute(
      sql`SELECT count(*)::int AS total
          FROM feedback_dataset_items i
          JOIN feedback_examples fe ON fe.id=i.example_id
          WHERE i.dataset_id=${data.datasetId} AND fe.model_version=${data.modelVersion}`,
    );
    if (!Number((model.rows[0] as { total: number }).total))
      throw new AppError(
        422,
        "MODEL_NOT_IN_DATASET",
        "The selected model version is not represented in this dataset.",
      );
    const base = await tx.execute(
      sql`SELECT count(*)::int AS "totalExamples",
            CAST(count(*) FILTER (WHERE fe.truth_available) AS int) AS "evaluatedFields",
            CAST(count(*) FILTER (WHERE fe.truth_available AND fe.prediction IS NOT DISTINCT FROM fe.truth) AS int) AS "correctFields",
            CAST(count(*) FILTER (WHERE fe.truth_available AND (fe.prediction IS NULL OR jsonb_typeof(fe.prediction)='null')) AS int) AS "missingPredictionFields",
            CAST(count(*) FILTER (WHERE fe.was_corrected) AS int) AS "correctedFields",
            avg(fe.confidence) AS "averageConfidence"
          FROM feedback_dataset_items i
          JOIN feedback_examples fe ON fe.id=i.example_id
          WHERE i.dataset_id=${data.datasetId} AND fe.model_version=${data.modelVersion}`,
    );
    const values = base.rows[0] as Record<string, unknown>;
    const evaluated = Number(values.evaluatedFields);
    const correct = Number(values.correctFields);
    const total = Number(values.totalExamples);
    const corrected = Number(values.correctedFields);
    const computed: FeedbackEvaluationMetrics = {
      totalExamples: total,
      evaluatedFields: evaluated,
      correctFields: correct,
      incorrectFields: evaluated - correct,
      missingPredictionFields: Number(values.missingPredictionFields),
      accuracy: evaluated ? correct / evaluated : null,
      correctedFields: corrected,
      correctionRate: total ? corrected / total : null,
      averageConfidence:
        values.averageConfidence === null || values.averageConfidence === undefined
          ? null
          : Number(values.averageConfidence),
      byDocumentType: await segmentMetrics(
        tx,
        data.datasetId,
        data.modelVersion,
        "document_type",
      ),
      byLanguage: await segmentMetrics(
        tx,
        data.datasetId,
        data.modelVersion,
        "language",
      ),
      byField: await segmentMetrics(
        tx,
        data.datasetId,
        data.modelVersion,
        "field_key",
      ),
    };
    const inserted = await tx.execute(
      sql`INSERT INTO evaluation_runs(dataset_id,department_id,model_version,metrics,evaluated_fields,correct_fields,created_by)
          VALUES(${data.datasetId},${actor.departmentId},${data.modelVersion},${JSON.stringify(computed)}::jsonb,
                 ${computed.evaluatedFields},${computed.correctFields},${actor.id})
          ON CONFLICT(dataset_id,model_version) DO NOTHING RETURNING id`,
    );
    let evaluationId: string;
    if (inserted.rows.length) {
      evaluationId = String((inserted.rows[0] as { id: string }).id);
      await appendAudit(tx, {
        actorId: actor.id,
        departmentId: actor.departmentId,
        action: "feedback.evaluation_created",
        entityId: evaluationId,
        requestId,
        details: {
          datasetId: data.datasetId,
          modelVersion: data.modelVersion,
          evaluatedFields: computed.evaluatedFields,
          accuracy: computed.accuracy,
        },
      });
    } else {
      const existing = await tx.execute(
        sql`SELECT id FROM evaluation_runs
            WHERE dataset_id=${data.datasetId} AND model_version=${data.modelVersion}`,
      );
      evaluationId = String((existing.rows[0] as { id: string }).id);
    }
    return {
      id: evaluationId,
      datasetId: data.datasetId,
      modelVersion: data.modelVersion,
    };
  });
}

export async function listFeedbackEvaluations(
  token: string | undefined,
): Promise<FeedbackEvaluationsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "feedback.read");
  const rows = await getDb().execute(
    sql`SELECT e.id,e.dataset_id AS "datasetId",fd.name AS "datasetName",fd.version AS "datasetVersion",
               e.model_version AS "modelVersion",e.metrics,e.evaluated_fields AS "evaluatedFields",
               e.correct_fields AS "correctFields",e.created_at AS "createdAt"
        FROM evaluation_runs e
        JOIN feedback_datasets fd ON fd.id=e.dataset_id
        WHERE e.department_id=${actor.departmentId} AND ${scopedDatasetGuard(actor)}
        ORDER BY e.created_at DESC,e.id`,
  );
  return {
    items: rows.rows.map((row) =>
      evaluationSummary(row as Record<string, unknown>),
    ),
  };
}

export async function exportFeedbackDataset(
  token: string | undefined,
  datasetId: string,
  requestId: string,
): Promise<FeedbackExportResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "feedback.export");
  z.uuid().parse(datasetId);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "feedback.export");
    const dataset = await requireScopedDataset(actor, datasetId, tx, {
      lock: true,
      expectedStatus: "APPROVED",
    });
    const existing = await tx.execute(
      sql`SELECT id,payload,payload_sha256 AS "payloadSha256"
          FROM feedback_export_runs WHERE dataset_id=${datasetId}`,
    );
    if (existing.rows.length) {
      const row = existing.rows[0] as Record<string, unknown>;
      await appendAudit(tx, {
        actorId: actor.id,
        departmentId: actor.departmentId,
        action: "feedback.export_retrieved",
        entityId: String(row.id),
        requestId,
        details: { datasetId, automaticRetraining: false },
      });
      return {
        id: String(row.id),
        payloadSha256: String(row.payloadSha256),
        payload: row.payload as FeedbackExportPayload,
      };
    }
    const examples = await tx.execute(
      sql`SELECT fe.task_id AS "taskId",fe.document_id AS "documentId",fe.document_type AS "documentType",
                 fe.language,fe.field_key AS "fieldKey",fe.field_type AS "fieldType",fe.prediction,fe.truth,
                 fe.confidence,fe.was_corrected AS "wasCorrected",fe.evidence,fe.model_provider AS "modelProvider",
                 fe.model_name AS "modelName",fe.model_version AS "modelVersion",fe.prompt_version AS "promptVersion",
                 fe.contract_version AS "contractVersion"
          FROM feedback_dataset_items i
          JOIN feedback_examples fe ON fe.id=i.example_id
          WHERE i.dataset_id=${datasetId}
          ORDER BY fe.created_at,fe.id`,
    );
    const evaluations = await tx.execute(
      sql`SELECT id,model_version AS "modelVersion",metrics
          FROM evaluation_runs WHERE dataset_id=${datasetId} ORDER BY model_version`,
    );
    const payload: FeedbackExportPayload = {
      format: "SIH26018_FEEDBACK_DATASET_V1",
      dataset: {
        id: datasetId,
        version: Number(dataset.version),
        name: String(dataset.name),
        approvedAt: iso(dataset.reviewedAt),
      },
      examples: examples.rows.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          taskId: String(item.taskId),
          documentId: String(item.documentId),
          documentType: String(item.documentType),
          language: String(item.language),
          fieldKey: String(item.fieldKey),
          fieldType: String(item.fieldType),
          prediction: item.prediction,
          truth: item.truth,
          confidence:
            item.confidence === null || item.confidence === undefined
              ? null
              : Number(item.confidence),
          wasCorrected: Boolean(item.wasCorrected),
          evidence: (item.evidence ?? []) as unknown[],
          modelProvider: String(item.modelProvider),
          modelName: String(item.modelName),
          modelVersion: String(item.modelVersion),
          promptVersion: String(item.promptVersion),
          contractVersion: String(item.contractVersion),
        };
      }),
      evaluations: evaluations.rows.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          id: String(item.id),
          modelVersion: String(item.modelVersion),
          metrics: metrics(item.metrics),
        };
      }),
      automaticRetraining: false,
    };
    const payloadSha256 = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
    const inserted = await tx.execute(
      sql`INSERT INTO feedback_export_runs(dataset_id,department_id,payload,payload_sha256,exported_by)
          VALUES(${datasetId},${actor.departmentId},${JSON.stringify(payload)}::jsonb,
                 ${payloadSha256},${actor.id})
          RETURNING id`,
    );
    const exportId = String((inserted.rows[0] as { id: string }).id);
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "feedback.dataset_exported",
      entityId: exportId,
      requestId,
      details: {
        datasetId,
        payloadSha256,
        exampleCount: payload.examples.length,
        automaticRetraining: false,
      },
    });
    return { id: exportId, payloadSha256, payload };
  });
}
