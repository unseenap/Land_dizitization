import { z } from "zod";
const text = z.string().trim();
export const uploadMetadataSchema = z
  .object({
    title: text.min(2).max(200),
    villageId: z.uuid(),
    schemaVersionId: z.uuid().nullable(),
    language: text.max(50).default(""),
    reference: text.max(100).default(""),
    notes: text.max(2000).default(""),
  })
  .strict();
export const metadataEditSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    title: text.min(2).max(200),
    language: text.max(50),
    reference: text.max(100),
    notes: text.max(2000),
    reason: text.min(3).max(500),
  })
  .strict();
export const documentFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: text.max(100).default(""),
  villageId: z.uuid().optional(),
  typeId: z.uuid().optional(),
});
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;
export type DocumentSummary = {
  id: string;
  displayId: string;
  title: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  pageCount: number;
  sha256: string;
  status: string;
  revision: number;
  language: string;
  reference: string;
  notes: string;
  uploaderId: string;
  createdAt: string;
  villageId: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  typeName: string | null;
  schemaVersion: number | null;
  schemaVersionId: string | null;
};
export type DocumentsResult = {
  items: DocumentSummary[];
  page: number;
  page_size: number;
  total: number;
};
