import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  requireActor,
  requirePermission,
  lockActor,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import { AppError } from "@/server/errors";
import {
  typeSchema,
  versionSchema,
  jsonSchema,
  type TypeSummary,
} from "../contracts";
export async function listTypes(
  token: string | undefined,
): Promise<TypeSummary[]> {
  const actor = await requireActor(token);
  const result = await getDb().execute(
    sql`SELECT t.id,t.code,t.name,s.id AS "schemaVersionId",s.version,s.fields FROM document_types t JOIN LATERAL(SELECT * FROM document_schema_versions v WHERE v.type_id=t.id ORDER BY version DESC LIMIT 1)s ON true WHERE t.department_id=${actor.departmentId} ORDER BY t.name,t.id`,
  );
  return result.rows as unknown as TypeSummary[];
}
export async function createType(
  token: string | undefined,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "document-types.manage");
  const data = typeSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "document-types.manage");
    const type = await tx.execute(
      sql`INSERT INTO document_types(department_id,code,name) VALUES(${actor.departmentId},${data.code},${data.name}) RETURNING id`,
    );
    const id = String(type.rows[0].id);
    await tx.execute(
      sql`INSERT INTO document_schema_versions(type_id,department_id,version,fields,json_schema,reason,created_by) VALUES(${id},${actor.departmentId},1,${JSON.stringify(data.fields)}::jsonb,${JSON.stringify(jsonSchema(data.fields))}::jsonb,${data.reason},${actor.id})`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "document_type.created",
      entityId: id,
      requestId,
      details: { code: data.code, version: 1, reason: data.reason },
    });
    return { id, version: 1 };
  });
}
export async function publishVersion(
  token: string | undefined,
  id: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "document-types.manage");
  const data = versionSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "document-types.manage");
    const current = await tx.execute(
      sql`SELECT max(v.version)::int AS version FROM document_types t JOIN document_schema_versions v ON v.type_id=t.id WHERE t.id=${id} AND t.department_id=${actor.departmentId}`,
    );
    const version = current.rows[0]?.version;
    if (!version)
      throw new AppError(404, "NOT_FOUND", "Document type not found.");
    if (Number(version) !== data.expectedVersion)
      throw new AppError(
        409,
        "REVISION_CONFLICT",
        "This schema changed. Refresh before publishing.",
      );
    const next = Number(version) + 1;
    await tx.execute(
      sql`INSERT INTO document_schema_versions(type_id,department_id,version,fields,json_schema,reason,created_by) VALUES(${id},${actor.departmentId},${next},${JSON.stringify(data.fields)}::jsonb,${JSON.stringify(jsonSchema(data.fields))}::jsonb,${data.reason},${actor.id})`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "document_type.version_published",
      entityId: id,
      requestId,
      details: { version: next, reason: data.reason },
    });
    return { id, version: next };
  });
}
