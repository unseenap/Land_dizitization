import { z } from "zod";

export const integrationAdapterSchema = z.enum([
  "LRMS",
  "DILRMP",
  "GOVERNMENT_DATABASE",
]);

export const integrationModeSchema = z.enum(["MOCK", "LIVE"]);

export const integrationMappingSchema = z
  .object({
    fieldKeys: z
      .array(z.string().regex(/^[a-z0-9_]+$/, "Use lowercase field keys."))
      .min(1)
      .max(100)
      .refine((value) => new Set(value).size === value.length, {
        message: "Field keys must be unique.",
      }),
    includeParcelLinks: z.boolean().default(true),
    includeSourceDocumentId: z.boolean().default(true),
  })
  .strict();

export const createIntegrationSchema = z
  .object({
    adapter: integrationAdapterSchema,
    name: z.string().trim().min(3).max(100),
    mode: integrationModeSchema,
    contractVersion: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9.-]{1,39}$/),
    mappingVersion: z.number().int().min(1).max(100000),
    mapping: integrationMappingSchema,
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const createIntegrationExportSchema = z
  .object({
    recordId: z.uuid(),
    recordVersionId: z.uuid(),
  })
  .strict();

export const retryIntegrationExportSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const integrationRunFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();

export type IntegrationAdapter = z.infer<typeof integrationAdapterSchema>;
export type IntegrationMode = z.infer<typeof integrationModeSchema>;
export type IntegrationMapping = z.infer<typeof integrationMappingSchema>;

export type IntegrationSummary = {
  id: string;
  adapter: IntegrationAdapter;
  name: string;
  mode: IntegrationMode;
  contractVersion: string;
  mappingVersion: number;
  mapping: IntegrationMapping;
  active: boolean;
  notes: string | null;
  createdAt: string;
};

export type IntegrationExportAcknowledgement = {
  acknowledgementId: string;
  is_mock: true;
  adapter: IntegrationAdapter;
  contract_version: string;
  mapping_version: number;
  idempotency_key: string;
  destination_reference: string;
  message: string;
};

export type IntegrationExportRun = {
  id: string;
  integrationId: string;
  integrationName: string;
  adapter: IntegrationAdapter;
  mode: IntegrationMode;
  recordId: string;
  recordDisplayId: string;
  recordVersionId: string;
  recordVersion: number;
  status: "QUEUED" | "DELIVERING" | "DELIVERED" | "FAILED";
  payloadSha256: string | null;
  acknowledgement: IntegrationExportAcknowledgement | null;
  attempt: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  createdAt: string;
  acknowledgedAt: string | null;
};

export type IntegrationsResult = {
  items: IntegrationSummary[];
};

export type IntegrationRunsResult = {
  items: IntegrationExportRun[];
  page: number;
  page_size: number;
  total: number;
};

export type IntegrationMutationResult = {
  id: string;
  status: IntegrationExportRun["status"];
};
