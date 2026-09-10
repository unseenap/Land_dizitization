import { NextResponse } from "next/server";
import { route, sessionToken, assertCsrf, readJson } from "@/server/http";
import { listTypes, createType } from "@/modules/document-types/server/service";
export const GET = route(async (req) =>
  NextResponse.json({ items: await listTypes(sessionToken(req)) }),
);
export const POST = route(async (req, id) => {
  assertCsrf(req);
  return NextResponse.json(
    await createType(sessionToken(req), await readJson(req), id),
    { status: 201 },
  );
});
