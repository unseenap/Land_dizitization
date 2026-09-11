import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { getVerificationTask } from "@/modules/verification/server/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req) =>
    NextResponse.json(
      await getVerificationTask(sessionToken(req), (await context.params).id),
    ),
  )(request);
}
