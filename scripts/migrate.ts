import "./env";
import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

export async function migrate(
  connectionString = process.env.MIGRATION_DATABASE_URL,
) {
  if (!connectionString)
    throw new Error(
      "MIGRATION_DATABASE_URL is required; use a separate owner credential.",
    );
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(26018)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir("database/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      const source = await readFile(`database/migrations/${name}`, "utf8");
      const hash = createHash("sha256").update(source).digest("hex");
      const old = await client.query(
        "SELECT sha256 FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (old.rowCount) {
        if (old.rows[0].sha256 !== hash)
          throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(source);
        await client.query(
          "INSERT INTO schema_migrations(name,sha256) VALUES ($1,$2)",
          [name, hash],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      console.log(`Applied ${name}`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(26018)");
    client.release();
    await pool.end();
  }
}
if (process.argv[1]?.endsWith("migrate.ts"))
  migrate().catch(() => {
    console.error(
      "Migration failed. Check owner connection, land_app role and migration SQL.",
    );
    process.exitCode = 1;
  });
