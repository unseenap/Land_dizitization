import "server-only";
import { AppError } from "@/server/errors";
import { getConfig } from "@/server/config";
import { z } from "zod";
import {
  modelCapabilitiesSchema,
  modelJobStatusSchema,
  modelRequestSchema,
  modelResultSchema,
  modelSubmitResponseSchema,
  type ModelJobStatus,
  type ModelRequest,
  type ModelResult,
} from "../contracts";

export interface ModelClient {
  readonly provider: string;
  getCapabilities(): Promise<z.infer<typeof modelCapabilitiesSchema>>;
  submitJob(
    request: ModelRequest,
    idempotencyKey: string,
  ): Promise<{ requestId: string; jobId: string; status: string }>;
  getJob(jobId: string): Promise<ModelJobStatus>;
  getResult(jobId: string): Promise<ModelResult>;
  cancelJob(jobId: string): Promise<void>;
}

type ModelCapabilities = ReturnType<typeof modelCapabilitiesSchema.parse>;

async function parseResponse<T>(response: Response, parser: (value: unknown) => T) {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AppError(503, "MODEL_INVALID_RESPONSE", "The model returned invalid JSON.");
  }
  if (!response.ok) {
    const error = body as { error?: { code?: string; message?: string; retryable?: boolean } };
    throw new AppError(
      error.error?.retryable === false ? 422 : 503,
      error.error?.code ?? "MODEL_UNAVAILABLE",
      error.error?.message ?? "The model service is unavailable.",
    );
  }
  try {
    return parser(body);
  } catch {
    throw new AppError(503, "MODEL_INVALID_RESPONSE", "The model response failed contract validation.");
  }
}

class HttpModelClient implements ModelClient {
  readonly provider = "http";
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeout: number;

  constructor() {
    const config = getConfig();
    if (!config.MODEL_API_URL || !config.MODEL_API_TOKEN)
      throw new AppError(503, "MODEL_NOT_CONFIGURED", "The model service is not configured.");
    this.baseUrl = config.MODEL_API_URL.replace(/\/$/, "");
    this.token = config.MODEL_API_TOKEN;
    this.timeout = config.MODEL_API_TIMEOUT_MS;
  }

  private async request(path: string, init?: RequestInit) {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${this.token}`,
          accept: "application/json",
          ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(this.timeout),
        cache: "no-store",
      });
    } catch {
      throw new AppError(503, "MODEL_UNAVAILABLE", "The model service is unavailable.");
    }
  }

  async getCapabilities() {
    return parseResponse(await this.request("/v1/capabilities"), (body) =>
      modelCapabilitiesSchema.parse(body),
    );
  }

  async submitJob(request: ModelRequest, idempotencyKey: string) {
    modelRequestSchema.parse(request);
    const response = await parseResponse(
      await this.request("/v1/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(request),
      }),
      (body) => modelSubmitResponseSchema.parse(body),
    );
    return {
      requestId: response.request_id,
      jobId: response.job_id,
      status: response.status,
    };
  }

  async getJob(jobId: string) {
    return parseResponse(await this.request(`/v1/jobs/${encodeURIComponent(jobId)}`), (body) =>
      modelJobStatusSchema.parse(body),
    );
  }

  async getResult(jobId: string) {
    return parseResponse(
      await this.request(`/v1/jobs/${encodeURIComponent(jobId)}/result`),
      (body) => modelResultSchema.parse(body),
    );
  }

  async cancelJob(jobId: string) {
    const response = await this.request(`/v1/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
    });
    if (!response.ok && response.status !== 409)
      await parseResponse(response, (body) => body);
  }
}

type MockJob = { request: ModelRequest; status: ModelJobStatus["status"] };
const mockJobs = new Map<string, MockJob>();
let mockSequence = 0;

export class MockModelClient implements ModelClient {
  readonly provider = "mock";
  async getCapabilities(): Promise<ModelCapabilities> {
    return {
      contract_versions: ["1.0"],
      formats: ["application/pdf", "image/jpeg", "image/png", "image/tiff"],
      max_bytes: 25 * 1024 * 1024,
      max_pages: 100,
      languages: ["en", "hi"],
      handwriting: false,
      layout: false,
      async: true,
      model_versions: ["fixture-v1"],
    };
  }

  async submitJob(request: ModelRequest) {
    const existing = [...mockJobs.entries()].find(([, value]) => value.request.request_id === request.request_id);
    if (existing)
      return { requestId: request.request_id, jobId: existing[0], status: existing[1].status };
    const jobId = `mock-job-${++mockSequence}`;
    mockJobs.set(jobId, { request, status: "SUCCEEDED" });
    return { requestId: request.request_id, jobId, status: "SUCCEEDED" };
  }

  async getJob(jobId: string): Promise<ModelJobStatus> {
    const job = mockJobs.get(jobId);
    if (!job) throw new AppError(503, "MODEL_JOB_NOT_FOUND", "The model job was not found.");
    return {
      contract_version: "1.0",
      request_id: job.request.request_id,
      job_id: jobId,
      status: job.status,
      stage: "fixture",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      error: null,
    };
  }

  async getResult(jobId: string): Promise<ModelResult> {
    const job = mockJobs.get(jobId);
    if (!job) throw new AppError(503, "MODEL_JOB_NOT_FOUND", "The model job was not found.");
    return modelResultSchema.parse({
      contract_version: "1.0",
      request_id: job.request.request_id,
      job_id: jobId,
      document_id: job.request.document_id,
      document_revision: job.request.document_revision,
      input_sha256: job.request.input.sha256,
      schema_id: job.request.schema.id,
      schema_version: job.request.schema.version,
      model: {
        provider: "mock",
        name: "fixture",
        version: "fixture-v1",
        prompt_version: "none",
      },
      languages: [],
      classification: null,
      pages: [],
      fields: {},
      warnings: ["MOCK_RESULT_NO_INFERENCE"],
      timing: { processing_ms: 0 },
    });
  }

  async cancelJob(jobId: string) {
    mockJobs.delete(jobId);
  }
}

export function getModelClient(): ModelClient {
  return getConfig().MODEL_API_MODE === "http" ? new HttpModelClient() : new MockModelClient();
}
