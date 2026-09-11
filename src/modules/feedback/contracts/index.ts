import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const createFeedbackDatasetSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    fromDate: dateString,
    toDate: dateString,
  })
  .strict()
  .refine((value) => value.fromDate <= value.toDate, {
    message: "The start date must be on or before the end date.",
  });

export const reviewFeedbackDatasetSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const createFeedbackEvaluationSchema = z
  .object({
    datasetId: z.uuid(),
    modelVersion: z.string().trim().min(1).max(120),
  })
  .strict();

export type FeedbackDatasetStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export type FeedbackModelVersionSummary = {
  modelVersion: string;
  modelProvider: string;
  modelName: string;
  examples: number;
};

export type FeedbackDatasetSummary = {
  id: string;
  version: number;
  name: string;
  fromDate: string;
  toDate: string;
  status: FeedbackDatasetStatus;
  itemCount: number;
  modelVersions: FeedbackModelVersionSummary[];
  evaluationCount: number;
  export: {
    id: string;
    payloadSha256: string;
    exportedAt: string;
  } | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewReason: string | null;
};

export type FeedbackSegmentMetric = {
  label: string;
  examples: number;
  evaluatedFields: number;
  correctFields: number;
  accuracy: number | null;
};

export type FeedbackEvaluationMetrics = {
  totalExamples: number;
  evaluatedFields: number;
  correctFields: number;
  incorrectFields: number;
  missingPredictionFields: number;
  accuracy: number | null;
  correctedFields: number;
  correctionRate: number | null;
  averageConfidence: number | null;
  byDocumentType: FeedbackSegmentMetric[];
  byLanguage: FeedbackSegmentMetric[];
  byField: FeedbackSegmentMetric[];
};

export type FeedbackEvaluationSummary = {
  id: string;
  datasetId: string;
  datasetName: string;
  datasetVersion: number;
  modelVersion: string;
  metrics: FeedbackEvaluationMetrics;
  evaluatedFields: number;
  correctFields: number;
  createdAt: string;
};

export type FeedbackDatasetsResult = {
  items: FeedbackDatasetSummary[];
};

export type FeedbackEvaluationsResult = {
  items: FeedbackEvaluationSummary[];
};

export type FeedbackDatasetMutationResult = {
  id: string;
  status: FeedbackDatasetStatus;
  itemCount: number;
};

export type FeedbackEvaluationMutationResult = {
  id: string;
  datasetId: string;
  modelVersion: string;
};

export type FeedbackExportPayload = {
  format: "SIH26018_FEEDBACK_DATASET_V1";
  dataset: {
    id: string;
    version: number;
    name: string;
    approvedAt: string;
  };
  examples: Array<{
    taskId: string;
    documentId: string;
    documentType: string;
    language: string;
    fieldKey: string;
    fieldType: string;
    prediction: unknown;
    truth: unknown;
    confidence: number | null;
    wasCorrected: boolean;
    evidence: unknown[];
    modelProvider: string;
    modelName: string;
    modelVersion: string;
    promptVersion: string;
    contractVersion: string;
  }>;
  evaluations: Array<{
    id: string;
    modelVersion: string;
    metrics: FeedbackEvaluationMetrics;
  }>;
  automaticRetraining: false;
};

export type FeedbackExportResult = {
  id: string;
  payloadSha256: string;
  payload: FeedbackExportPayload;
};
