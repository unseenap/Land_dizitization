import { NextResponse } from "next/server";
import { route, sessionToken, assertCsrf, readJson } from "@/server/http";
import {
  getMasterData,
  createArea,
} from "@/modules/master-data/server/service";
export const GET = route(async (req) =>
  NextResponse.json(await getMasterData(sessionToken(req))),
);
export const POST = route(async (req, id) => {
  assertCsrf(req);
  return NextResponse.json(
    await createArea(sessionToken(req), await readJson(req), id),
    { status: 201 },
  );
});
