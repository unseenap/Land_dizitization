import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { getProcessingJob } from "@/modules/processing/server/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req) =>
    NextResponse.json(
      await getProcessingJob(sessionToken(req), (await context.params).id),
    ),
  )(request);
}
