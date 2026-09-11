import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { getLandRecordVersions } from "@/modules/land-records/server/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req) =>
    NextResponse.json(
      await getLandRecordVersions(sessionToken(req), (await context.params).id),
    ),
  )(request);
}
