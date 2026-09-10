import { NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { listDocuments } from "@/modules/documents/server/service";
export const GET = route(async (request) =>
  NextResponse.json(
    await listDocuments(
      sessionToken(request),
      Object.fromEntries(request.nextUrl.searchParams),
    ),
  ),
);
