import { NextRequest, NextResponse } from "next/server";
import { assertCsrf, readJson, route, sessionToken } from "@/server/http";
import {
  createFeedbackEvaluation,
  listFeedbackEvaluations,
} from "@/modules/feedback/server/service";

export async function GET(request: NextRequest) {
  return route(async (req) =>
    NextResponse.json(await listFeedbackEvaluations(sessionToken(req))),
  )(request);
}

export async function POST(request: NextRequest) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    return NextResponse.json(
      await createFeedbackEvaluation(
        sessionToken(req),
        await readJson(req),
        requestId,
      ),
      { status: 201 },
    );
  })(request);
}
