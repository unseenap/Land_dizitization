import { z } from "zod";

export const duplicateResolutionSchema = z
  .object({
    decision: z.enum(["RESOLVED_NOT_DUPLICATE", "RESOLVED_DUPLICATE"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export type DuplicateSignalView = {
  code: string;
  label: string;
  matched: boolean;
  details: Record<string, unknown>;
};

export type DuplicateCandidateView = {
  id: string;
  candidateDocumentId: string;
  candidateDisplayId: string;
  candidateTitle: string;
  score: number;
  signals: DuplicateSignalView[];
  status: "PENDING" | "RESOLVED_NOT_DUPLICATE" | "RESOLVED_DUPLICATE";
  resolutionReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
};
