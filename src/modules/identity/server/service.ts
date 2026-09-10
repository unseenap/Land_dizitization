import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  users,
  sessions,
  userRoles,
  userScopes,
  jurisdictions,
} from "../../../../database/schema";
import { getDb, type Transaction } from "@/server/db";
import { getConfig } from "@/server/config";
import { AppError } from "@/server/errors";
import { appendAudit } from "@/modules/audit/server/writer";
import { hashPassword, verifyPassword } from "./password";
import {
  createUserSchema,
  loginSchema,
  updateUserSchema,
  type Actor,
} from "../contracts";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const csrfToken = (token: string) =>
  createHmac("sha256", getConfig().SESSION_SECRET).update(token).digest("hex");

export async function login(input: unknown, requestId: string) {
  const { email, password } = loginSchema.parse(input);
  const db = getDb();
  const globalRate =
    await db.execute(sql`INSERT INTO login_limits(key,attempts,expires_at) VALUES ('global-login',1,now()+interval '1 minute')
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_limits.expires_at<now() THEN 1 ELSE login_limits.attempts+1 END,
    expires_at=CASE WHEN login_limits.expires_at<now() THEN now()+interval '1 minute' ELSE login_limits.expires_at END RETURNING attempts`);
  if (Number(globalRate.rows[0].attempts) > 100)
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Sign-in is busy. Please try again shortly.",
    );
  const rateKey = createHmac("sha256", getConfig().SESSION_SECRET)
    .update(email)
    .digest("hex");
  const rate =
    await db.execute(sql`INSERT INTO login_limits(key,attempts,expires_at) VALUES (${rateKey},1,now()+interval '15 minutes')
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_limits.expires_at < now() THEN 1 ELSE login_limits.attempts+1 END,
    expires_at=CASE WHEN login_limits.expires_at < now() THEN now()+interval '15 minutes' ELSE login_limits.expires_at END RETURNING attempts`);
  if (Number(rate.rows[0].attempts) > 10)
    throw new AppError(
      429,
      "RATE_LIMITED",
      "Too many sign-in attempts. Try again in 15 minutes.",
    );
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const matched = await verifyPassword(password, user?.passwordHash);
  if (!matched || !user?.active) {
    await db.transaction((tx) =>
      appendAudit(tx, {
        action: "auth.login_failed",
        departmentId: user?.departmentId,
        actorId: user?.id,
        requestId,
      }),
    );
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + getConfig().SESSION_HOURS * 3600000);
  await db.transaction(async (tx) => {
    // Recheck while locked: a concurrent deactivation/password change cannot issue a session.
    const [current] = await tx
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .for("update");
    if (!current.active || current.passwordHash !== user.passwordHash)
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    await tx
      .insert(sessions)
      .values({ userId: user.id, tokenHash: hashToken(token), expiresAt });
    await tx.execute(sql`DELETE FROM login_limits WHERE key=${rateKey}`);
    await appendAudit(tx, {
      actorId: user.id,
      departmentId: user.departmentId,
      action: "auth.login",
      entityId: user.id,
      requestId,
    });
  });
  return { token, expiresAt };
}

