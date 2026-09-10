import { NextResponse } from "next/server";
import { route, sessionToken, pageNumber } from "@/server/http";
import { listAudit } from "@/modules/audit/server/service";
export const GET = route(async (request) =>
  NextResponse.json(
    await listAudit(sessionToken(request), pageNumber(request)),
  ),
);
