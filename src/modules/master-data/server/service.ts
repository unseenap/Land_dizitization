import "server-only";
import { sql } from "drizzle-orm";
import { getDb, type Transaction } from "@/server/db";
import {
  requireActor,
  requirePermission,
  lockActor,
} from "@/modules/identity/server/service";
import type { Actor } from "@/modules/identity/contracts";
import { appendAudit } from "@/modules/audit/server/writer";
import { AppError } from "@/server/errors";
import { areaSchema, type MasterTree } from "../contracts";

export function scopedIds(actor: Actor) {
  return actor.scopes.length
    ? sql.join(
        actor.scopes.map((s) => sql`${s.id}::uuid`),
        sql`, `,
      )
    : sql`NULL::uuid`;
}
export async function getMasterData(
  token: string | undefined,
): Promise<MasterTree> {
  const actor = await requireActor(token);
  const db = getDb();
  const scope = scopedIds(actor);
  const [stateRows, districtRows, tehsilRows, villageRows] = await Promise.all([
    db.execute(sql`SELECT s.id,s.code,s.name FROM states s WHERE s.department_id=${actor.departmentId} AND (
      (${actor.scopes.length > 0} AND NOT EXISTS(SELECT 1 FROM jurisdictions j WHERE j.department_id=s.department_id AND j.id NOT IN (${scope})))
      OR EXISTS(SELECT 1 FROM districts d WHERE d.state_id=s.id AND d.jurisdiction_id IN (${scope}))) ORDER BY s.name,s.id`),
    db.execute(
      sql`SELECT id,code,name,state_id AS "stateId",jurisdiction_id AS "jurisdictionId" FROM districts WHERE department_id=${actor.departmentId} AND jurisdiction_id IN (${scope}) ORDER BY name,id`,
    ),
    db.execute(
      sql`SELECT t.id,t.code,t.name,t.district_id AS "districtId" FROM tehsils t JOIN districts d ON d.id=t.district_id WHERE d.department_id=${actor.departmentId} AND d.jurisdiction_id IN (${scope}) ORDER BY t.name,t.id`,
    ),
    db.execute(
      sql`SELECT v.id,v.code,v.name,v.tehsil_id AS "tehsilId" FROM villages v JOIN tehsils t ON t.id=v.tehsil_id JOIN districts d ON d.id=t.district_id WHERE d.department_id=${actor.departmentId} AND d.jurisdiction_id IN (${scope}) ORDER BY v.name,v.id`,
    ),
  ]);
  return {
    states: stateRows.rows,
    districts: districtRows.rows,
    tehsils: tehsilRows.rows,
    villages: villageRows.rows,
  } as unknown as MasterTree;
}
export async function requireVillage(
  tx: Transaction | ReturnType<typeof getDb>,
  actor: Actor,
  id: string,
) {
  const found = await tx.execute(
    sql`SELECT v.id FROM villages v JOIN tehsils t ON t.id=v.tehsil_id JOIN districts d ON d.id=t.district_id WHERE v.id=${id} AND v.department_id=${actor.departmentId} AND d.jurisdiction_id IN (${scopedIds(actor)})`,
  );
  if (!found.rows.length)
    throw new AppError(
      404,
      "NOT_FOUND",
      "Village not found within your scope.",
    );
}
export async function createArea(
  token: string | undefined,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "master-data.manage");
  const data = areaSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "master-data.manage");
    let result;
    if (data.kind === "state") {
      const unassigned = await tx.execute(
        sql`SELECT id FROM jurisdictions WHERE department_id=${actor.departmentId} AND id NOT IN (${scopedIds(actor)}) LIMIT 1`,
      );
      if (unassigned.rows.length || !actor.scopes.length)
        throw new AppError(
          403,
          "SCOPE_DENIED",
          "Creating a state requires access to every department jurisdiction.",
        );
      result = await tx.execute(
        sql`INSERT INTO states(department_id,code,name) VALUES(${actor.departmentId},${data.code},${data.name}) RETURNING id`,
      );
    } else if (data.kind === "district") {
      if (
        !data.parentId ||
        !actor.scopes.some((s) => s.id === data.jurisdictionId)
      )
        throw new AppError(
          403,
          "SCOPE_DENIED",
          "Select an assigned jurisdiction and state.",
        );
      result = await tx.execute(
        sql`INSERT INTO districts(department_id,state_id,jurisdiction_id,code,name) SELECT ${actor.departmentId},s.id,${data.jurisdictionId}::uuid,${data.code},${data.name} FROM states s WHERE s.id=${data.parentId} AND s.department_id=${actor.departmentId} RETURNING id`,
      );
    } else if (data.kind === "tehsil") {
      if (!data.parentId)
        throw new AppError(422, "PARENT_REQUIRED", "Choose a district.");
      result = await tx.execute(
        sql`INSERT INTO tehsils(department_id,district_id,code,name) SELECT ${actor.departmentId},d.id,${data.code},${data.name} FROM districts d WHERE d.id=${data.parentId} AND d.department_id=${actor.departmentId} AND d.jurisdiction_id IN (${scopedIds(actor)}) RETURNING id`,
      );
    } else {
      if (!data.parentId)
        throw new AppError(422, "PARENT_REQUIRED", "Choose a tehsil.");
      result = await tx.execute(
        sql`INSERT INTO villages(department_id,tehsil_id,code,name) SELECT ${actor.departmentId},t.id,${data.code},${data.name} FROM tehsils t JOIN districts d ON d.id=t.district_id WHERE t.id=${data.parentId} AND d.department_id=${actor.departmentId} AND d.jurisdiction_id IN (${scopedIds(actor)}) RETURNING id`,
      );
    }
    if (!result.rows.length)
      throw new AppError(404, "NOT_FOUND", "Parent location not found.");
    const id = String(result.rows[0].id);
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "master_data.created",
      entityId: id,
      requestId,
      details: { ...data },
    });
    return { id, ...data };
  });
}
