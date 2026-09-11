import { z } from "zod";

export const parcelFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    q: z.string().trim().max(100).default(""),
    villageId: z.uuid().optional(),
    geometry: z.enum(["all", "present", "missing"]).default("all"),
  })
  .strict();

export const recordLinkProposalSchema = z
  .object({
    parcelId: z.uuid(),
    recordId: z.uuid(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const recordLinkReviewSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export type GeoJsonGeometry = {
  type: "Point" | "Polygon";
  coordinates: unknown;
};

export type GisParcel = {
  id: string;
  parcelNumber: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  sourceName: string;
  sourceReference: string;
  sourceCrs: string;
  targetCrs: string;
  geometry: GeoJsonGeometry | null;
  missingGeometryReason: string | null;
  provenance: Record<string, unknown>;
  synthetic: boolean;
  createdAt: string;
};

export type GisRecordLink = {
  id: string;
  parcelId: string;
  parcelNumber: string;
  recordId: string;
  recordDisplayId: string;
  recordVersionId: string;
  recordVersion: number;
  status: "PROPOSED" | "APPROVED" | "REJECTED";
  proposalReason: string;
  reviewReason: string | null;
  proposedBy: string;
  reviewedBy: string | null;
  proposedAt: string;
  reviewedAt: string | null;
};

export type GisParcelsResult = {
  items: GisParcel[];
  links: GisRecordLink[];
  page: number;
  page_size: number;
  total: number;
};

export type GisLinkMutationResult = {
  id: string;
  status: "PROPOSED" | "APPROVED" | "REJECTED";
};
