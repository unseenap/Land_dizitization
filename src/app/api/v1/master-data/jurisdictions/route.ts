import { NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { listJurisdictions } from "@/modules/identity/server/service";
export const GET = route(async (request) =>
  NextResponse.json(await listJurisdictions(sessionToken(request))),
);
