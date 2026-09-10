import { z } from "zod";

export const processingStatus = [
  "QUEUED",
  "SUBMITTING",
  "SUBMITTED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "RESULT_REJECTED",
] as const;

export const processingStage = [
  "QUEUED",
  "SUBMITTING",
  "POLLING",
  "INGESTING",
  "COMPLETED",
  "FAILED",
] as const;

export const modelTask = z.enum([
  "preprocess",
  "ocr",
  "layout",
  "classify",
  "extract",
]);

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const bbox = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .refine(
    ([xmin, ymin, xmax, ymax]) =>
      xmin >= 0 && ymin >= 0 && xmax <= 1 && ymax <= 1 && xmin <= xmax && ymin <= ymax,
    "Bounding boxes must be normalized to the original page.",
  );

export const modelRequestSchema = z
  .object({
    contract_version: z.string().min(1).max(32),
    request_id: z.uuid(),
    document_id: z.uuid(),
    document_revision: z.number().int().positive(),
    input: z.object({
      download_url: z.string().min(1).max(4096),
      sha256,
      mime_type: z.string().min(1).max(100),
    }),
    tasks: z.array(modelTask).min(1).max(5),
    language_hints: z.array(z.string().min(1).max(32)).max(20),
    schema: z.object({
      id: z.string().min(1).max(120),
      version: z.number().int().positive(),
      json_schema: z.record(z.string(), z.unknown()),
    }),
    requested_model_version: z.string().max(120).nullable(),
  })
  .strict();

export const modelCapabilitiesSchema = z
  .object({
    contract_versions: z.array(z.string().min(1).max(32)).min(1).max(20),
    formats: z.array(z.string().min(1).max(100)).max(50),
    max_bytes: z.number().int().positive().nullable(),
    max_pages: z.number().int().positive().nullable(),
    languages: z.array(z.string().min(1).max(32)).max(200),
    handwriting: z.boolean(),
    layout: z.boolean(),
    async: z.boolean(),
    model_versions: z.array(z.string().min(1).max(120)).max(100),
  })
  .strict();

export const modelSubmitResponseSchema = z
  .object({
    contract_version: z.string().min(1).max(32),
    request_id: z.uuid(),
    job_id: z.string().min(1).max(240),
    status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED"]),
  })
  .strict();

export const modelJobStatusSchema = z
  .object({
    contract_version: z.string().min(1).max(32),
    request_id: z.uuid(),
    job_id: z.string().min(1).max(240),
    status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
    stage: z.string().min(1).max(120).nullable(),
    started_at: z.string().datetime().nullable(),
    completed_at: z.string().datetime().nullable(),
    error: z
      .object({
        code: z.string().min(1).max(100),
        message: z.string().min(1).max(1000),
        retryable: z.boolean(),
        request_id: z.uuid(),
      })
      .nullable(),
  })
  .strict();

const evidence = z
  .object({
    page: z.number().int().positive(),
    block_ids: z.array(z.string().min(1).max(120)).max(1000),
    bbox,
    source_text: z.string().max(10000),
  })
  .strict();

const field = z
  .object({
    value: z.unknown().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    missing_reason: z.string().max(500).nullable(),
    evidence: z.array(evidence).max(1000),
  })
  .strict();

const block = z
  .object({
    id: z.string().min(1).max(120),
    text: z.string().max(10000),
    bbox,
    confidence: z.number().min(0).max(1).nullable(),
  })
  .strict();

export const modelResultSchema = z
  .object({
    contract_version: z.string().min(1).max(32),
    request_id: z.uuid(),
    job_id: z.string().min(1).max(240),
    document_id: z.uuid(),
    document_revision: z.number().int().positive(),
    input_sha256: sha256,
    schema_id: z.string().min(1).max(120),
    schema_version: z.number().int().positive(),
    model: z
      .object({
        provider: z.string().min(1).max(120),
        name: z.string().min(1).max(120),
        version: z.string().min(1).max(120),
        prompt_version: z.string().min(1).max(120),
      })
      .strict(),
    languages: z.array(z.string().min(1).max(32)).max(20),
    classification: z
      .object({
        document_type: z.string().min(1).max(120),
        confidence: z.number().min(0).max(1).nullable(),
      })
      .nullable(),
    pages: z
      .array(
        z
          .object({
            page: z.number().int().positive(),
            width: z.number().positive(),
            height: z.number().positive(),
            ocr_text: z.string().max(200000),
            blocks: z.array(block).max(10000),
          })
          .strict(),
      )
      .max(100),
    fields: z.record(z.string().min(1).max(240), field),
    warnings: z.array(z.string().max(1000)).max(200),
    timing: z
      .object({ processing_ms: z.number().int().nonnegative().nullable() })
      .strict(),
  })
  .strict();

export const modelErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1).max(100),
        message: z.string().min(1).max(1000),
        retryable: z.boolean(),
        request_id: z.uuid(),
      })
      .strict(),
  })
  .strict();

export const processOptionsSchema = z
  .object({
    tasks: z.array(modelTask).min(1).max(5).default(["ocr"]),
    languageHints: z.array(z.string().min(1).max(32)).max(20).default([]),
    requestedModelVersion: z.string().max(120).nullable().default(null),
  })
  .strict();

export type ProcessingStatus = (typeof processingStatus)[number];
export type ProcessingJobSummary = {
  id: string;
  documentId: string;
  documentRevision: number;
  inputSha256: string;
  status: ProcessingStatus;
  stage: string;
  attempt: number;
  maxAttempts: number;
  remoteJobId: string | null;
  provider: string | null;
  modelName: string | null;
  modelVersion: string | null;
  promptVersion: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ModelRequest = z.infer<typeof modelRequestSchema>;
export type ModelResult = z.infer<typeof modelResultSchema>;
export type ModelJobStatus = z.infer<typeof modelJobStatusSchema>;
