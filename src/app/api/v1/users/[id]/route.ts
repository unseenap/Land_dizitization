import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { route, sessionToken, assertCsrf, readJson } from "@/server/http";
import { getUser, updateUser } from "@/modules/identity/server/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  return route(async (req) =>
    NextResponse.json(
      await getUser(
        sessionToken(req),
        z.uuid().parse((await context.params).id),
      ),
    ),
  )(request);
}
export async function PATCH(request: NextRequest, context: Context) {
  return route(async (req, requestId) => {
    assertCsrf(req);
    return NextResponse.json(
      await updateUser(
        sessionToken(req),
        z.uuid().parse((await context.params).id),
        await readJson(req),
        requestId,
      ),
    );
  })(request);
}
