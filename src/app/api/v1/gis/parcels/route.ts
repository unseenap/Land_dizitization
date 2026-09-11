import { NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { listGisParcels } from "@/modules/gis/server/service";

export const GET = route(async (request) =>
  NextResponse.json(
    await listGisParcels(
      sessionToken(request),
      Object.fromEntries(request.nextUrl.searchParams),
    ),
  ),
);
