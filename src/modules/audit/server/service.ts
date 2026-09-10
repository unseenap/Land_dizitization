import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { auditLogs, jurisdictions } from "../../../../database/schema";
import { getDb } from "@/server/db";
import {
  requireActor,
  requirePermission,
} from "@/modules/identity/server/service";

export async function listAudit(token: string | undefined, page = 1) {
  const actor = await requireActor(token);
  requirePermission(actor, "audit.read");
  const db = getDb();
  const [scopeCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(jurisdictions)
    .where(eq(jurisdictions.departmentId, actor.departmentId));
  // Partial-scope staff see their own events; department-wide readers must hold every jurisdiction.
  const allScopes =
    scopeCount.total > 0 && actor.scopes.length === scopeCount.total;
  const where = and(
    eq(auditLogs.departmentId, actor.departmentId),
    allScopes ? undefined : eq(auditLogs.actorId, actor.id),
  );
  const items = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(25)
    .offset((page - 1) * 25);
  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(where);
  return { items, page, page_size: 25, total: count.total };
}
