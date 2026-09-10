import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { getPool } from "@/server/db";
export const GET = route(async () => {
  await getPool().query("SELECT id FROM sessions LIMIT 0");
  return NextResponse.json({
    status: "ready",
    database: "connected",
    phase: 1,
  });
});
