import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { getDashboardSummary } from "@/modules/dashboard/server/service";

export async function GET(request: NextRequest) {
  return route(async (req) =>
    NextResponse.json(await getDashboardSummary(sessionToken(req))),
  )(request);
}
