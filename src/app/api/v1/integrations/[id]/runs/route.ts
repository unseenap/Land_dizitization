import { NextRequest, NextResponse } from "next/server";
import { pageNumber, route, sessionToken } from "@/server/http";
import { listIntegrationRuns } from "@/modules/integrations/server/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req) =>
    NextResponse.json(
      await listIntegrationRuns(
        sessionToken(req),
        (await context.params).id,
        { page: pageNumber(req) },
      ),
    ),
  )(request);
}
