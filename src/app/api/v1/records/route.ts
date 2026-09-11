import { NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { listLandRecords } from "@/modules/land-records/server/service";

export const GET = route(async (request) =>
  NextResponse.json(
    await listLandRecords(
      sessionToken(request),
      Object.fromEntries(request.nextUrl.searchParams),
    ),
  ),
);
