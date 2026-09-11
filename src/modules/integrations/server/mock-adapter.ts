import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { IntegrationExportContext } from "./service";
import { integrationAdapterSchema } from "../contracts";

export type IntegrationExportEnvelope = {
  contract_version: string;
  mapping_version: number;
  record: {
    id: string;
    version_id: string;
    version: number;
    display_id: string;
  };
  source_document_id?: string;
  jurisdiction: {
    village: string;
    tehsil: string;
    district: string;
    state: string;
  };
  document_type: string | null;
  configured_fields: Array<{
    field_key: string;
    value: unknown;
    confidence: number | null;
  }>;
  approval: {
    approved_at: string;
    approved_by: string | null;
    reason: string;
  };
  parcel_links?: Array<{
    parcel_id: string;
    parcel_number: string;
    source_crs: string;
    target_crs: string;
  }>;
  provenance: {
    source_sha256: string;
    artifact_sha256: string;
    source: string;
    synthetic: true;
  };
  is_mock: true;
  idempotency_key: string;
};

export const mockAcknowledgementSchema = z
  .object({
    acknowledgementId: z.string().regex(/^[a-f0-9]{64}$/),
    is_mock: z.literal(true),
    adapter: integrationAdapterSchema,
    contract_version: z.string().min(1).max(100),
    mapping_version: z.number().int().positive(),
    idempotency_key: z.string().min(1),
    destination_reference: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

export type MockAcknowledgement = z.infer<typeof mockAcknowledgementSchema>;

export function buildIntegrationEnvelope(
  context: IntegrationExportContext,
): IntegrationExportEnvelope {
  const snapshot = context.record.snapshot as {
    fields?: Array<{
      fieldKey: string;
      normalizedValue: unknown;
      confidence: number | null;
    }>;
    approvalReason?: string;
  };
  const fields = new Map(
    (snapshot.fields ?? []).map((field) => [
      field.fieldKey,
      {
        field_key: field.fieldKey,
        value: field.normalizedValue,
        confidence:
          field.confidence === null || field.confidence === undefined
            ? null
            : Number(field.confidence),
      },
    ]),
  );
  return {
    contract_version: context.integration.contractVersion,
    mapping_version: context.integration.mappingVersion,
    record: {
      id: context.run.recordId,
      version_id: context.run.recordVersionId,
      version: context.record.version,
      display_id: context.record.displayId,
    },
    ...(context.integration.mapping.includeSourceDocumentId
      ? { source_document_id: context.record.documentId }
      : {}),
    jurisdiction: {
      village: context.record.village,
      tehsil: context.record.tehsil,
      district: context.record.district,
      state: context.record.state,
    },
    document_type: context.record.documentType,
    configured_fields: context.integration.mapping.fieldKeys.flatMap((key) => {
      const field = fields.get(key);
      return field ? [field] : [];
    }),
    approval: {
      approved_at: context.record.approvedAt,
      approved_by: context.record.approvedBy,
      reason: snapshot.approvalReason ?? "Human approval recorded in this workspace",
    },
    ...(context.integration.mapping.includeParcelLinks
      ? {
          parcel_links: context.parcelLinks.map((link) => ({
            parcel_id: link.parcelId,
            parcel_number: link.parcelNumber,
            source_crs: link.sourceCrs,
            target_crs: link.targetCrs,
          })),
        }
      : {}),
    provenance: {
      source_sha256: context.record.sourceSha256,
      artifact_sha256: context.record.artifactSha256,
      source: "Human-approved land record version",
      synthetic: true,
    },
    is_mock: true,
    idempotency_key: context.run.idempotencyKey,
  };
}

export function deliverMockIntegration(
  context: IntegrationExportContext,
  envelope: IntegrationExportEnvelope,
): MockAcknowledgement {
  const acknowledgementId = createHash("sha256")
    .update(JSON.stringify(envelope))
    .digest("hex");
  return {
    acknowledgementId,
    is_mock: true,
    adapter: context.integration.adapter,
    contract_version: context.integration.contractVersion,
    mapping_version: context.integration.mappingVersion,
    idempotency_key: context.run.idempotencyKey,
    destination_reference: `mock-${context.integration.adapter.toLowerCase()}-${acknowledgementId.slice(0, 16)}`,
    message:
      "Mock acknowledgement only. No real government system was contacted.",
  };
}
