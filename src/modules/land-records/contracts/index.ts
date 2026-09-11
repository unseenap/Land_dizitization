import { z } from "zod";

export const recordFiltersSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    q: z.string().trim().max(100).default(""),
    villageId: z.uuid().optional(),
    typeId: z.uuid().optional(),
  })
  .strict();

export type LandRecordSummary = {
  id: string;
  versionId: string;
  displayId: string;
  documentId: string;
  documentDisplayId: string;
  documentTitle: string;
  version: number;
  ownerName: string | null;
  surveyNumber: string | null;
  khasraNumber: string | null;
  khataNumber: string | null;
  plotArea: number | null;
  areaUnit: string | null;
  landClassification: string | null;
  ownershipStatus: string | null;
  registrationNumber: string | null;
  registrationDate: string | null;
  isMutated: boolean;
  approvedAt: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  typeName: string | null;
};

export type LandRecordsResult = {
  items: LandRecordSummary[];
  page: number;
  page_size: number;
  total: number;
};

export type LandRecordOwner = {
  sequence: number;
  name: string;
  relationship: string | null;
  ownershipShare: number | null;
  details: Record<string, unknown>;
};

export type LandRecordMutation = {
  sequence: number;
  mutationNumber: string | null;
  mutationDate: string | null;
  details: Record<string, unknown>;
};

export type LandRecordRegistration = {
  sequence: number;
  registrationNumber: string | null;
  registrationDate: string | null;
  details: Record<string, unknown>;
};

export type ApprovedLandRecordField = {
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "date" | "boolean";
  value: unknown;
  confidence: number | null;
};

export type LandRecordDetail = LandRecordSummary & {
  taskId: string;
  sourceSha256: string;
  artifactSha256: string;
  approvalReason: string;
  owners: LandRecordOwner[];
  mutations: LandRecordMutation[];
  registration: LandRecordRegistration[];
  fields: ApprovedLandRecordField[];
};

export type LandRecordVersionSummary = Omit<
  LandRecordSummary,
  "id" | "displayId" | "documentId" | "documentDisplayId" | "documentTitle"
> & {
  versionId: string;
  taskId: string;
};

export type MaterializedRecord = {
  recordId: string;
  versionId: string;
  version: number;
};
