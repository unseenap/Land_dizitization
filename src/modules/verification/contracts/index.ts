import { z } from "zod";

export const verificationTaskStatus = [
  "PENDING_REVIEW",
  "RETURNED_FOR_EDIT",
  "CORRECTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
] as const;

export const fieldDecisionInputSchema = z
  .object({
    fieldKey: z.string().min(1).max(50),
    decision: z.enum(["ACCEPT_MODEL", "ACCEPT_CORRECTION"]),
    correctedValue: z.unknown().optional(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const reviewSubmitSchema = z
  .object({
    expectedStatus: z.enum(["PENDING_REVIEW", "CORRECTED"]),
    action: z.enum(["SUBMIT", "RETURN", "REJECT"]),
    decisions: z.array(fieldDecisionInputSchema).max(50),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const correctionSubmitSchema = z
  .object({
    expectedStatus: z.literal("RETURNED_FOR_EDIT"),
    corrections: z
      .array(
        z
          .object({
            fieldKey: z.string().min(1).max(50),
            value: z.unknown(),
            reason: z.string().trim().min(3).max(500),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const approvalSubmitSchema = z
  .object({
    expectedStatus: z.enum(verificationTaskStatus),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export type VerificationTaskStatus = (typeof verificationTaskStatus)[number];

export type VerificationField = {
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean";
  required: boolean;
  critical: boolean;
  sourceValue: unknown;
  normalizedValue: unknown;
  confidence: number | null;
  missingReason: string | null;
  evidence: Array<{
    page: number;
    blockIds: string[];
    bbox: number[];
    sourceText: string;
  }>;
};

export type VerificationFinding = {
  fieldKey: string | null;
  code: string;
  status: "PASS" | "WARNING" | "FAIL" | "NOT_CHECKED";
  severity: "INFO" | "WARNING" | "BLOCKING";
  message: string;
  details: Record<string, unknown>;
  source: string;
};

export type VerificationFieldDecision = {
  fieldKey: string;
  decision: "ACCEPT_MODEL" | "ACCEPT_CORRECTION";
  value: unknown;
  reason: string;
  decidedBy: string;
  createdAt: string;
};

export type VerificationFieldCorrection = {
  fieldKey: string;
  value: unknown;
  reason: string;
  correctedBy: string;
  createdAt: string;
};

export type VerificationHistoryEntry = {
  fromStatus: VerificationTaskStatus | null;
  toStatus: VerificationTaskStatus;
  action: string;
  reason: string;
  actorId: string | null;
  createdAt: string;
};

export type VerificationTaskView = {
  task: {
    id: string;
    runId: string;
    documentId: string;
    documentRevision: number;
    status: VerificationTaskStatus;
    returnedReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  document: {
    displayId: string;
    title: string;
    mimeType: string;
    sha256: string;
    state: string;
    district: string;
    tehsil: string;
    village: string;
    typeName: string | null;
    schemaVersion: number | null;
  };
  run: {
    status: "VALIDATED" | "BLOCKED";
    blockerCount: number;
    duplicateCount: number;
    artifactSha256: string;
  };
  fields: VerificationField[];
  findings: VerificationFinding[];
  duplicates: Array<{
    id: string;
    candidateDocumentId: string;
    candidateDisplayId: string;
    candidateTitle: string;
    score: number;
    status: "PENDING" | "RESOLVED_NOT_DUPLICATE" | "RESOLVED_DUPLICATE";
    resolutionReason: string | null;
  }>;
  decisions: VerificationFieldDecision[];
  corrections: VerificationFieldCorrection[];
  history: VerificationHistoryEntry[];
  approval: {
    reason: string;
    approvedBy: string;
    createdAt: string;
    snapshot: Record<string, unknown>;
  } | null;
};
