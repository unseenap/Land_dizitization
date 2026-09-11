import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, readJson, route, sessionToken } from "@/server/http";
import { retryIntegrationExport } from "@/modules/integrations/server/service";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string; runId: string }>;
  },
) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    const params = await context.params;
    return NextResponse.json(
      await retryIntegrationExport(
        sessionToken(req),
        params.id,
        params.runId,
        await readJson(req),
        requestId,
      ),
      { status: 202 },
    );
  })(request);
}
