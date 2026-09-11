import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, readJson, route, sessionToken } from "@/server/http";
import { submitReview } from "@/modules/verification/server/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    return NextResponse.json(
      await submitReview(
        sessionToken(req),
        (await context.params).id,
        await readJson(req),
        requestId,
      ),
    );
  })(request);
}
