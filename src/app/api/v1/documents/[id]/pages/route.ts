import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { getDocumentPages } from "@/modules/documents/server/service";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req) =>
    NextResponse.json({
      items: await getDocumentPages(
        sessionToken(req),
        (await context.params).id,
      ),
    }),
  )(request);
}
