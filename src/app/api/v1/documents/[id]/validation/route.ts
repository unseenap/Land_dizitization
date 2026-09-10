import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { getValidation } from "@/modules/validation/server/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req) =>
    NextResponse.json(
      await getValidation(sessionToken(req), (await context.params).id),
    ),
  )(request);
}
