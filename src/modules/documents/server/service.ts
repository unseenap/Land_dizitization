import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { storage } from "@/server/storage";
import { AppError } from "@/server/errors";
import {
  requireActor,
  requirePermission,
  lockActor,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import {
  requireVillage,
  scopedIds,
} from "@/modules/master-data/server/service";
import type { Actor } from "@/modules/identity/contracts";
import {
  uploadMetadataSchema,
  metadataEditSchema,
  documentFiltersSchema,
  type DocumentSummary,
  type DocumentsResult,
} from "../contracts";
import { inspectDocument } from "./inspect";

const documentColumns = sql`d.id,d.display_id AS "displayId",d.title,d.original_name AS "originalName",d.mime_type AS "mimeType",d.byte_size AS "byteSize",d.page_count AS "pageCount",d.sha256,d.status,d.revision,d.language,d.reference,d.notes,d.uploader_id AS "uploaderId",d.created_at AS "createdAt",d.village_id AS "villageId",v.name AS village,t.name AS tehsil,di.name AS district,s.name AS state,dt.name AS "typeName",sv.version AS "schemaVersion",sv.id AS "schemaVersionId"`;
const joins = sql`FROM documents d JOIN villages v ON v.id=d.village_id JOIN tehsils t ON t.id=v.tehsil_id JOIN districts di ON di.id=t.district_id JOIN states s ON s.id=di.state_id LEFT JOIN document_schema_versions sv ON sv.id=d.schema_version_id LEFT JOIN document_types dt ON dt.id=sv.type_id`;
function visible(actor: Actor) {
  return sql`d.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}
function summary(row: Record<string, unknown>): DocumentSummary {
  return {
    ...row,
    createdAt: new Date(String(row.createdAt)).toISOString(),
  } as DocumentSummary;
}
export async function listDocuments(
  token: string | undefined,
  input: unknown = {},
): Promise<DocumentsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "documents.read");
  const filters = documentFiltersSchema.parse(input);
  const q = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = sql`${visible(actor)} AND (${filters.q}='' OR d.title ILIKE ${q} OR d.display_id ILIKE ${q} OR d.reference ILIKE ${q}) ${filters.villageId ? sql`AND d.village_id=${filters.villageId}` : sql``} ${filters.typeId ? sql`AND dt.id=${filters.typeId}` : sql``}`;
  const db = getDb();
  const rows = await db.execute(
    sql`SELECT ${documentColumns} ${joins} WHERE ${where} ORDER BY d.created_at DESC,d.id LIMIT 25 OFFSET ${(filters.page - 1) * 25}`,
  );
  const count = await db.execute(
    sql`SELECT count(*)::int AS total ${joins} WHERE ${where}`,
  );
  return {
    items: rows.rows.map(summary),
    page: filters.page,
    page_size: 25,
    total: Number(count.rows[0].total),
  };
}
export async function getDocument(
  token: string | undefined,
  id: string,
): Promise<DocumentSummary> {
  const actor = await requireActor(token);
  requirePermission(actor, "documents.read");
  z.uuid().parse(id);
  const result = await getDb().execute(
    sql`SELECT ${documentColumns} ${joins} WHERE d.id=${id} AND ${visible(actor)}`,
  );
  if (!result.rows.length)
    throw new AppError(404, "NOT_FOUND", "Document not found.");
  return summary(result.rows[0]);
}
export async function uploadDocument(
  token: string | undefined,
  file: { name: string; type: string; bytes: Buffer },
  input: unknown,
  uploadKey: string,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "documents.upload");
  z.uuid().parse(uploadKey);
  const data = uploadMetadataSchema.parse(input);
  if (file.name.length > 240 || /[\x00-\x1f\x7f/\\]/.test(file.name))
    throw new AppError(
      422,
      "INVALID_FILENAME",
      "Use a filename without paths or control characters.",
    );
  await requireVillage(getDb(), actor, data.villageId);
  const hash = createHash("sha256").update(file.bytes).digest("hex");
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ data, hash, name: file.name, mime: file.type }))
    .digest("hex");
  const existing = await getDb().execute(
    sql`SELECT id,request_hash FROM documents WHERE uploader_id=${actor.id} AND upload_key=${uploadKey}`,
  );
  if (existing.rows.length) {
    if (existing.rows[0].request_hash !== requestHash)
      throw new AppError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This upload key was used with different content.",
      );
    return {
      document: await getDocument(token, String(existing.rows[0].id)),
      reused: true,
    };
  }
  const rate = await getDb().execute(
    sql`INSERT INTO upload_limits(user_id,attempts,expires_at) VALUES(${actor.id},1,now()+interval '1 minute') ON CONFLICT(user_id) DO UPDATE SET attempts=CASE WHEN upload_limits.expires_at<now() THEN 1 ELSE upload_limits.attempts+1 END,expires_at=CASE WHEN upload_limits.expires_at<now() THEN now()+interval '1 minute' ELSE upload_limits.expires_at END RETURNING attempts`,
  );
  if (Number(rate.rows[0].attempts) > 30)
    throw new AppError(
      429,
      "UPLOAD_RATE_LIMITED",
      "Too many upload attempts. Retry in one minute.",
    );
  const inspection = await inspectDocument(file.name, file.bytes, file.type);
  const id = randomUUID();
  const objectKey = `${id}/original.bin`,
    previewKey = inspection.preview ? `${id}/preview.webp` : null;
  const written: string[] = [];
  try {
    await storage.put(objectKey, file.bytes);
    written.push(objectKey);
    if (previewKey) {
      await storage.put(previewKey, inspection.preview!);
      written.push(previewKey);
    }
    const result = await getDb().transaction(async (tx) => {
      await lockActor(tx, token, actor, "documents.upload");
      await requireVillage(tx, actor, data.villageId);
      const repeated = await tx.execute(
        sql`SELECT id,request_hash FROM documents WHERE uploader_id=${actor.id} AND upload_key=${uploadKey}`,
      );
      if (repeated.rows.length) {
        if (repeated.rows[0].request_hash !== requestHash)
          throw new AppError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "This upload key was used with different content.",
          );
        return { id: String(repeated.rows[0].id), reused: true };
      }
      if (data.schemaVersionId) {
        const version = await tx.execute(
          sql`SELECT id FROM document_schema_versions WHERE id=${data.schemaVersionId} AND department_id=${actor.departmentId}`,
        );
        if (!version.rows.length)
          throw new AppError(404, "NOT_FOUND", "Document schema not found.");
      }
      const displayId = `DOC-${id.replaceAll("-", "").slice(0, 16).toUpperCase()}`;
      await tx.execute(sql`INSERT INTO documents(id,display_id,department_id,village_id,schema_version_id,uploader_id,original_name,mime_type,byte_size,sha256,page_count,object_key,preview_key,title,language,reference,notes,upload_key,request_hash)
        VALUES(${id},${displayId},${actor.departmentId},${data.villageId},${data.schemaVersionId},${actor.id},${file.name},${inspection.mime},${file.bytes.length},${hash},${inspection.pages.length},${objectKey},${previewKey},${data.title},${data.language},${data.reference},${data.notes},${uploadKey},${requestHash})`);
      for (const [index, page] of inspection.pages.entries())
        await tx.execute(
          sql`INSERT INTO document_pages(document_id,page_number,width,height) VALUES(${id},${index + 1},${page.width},${page.height})`,
        );
      await tx.execute(
        sql`INSERT INTO document_metadata(document_id,revision,values,actor_id,reason) VALUES(${id},1,${JSON.stringify(data)}::jsonb,${actor.id},'Initial upload')`,
      );
      await tx.execute(
        sql`INSERT INTO document_status_history(document_id,to_status,actor_id,reason) VALUES(${id},'UPLOADED',${actor.id},'Original preserved and validated')`,
      );
      await appendAudit(tx, {
        actorId: actor.id,
        departmentId: actor.departmentId,
        action: "document.uploaded",
        entityId: id,
        requestId,
        details: {
          sha256: hash,
          pageCount: inspection.pages.length,
          mime: inspection.mime,
          villageId: data.villageId,
          schemaVersionId: data.schemaVersionId,
        },
      });
      return { id, reused: false };
    });
    if (result.reused)
      await Promise.all(written.map((key) => storage.remove(key)));
    else written.length = 0;
    return {
      document: await getDocument(token, result.id),
      reused: result.reused,
    };
  } catch (error) {
    await Promise.all(written.map((key) => storage.remove(key)));
    throw error;
  }
}
export async function updateMetadata(
  token: string | undefined,
  id: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "documents.upload");
  z.uuid().parse(id);
  const data = metadataEditSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "documents.upload");
    const found = await tx.execute(
      sql`SELECT d.id,d.revision,d.uploader_id,d.status,d.title,d.language,d.reference,d.notes ${joins} WHERE d.id=${id} AND ${visible(actor)} FOR UPDATE OF d`,
    );
    if (!found.rows.length)
      throw new AppError(404, "NOT_FOUND", "Document not found.");
    const current = found.rows[0];
    if (current.uploader_id !== actor.id)
      throw new AppError(
        403,
        "FORBIDDEN",
        "Only the uploader can edit this document’s metadata.",
      );
    if (
      current.revision !== data.expectedRevision ||
      current.status !== "UPLOADED"
    )
      throw new AppError(
        409,
        "REVISION_CONFLICT",
        "This document changed. Refresh before editing.",
      );
    const revision = data.expectedRevision + 1;
    const values = {
      title: data.title,
      language: data.language,
      reference: data.reference,
      notes: data.notes,
    };
    await tx.execute(
      sql`UPDATE documents SET title=${data.title},language=${data.language},reference=${data.reference},notes=${data.notes},revision=${revision} WHERE id=${id}`,
    );
    await tx.execute(
      sql`INSERT INTO document_metadata(document_id,revision,values,actor_id,reason) VALUES(${id},${revision},${JSON.stringify(values)}::jsonb,${actor.id},${data.reason})`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "document.metadata_updated",
      entityId: id,
      requestId,
      details: {
        before: {
          title: current.title,
          language: current.language,
          reference: current.reference,
          notes: current.notes,
        },
        after: values,
        revision,
        reason: data.reason,
      },
    });
    return { id, revision };
  });
}
export async function getDocumentHistory(
  token: string | undefined,
  id: string,
) {
  await getDocument(token, id);
  const db = getDb();
  const [metadata, status] = await Promise.all([
    db.execute(
      sql`SELECT revision,values,reason,actor_id AS "actorId",created_at AS "createdAt" FROM document_metadata WHERE document_id=${id} ORDER BY revision DESC`,
    ),
    db.execute(
      sql`SELECT from_status AS "fromStatus",to_status AS "toStatus",reason,actor_id AS "actorId",created_at AS "createdAt" FROM document_status_history WHERE document_id=${id} ORDER BY created_at,id`,
    ),
  ]);
  return { metadata: metadata.rows, status: status.rows };
}
export async function getDocumentPages(token: string | undefined, id: string) {
  await getDocument(token, id);
  return (
    await getDb().execute(
      sql`SELECT page_number AS "pageNumber",width,height FROM document_pages WHERE document_id=${id} ORDER BY page_number`,
    )
  ).rows;
}
export async function readDocumentFile(
  token: string | undefined,
  id: string,
  mode: "preview" | "original",
  requestId: string,
) {
  const doc = await getDocument(token, id);
  const actor = await requireActor(token);
  const stored = await getDb().execute(
    sql`SELECT object_key,preview_key FROM documents WHERE id=${id}`,
  );
  const row = stored.rows[0];
  const key =
    mode === "preview" && row.preview_key
      ? String(row.preview_key)
      : String(row.object_key);
  const bytes = await storage.get(key);
  // Audit before returning bytes. A failed audit write must not release private content.
  await getDb().transaction(async (tx) => {
    await lockActor(tx,token,actor,'documents.read');
    await requireVillage(tx,actor,doc.villageId);
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action:
        mode === "original" ? "document.downloaded" : "document.previewed",
      entityId: id,
      requestId,
    });
  });
  return {
    bytes,
    mime: mode === "preview" && row.preview_key ? "image/webp" : doc.mimeType,
    name: doc.originalName,
  };
}
