import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, route, sessionToken } from "@/server/http";
import { exportFeedbackDataset } from "@/modules/feedback/server/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    return NextResponse.json(
      await exportFeedbackDataset(
        sessionToken(req),
        (await context.params).id,
        requestId,
      ),
    );
  })(request);
}
