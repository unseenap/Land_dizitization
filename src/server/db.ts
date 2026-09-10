import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getConfig } from "./config";
import * as schema from "../../database/schema";

const globalDb = globalThis as unknown as { landPool?: Pool };
export function getPool() {
  if (!globalDb.landPool) {
    const config = getConfig();
    globalDb.landPool = new Pool({
      connectionString: config.DATABASE_URL,
      max: config.DATABASE_POOL_MAX,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }
  return globalDb.landPool;
}
export function getDb() {
  return drizzle(getPool(), { schema });
}
export type Database = ReturnType<typeof getDb>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
