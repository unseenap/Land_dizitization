import { NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { requireActor, csrfToken } from "@/modules/identity/server/service";
export const GET = route(async (request) => {
  const token = sessionToken(request);
  const actor = await requireActor(token);
  return NextResponse.json({ user: actor, csrfToken: csrfToken(token!) });
});
