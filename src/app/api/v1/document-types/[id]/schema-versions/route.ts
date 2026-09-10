import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { route, sessionToken, assertCsrf, readJson } from "@/server/http";
import { publishVersion } from "@/modules/document-types/server/service";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    return NextResponse.json(
      await publishVersion(
        sessionToken(req),
        z.uuid().parse((await context.params).id),
        await readJson(req),
        requestId,
      ),
      { status: 201 },
    );
  })(request);
}
