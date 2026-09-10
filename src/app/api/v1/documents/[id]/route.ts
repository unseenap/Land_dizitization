import { NextRequest, NextResponse } from "next/server";
import { route, assertCsrf, sessionToken, readJson } from "@/server/http";
import {
  getDocument,
  updateMetadata,
} from "@/modules/documents/server/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  return route(async (req) =>
    NextResponse.json(
      await getDocument(sessionToken(req), (await context.params).id),
    ),
  )(request);
}
export async function PATCH(request: NextRequest, context: Context) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    return NextResponse.json(
      await updateMetadata(
        sessionToken(req),
        (await context.params).id,
        await readJson(req),
        requestId,
      ),
    );
  })(request);
}