export async function requireActor(token?: string): Promise<Actor> {
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");
  const db = getDb();
  const found =
    await db.execute(sql`SELECT u.id,u.name,u.email,u.department_id,d.name AS department_name
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN departments d ON d.id=u.department_id
    WHERE s.token_hash=${hashToken(token)} AND s.revoked_at IS NULL AND s.expires_at>now() AND u.active=true`);
  if (!found.rows.length)
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Your session has expired. Please sign in.",
    );
  const row = found.rows[0];
  const id = String(row.id);
  const [roleRows, permissionRows, scopeRows] = await Promise.all([
    db
      .select({ code: userRoles.roleCode })
      .from(userRoles)
      .where(eq(userRoles.userId, id)),
    db.execute(
      sql`SELECT DISTINCT rp.permission_code FROM user_roles ur JOIN role_permissions rp ON ur.role_code=rp.role_code WHERE ur.user_id=${id}`,
    ),
    db
      .select({ id: jurisdictions.id, name: jurisdictions.name })
      .from(userScopes)
      .innerJoin(jurisdictions, eq(userScopes.jurisdictionId, jurisdictions.id))
      .where(
        and(
          eq(userScopes.userId, id),
          eq(jurisdictions.departmentId, String(row.department_id)),
        ),
      ),
  ]);
  return {
    id,
    name: String(row.name),
    email: String(row.email),
    departmentId: String(row.department_id),
    departmentName: String(row.department_name),
    roles: roleRows.map((r) => r.code),
    permissions: permissionRows.rows.map((r) => String(r.permission_code)),
    scopes: scopeRows,
  };
}
export function requirePermission(actor: Actor, permission: string) {
  if (!actor.permissions.includes(permission))
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have permission for this action.",
    );
}
function assertScopes(actor: Actor, ids: string[]) {
  if (!ids.length || ids.some((id) => !actor.scopes.some((s) => s.id === id)))
    throw new AppError(
      403,
      "SCOPE_DENIED",
      "Choose jurisdictions within your assigned scope.",
    );
}
export async function lockActor(
  tx: Transaction,
  token: string | undefined,
  actor: Actor,
  permission = "users.manage",
) {
  // Serialize access changes, then recheck the acting session under the same lock.
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor.departmentId},26018))`,
  );
  const current =
    await tx.execute(sql`SELECT u.id FROM users u JOIN sessions s ON s.user_id=u.id
    WHERE u.id=${actor.id} AND u.active=true AND s.token_hash=${hashToken(token!)} AND s.revoked_at IS NULL AND s.expires_at>now()
    AND EXISTS(SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code=ur.role_code WHERE ur.user_id=u.id AND rp.permission_code=${permission}) FOR UPDATE OF u`);
  if (!current.rows.length)
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Your access changed. Please sign in again.",
    );
}
export async function logout(token: string | undefined, requestId: string) {
  if (!token) return;
  const actor = await requireActor(token);
  await getDb().transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(token)));
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "auth.logout",
      requestId,
    });
  });
}

const safeColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  active: users.active,
  revision: users.revision,
  createdAt: users.createdAt,
};
function visibleUsers(actor: Actor) {
  const scopes = actor.scopes.map((s) => s.id);
  if (!scopes.length) return sql`false`;
  // Administrators can manage only users whose entire scope they hold.
  return and(
    eq(users.departmentId, actor.departmentId),
    sql`EXISTS(SELECT 1 FROM user_scopes us WHERE us.user_id=${users.id})`,
    sql`NOT EXISTS(SELECT 1 FROM user_scopes us WHERE us.user_id=${users.id} AND us.jurisdiction_id NOT IN (${sql.join(
      scopes.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}))`,
  );
}
export async function listUsers(token: string | undefined, page = 1) {
  const actor = await requireActor(token);
  requirePermission(actor, "users.manage");
  const db = getDb();
  const items = await db
    .select(safeColumns)
    .from(users)
    .where(visibleUsers(actor))
    .orderBy(users.createdAt, users.id)
    .limit(25)
    .offset((page - 1) * 25);
  const count = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(visibleUsers(actor));
  const enriched = await Promise.all(
    items.map(async (item) => ({
      ...item,
      roles: (
        await db
          .select({ code: userRoles.roleCode })
          .from(userRoles)
          .where(eq(userRoles.userId, item.id))
      ).map((r) => r.code),
      scopeIds: (
        await db
          .select({ id: userScopes.jurisdictionId })
          .from(userScopes)
          .where(eq(userScopes.userId, item.id))
      ).map((s) => s.id),
    })),
  );
  return { items: enriched, page, page_size: 25, total: count[0].total };
}
export async function getUser(token: string | undefined, id: string) {
  const actor = await requireActor(token);
  requirePermission(actor, "users.manage");
  const [user] = await getDb()
    .select(safeColumns)
    .from(users)
    .where(and(eq(users.id, id), visibleUsers(actor)));
  if (!user) throw new AppError(404, "NOT_FOUND", "User not found.");
  return user;
}
export async function createUser(
  token: string | undefined,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "users.manage");
  const data = createUserSchema.parse(input);
  assertScopes(actor, data.scopeIds);
  const passwordHash = await hashPassword(data.password);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor);
    const [created] = await tx
      .insert(users)
      .values({
        departmentId: actor.departmentId,
        email: data.email,
        name: data.name,
        passwordHash,
      })
      .returning(safeColumns);
    await tx
      .insert(userRoles)
      .values({ userId: created.id, roleCode: data.role });
    await tx
      .insert(userScopes)
      .values(
        data.scopeIds.map((id) => ({ userId: created.id, jurisdictionId: id })),
      );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "user.created",
      entityId: created.id,
      requestId,
      details: { role: data.role, scopeIds: data.scopeIds },
    });
    return created;
  });
}
export async function updateUser(
  token: string | undefined,
  id: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "users.manage");
  const data = updateUserSchema.parse(input);
  assertScopes(actor, data.scopeIds);
  if (id === actor.id)
    throw new AppError(
      409,
      "SELF_EDIT_DENIED",
      "Ask another administrator to change your access.",
    );
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor);
    const [target] = await tx
      .select(safeColumns)
      .from(users)
      .where(and(eq(users.id, id), visibleUsers(actor)))
      .for("update");
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found.");
    if (target.revision !== data.expectedRevision)
      throw new AppError(
        409,
        "REVISION_CONFLICT",
        "This user changed. Refresh before saving.",
      );
    const oldRoles = await tx
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, id));
    const oldScopes = await tx
      .select()
      .from(userScopes)
      .where(eq(userScopes.userId, id));
    await tx
      .update(users)
      .set({ active: data.active, revision: target.revision + 1 })
      .where(eq(users.id, id));
    await tx.delete(userRoles).where(eq(userRoles.userId, id));
    await tx.insert(userRoles).values({ userId: id, roleCode: data.role });
    await tx.delete(userScopes).where(eq(userScopes.userId, id));
    await tx.insert(userScopes).values(
      data.scopeIds.map((scopeId) => ({
        userId: id,
        jurisdictionId: scopeId,
      })),
    );
    await tx
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, id),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "user.access_changed",
      entityId: id,
      requestId,
      details: {
        before: {
          active: target.active,
          roles: oldRoles.map((r) => r.roleCode),
          scopeIds: oldScopes.map((s) => s.jurisdictionId),
        },
        after: {
          active: data.active,
          role: data.role,
          scopeIds: data.scopeIds,
        },
      },
    });
    return { id, revision: target.revision + 1 };
  });
}

export async function listJurisdictions(token: string | undefined) {
  const actor = await requireActor(token);
  return { department: actor.departmentName, items: actor.scopes };
}
