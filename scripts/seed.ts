import "./env";
import { Pool } from "pg";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hashPassword } from "../src/modules/identity/server/password";
import { seedDocumentFoundation } from "./seed-documents";

const definitions = [
  {
    email: "admin@demo.land",
    name: "Demo Administrator",
    role: "administrator",
    department: "SYN-A",
    scopes: ["NORTH", "SOUTH"],
  },
  {
    email: "north.admin@demo.land",
    name: "North Administrator",
    role: "administrator",
    department: "SYN-A",
    scopes: ["NORTH"],
  },
  {
    email: "operator@demo.land",
    name: "Document Operator",
    role: "operator",
    department: "SYN-A",
    scopes: ["NORTH"],
  },
  {
    email: "verifier@demo.land",
    name: "Verification Officer",
    role: "verifier",
    department: "SYN-A",
    scopes: ["NORTH"],
  },
  {
    email: "gis@demo.land",
    name: "GIS Officer",
    role: "gis_officer",
    department: "SYN-A",
    scopes: ["NORTH", "SOUTH"],
  },
  {
    email: "supervisor@demo.land",
    name: "Department Supervisor",
    role: "supervisor",
    department: "SYN-A",
    scopes: ["NORTH", "SOUTH"],
  },
  {
    email: "external.admin@demo.land",
    name: "Other Department Administrator",
    role: "administrator",
    department: "SYN-B",
    scopes: ["EAST"],
  },
];
export async function seed(accountFile = ".local-data/demo-accounts.json") {
  if (process.env.APP_ENV === "production")
    throw new Error("Synthetic seed is disabled in production.");
  if (!process.env.MIGRATION_DATABASE_URL)
    throw new Error("Owner database connection is required.");
  const pool = new Pool({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
  const client = await pool.connect();
  let accounts: Record<
    string,
    { password: string; id: string; departmentId: string; scopeIds: string[] }
  > = {};
  try {
    accounts = JSON.parse(await readFile(accountFile, "utf8"));
  } catch {}
  try {
    await client.query("BEGIN");
    for (const [code, name] of [
      ["SYN-A", "Synthetic Revenue Department A"],
      ["SYN-B", "Synthetic Revenue Department B"],
    ])
      await client.query(
        "INSERT INTO departments(code,name) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [code, name],
      );
    for (const [department, code, name] of [
      ["SYN-A", "NORTH", "Synthetic North District"],
      ["SYN-A", "SOUTH", "Synthetic South District"],
      ["SYN-B", "EAST", "Synthetic East District"],
    ])
      await client.query(
        "INSERT INTO jurisdictions(department_id,code,name) SELECT id,$2,$3 FROM departments WHERE code=$1 ON CONFLICT DO NOTHING",
        [department, code, name],
      );
    const grants: Record<string, string[]> = {
      administrator: ["users.manage", "audit.read", "workspace.read", "processing.read", "processing.submit", "duplicates.resolve", "verification.read", "verification.review", "verification.correct", "records.read", "integrations.read", "integrations.manage", "integrations.export"],
      operator: ["workspace.read", "processing.submit", "processing.read", "verification.read", "verification.correct", "records.read"],
      verifier: ["workspace.read", "processing.read", "duplicates.resolve", "verification.read", "verification.review", "records.read"],
      gis_officer: ["workspace.read", "records.read"],
      supervisor: ["workspace.read", "audit.read", "processing.read", "records.read", "integrations.read"],
    };
    for (const [role, permissions] of Object.entries(grants)) {
      await client.query(
        "INSERT INTO roles(code,name) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [role, role.replaceAll("_", " ")],
      );
      for (const permission of permissions) {
        await client.query(
          "INSERT INTO permissions(code) VALUES($1) ON CONFLICT DO NOTHING",
          [permission],
        );
        await client.query(
          "INSERT INTO role_permissions(role_code,permission_code) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [role, permission],
        );
      }
    }
    for (const definition of definitions) {
      const department = (
        await client.query("SELECT id FROM departments WHERE code=$1", [
          definition.department,
        ])
      ).rows[0].id;
      const scopes = (
        await client.query(
          "SELECT id FROM jurisdictions WHERE department_id=$1 AND code=ANY($2)",
          [department, definition.scopes],
        )
      ).rows.map((r) => r.id);
      const existing = (
        await client.query("SELECT id FROM users WHERE email=$1", [
          definition.email,
        ])
      ).rows[0];
      if (existing) continue;
      const password = randomBytes(18).toString("base64url");
      const id = (
        await client.query(
          "INSERT INTO users(department_id,email,name,password_hash) VALUES($1,$2,$3,$4) RETURNING id",
          [
            department,
            definition.email,
            definition.name,
            await hashPassword(password),
          ],
        )
      ).rows[0].id;
      await client.query("INSERT INTO user_roles VALUES($1,$2)", [
        id,
        definition.role,
      ]);
      for (const scope of scopes)
        await client.query("INSERT INTO user_scopes VALUES($1,$2)", [
          id,
          scope,
        ]);
      await client.query(
        "INSERT INTO audit_logs(department_id,actor_id,action,entity_id,request_id,details) VALUES($1,NULL,'seed.user_created',$2,gen_random_uuid(),'{\"synthetic\":true}')",
        [department, id],
      );
      accounts[definition.email] = {
        password,
        id,
        departmentId: department,
        scopeIds: scopes,
      };
    }
    await seedDocumentFoundation(client);
    for (const department of (
      await client.query("SELECT id FROM departments WHERE code IN ('SYN-A','SYN-B')")
    ).rows) {
      const createdBy = (
        await client.query(
          "SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE u.department_id=$1 AND ur.role_code='administrator' ORDER BY u.created_at,u.id LIMIT 1",
          [department.id],
        )
      ).rows[0]?.id ?? null;
      for (const [adapter, name] of [
        ["LRMS", "Synthetic LRMS mock"],
        ["DILRMP", "Synthetic DILRMP mock"],
        ["GOVERNMENT_DATABASE", "Synthetic government database mock"],
      ] as const) {
        await client.query(
          `INSERT INTO integrations(department_id,adapter,name,mode,contract_version,mapping_version,mapping,active,notes,created_by)
           VALUES($1,$2,$3,'MOCK','mock-v1',1,$4,true,$5,$6) ON CONFLICT DO NOTHING`,
          [
            department.id,
            adapter,
            name,
            JSON.stringify({
              fieldKeys: ["owner_name", "survey_number", "area"],
              includeParcelLinks: true,
              includeSourceDocumentId: true,
            }),
            "Synthetic mock only. No endpoint, credential or real government system is configured.",
            createdBy,
          ],
        );
      }
    }
    await mkdir(".local-data", { recursive: true });
    await writeFile(accountFile, JSON.stringify(accounts, null, 2));
    await client.query("COMMIT");
    console.log(
      "Synthetic accounts are ready. Credentials saved only in the ignored local account file.",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
if (process.argv[1]?.endsWith("seed.ts"))
  seed().catch(() => {
    console.error("Seed failed. Check migration status and owner connection.");
    process.exitCode = 1;
  });
