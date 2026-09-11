import { NextResponse } from "next/server";
import { assertCsrf, readJson, route, sessionToken } from "@/server/http";
import { proposeRecordLink } from "@/modules/gis/server/service";

export const POST = route(async (request, requestId) => {
  assertCsrf(request);
  return NextResponse.json(
    await proposeRecordLink(
      sessionToken(request),
      await readJson(request),
      requestId,
    ),
    { status: 201 },
  );
});
