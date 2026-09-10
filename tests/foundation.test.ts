import "../scripts/env";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { Pool } from "pg";
import { NextRequest } from "next/server";
import { migrate } from "../scripts/migrate";
import { seed } from "../scripts/seed";
import {
  login,
  logout,
  requireActor,
  createUser,
  listUsers,
  getUser,
  updateUser,
  csrfToken,
} from "../src/modules/identity/server/service";
import { listAudit } from "../src/modules/audit/server/service";
import { getPool } from "../src/server/db";
import { assertCsrf, readJson } from "../src/server/http";

const suffix = randomBytes(8).toString("hex");
const dbName = `land_test_${suffix}`;
const accountFile = `.local-data/test-accounts-${suffix}.json`;
let owner: Pool;
let adminToken: string;
let operatorToken: string;
let northToken: string;
let accounts: Record<
  string,
  { password: string; id: string; departmentId: string; scopeIds: string[] }
>;
const originalOwner = process.env.MIGRATION_DATABASE_URL!;
const forbidden = (status: number) => (error: unknown) =>
  (error as { status: number }).status === status;
before(async () => {
  assert.ok(originalOwner, "Set MIGRATION_DATABASE_URL before testing.");
  const ownerUrl = new URL(originalOwner);
  ownerUrl.pathname = "/postgres";
  owner = new Pool({ connectionString: ownerUrl.toString() });
  await owner.query(`CREATE DATABASE ${dbName}`);
  const migrationUrl = new URL(originalOwner);
  migrationUrl.pathname = `/${dbName}`;
  process.env.MIGRATION_DATABASE_URL = migrationUrl.toString();
  const runtimeUrl = new URL(process.env.DATABASE_URL!);
  runtimeUrl.pathname = `/${dbName}`;
  process.env.DATABASE_URL = runtimeUrl.toString();
  process.env.APP_ENV = "test";
  await migrate();
  await seed(accountFile);
  accounts = JSON.parse(await readFile(accountFile, "utf8"));
  adminToken = (
    await login(
      {
        email: "admin@demo.land",
        password: accounts["admin@demo.land"].password,
      },
      randomUUID(),
    )
  ).token;
  operatorToken = (
    await login(
      {
        email: "operator@demo.land",
        password: accounts["operator@demo.land"].password,
      },
      randomUUID(),
    )
  ).token;
  northToken = (
    await login(
      {
        email: "north.admin@demo.land",
        password: accounts["north.admin@demo.land"].password,
      },
      randomUUID(),
    )
  ).token;
});
after(async () => {
  await getPool().end();
  if (owner && /^land_test_[a-f0-9]{16}$/.test(dbName)) {
    await owner.query(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await owner.end();
  }
  await unlink(accountFile).catch(() => {});
});

test("migrations are repeatable and runtime cannot change schema or audit history", async () => {
  await migrate();
  await assert.rejects(
    getPool().query("CREATE TABLE forbidden_table(id integer)"),
  );
  await assert.rejects(
    getPool().query("UPDATE audit_logs SET action='tampered'"),
  );
  await assert.rejects(getPool().query("TRUNCATE audit_logs"));
});
test("valid session returns safe identity; raw tokens and passwords are not persisted", async () => {
  const actor = await requireActor(adminToken);
  assert.equal(actor.email, "admin@demo.land");
  assert.ok(actor.permissions.includes("users.manage"));
  const stored = (
    await getPool().query("SELECT password_hash FROM users WHERE id=$1", [
      actor.id,
    ])
  ).rows[0];
  assert.match(stored.password_hash, /^scrypt\$32768\$/);
  assert.notEqual(stored.password_hash, accounts["admin@demo.land"].password);
  assert.equal(
    (
      await getPool().query("SELECT 1 FROM sessions WHERE token_hash=$1", [
        adminToken,
      ])
    ).rowCount,
    0,
  );
  assert.ok(!JSON.stringify(actor).includes("passwordHash"));
  await assert.rejects(requireActor("bad"), forbidden(401));
});
test("wrong credentials and missing user return the same safe failure", async () => {
  await assert.rejects(
    login({ email: "operator@demo.land", password: "incorrect" }, randomUUID()),
    forbidden(401),
  );
  await assert.rejects(
    login({ email: "unknown@demo.land", password: "incorrect" }, randomUUID()),
    forbidden(401),
  );
});
test("operator cannot manage users, even by directly invoking service", async () => {
  await assert.rejects(listUsers(operatorToken), forbidden(403));
  await assert.rejects(
    createUser(
      operatorToken,
      {
        name: "Denied User",
        email: "denied@demo.land",
        password: "long-enough-test-password",
        role: "administrator",
        scopeIds: accounts["operator@demo.land"].scopeIds,
      },
      randomUUID(),
    ),
    forbidden(403),
  );
});
test("department and jurisdiction scope filter lists and deny direct object IDs", async () => {
  const result = await listUsers(adminToken);
  assert.equal(result.total, 6);
  assert.ok(!result.items.some((u) => u.email === "external.admin@demo.land"));
  await assert.rejects(
    getUser(adminToken, accounts["external.admin@demo.land"].id),
    forbidden(404),
  );
  const north = await listUsers(northToken);
  assert.ok(!north.items.some((u) => u.email === "admin@demo.land"));
  assert.equal(north.total, 3);
  await assert.rejects(
    getUser(northToken, accounts["admin@demo.land"].id),
    forbidden(404),
  );
  await assert.rejects(
    createUser(
      northToken,
      {
        name: "Out of Scope",
        email: "outside@demo.land",
        password: "long-enough-password",
        role: "operator",
        scopeIds: accounts["admin@demo.land"].scopeIds,
      },
      randomUUID(),
    ),
    forbidden(403),
  );
});
test("create, duplicate conflict, concurrent revision update and session revocation", async () => {
  const input = {
    name: "Test Account",
    email: "test.account@demo.land",
    password: "test-password-long-enough",
    role: "operator",
    scopeIds: accounts["operator@demo.land"].scopeIds,
  };
  const created = await createUser(adminToken, input, randomUUID());
  assert.ok(!("passwordHash" in created));
  await assert.rejects(createUser(adminToken, input, randomUUID()));
  const session = await login(
    { email: input.email, password: input.password },
    randomUUID(),
  );
  const edit = {
    expectedRevision: 1,
    active: true,
    role: "supervisor",
    scopeIds: input.scopeIds,
  };
  const results = await Promise.allSettled([
    updateUser(adminToken, created.id, edit, randomUUID()),
    updateUser(adminToken, created.id, edit, randomUUID()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    results.filter((r) => r.status === "rejected" && r.reason.status === 409)
      .length,
    1,
  );
  await assert.rejects(requireActor(session.token), forbidden(401));
  await updateUser(
    adminToken,
    created.id,
    { ...edit, expectedRevision: 2, active: false },
    randomUUID(),
  );
  await assert.rejects(
    login({ email: input.email, password: input.password }, randomUUID()),
    forbidden(401),
  );
});
test("an audit failure rolls back the user creation transaction", async () => {
  const admin = new Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  try {
    await admin.query(
      "CREATE FUNCTION test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='user.created' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION test_fail_audit()",
    );
    await assert.rejects(
      createUser(
        adminToken,
        {
          name: "Rollback Account",
          email: "rollback@demo.land",
          password: "long-enough-password",
          role: "operator",
          scopeIds: accounts["operator@demo.land"].scopeIds,
        },
        randomUUID(),
      ),
      (error: unknown) =>
        String(
          (error as { cause?: { message: string } }).cause?.message,
        ).includes("test audit failure"),
    );
    assert.equal(
      (
        await getPool().query(
          "SELECT 1 FROM users WHERE email='rollback@demo.land'",
        )
      ).rowCount,
      0,
    );
  } finally {
    await admin.query(
      "DROP TRIGGER IF EXISTS test_fail_audit ON audit_logs; DROP FUNCTION IF EXISTS test_fail_audit()",
    );
    await admin.end();
  }
});
test("audit reading observes department and partial-jurisdiction boundaries", async () => {
  const logs = await listAudit(adminToken);
  assert.ok(
    logs.items.every(
      (l) => l.departmentId === accounts["admin@demo.land"].departmentId,
    ),
  );
  const partial = await listAudit(northToken);
  assert.ok(
    partial.items.every(
      (l) => l.actorId === accounts["north.admin@demo.land"].id,
    ),
  );
  await assert.rejects(listAudit(operatorToken), forbidden(403));
});
test("CSRF, origin and oversized JSON requests are rejected", async () => {
  const origin = new URL(process.env.APP_URL!).origin;
  const make = (headers: Record<string, string>) =>
    new NextRequest(`${origin}/api/v1/users`, { method: "POST", headers });
  assert.doesNotThrow(() =>
    assertCsrf(
      make({
        origin,
        cookie: `land_session=${adminToken}`,
        "x-csrf-token": csrfToken(adminToken),
      }),
    ),
  );
  assert.throws(
    () => assertCsrf(make({ origin, cookie: `land_session=${adminToken}` })),
    forbidden(403),
  );
  assert.throws(
    () =>
      assertCsrf(
        make({
          origin: "https://attacker.invalid",
          cookie: `land_session=${adminToken}`,
          "x-csrf-token": csrfToken(adminToken),
        }),
      ),
    forbidden(403),
  );
  await assert.rejects(
    readJson(
      new NextRequest(`${origin}/api/v1/users`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload: "a".repeat(20000) }),
      }),
    ),
    forbidden(413),
  );
});
test("repeated login failures are rate limited and logout revokes session", async () => {
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      login({ email: "ratelimit@demo.land", password: "wrong" }, randomUUID()),
      forbidden(401),
    );
  await assert.rejects(
    login({ email: "ratelimit@demo.land", password: "wrong" }, randomUUID()),
    forbidden(429),
  );
  await logout(operatorToken, randomUUID());
  await assert.rejects(requireActor(operatorToken), forbidden(401));
});
