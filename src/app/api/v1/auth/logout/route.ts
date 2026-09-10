import { NextResponse } from "next/server";
import { route, assertCsrf, sessionToken, SESSION_COOKIE } from "@/server/http";
import { logout } from "@/modules/identity/server/service";
export const POST = route(async (request, id) => {
  assertCsrf(request);
  await logout(sessionToken(request), id);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return response;
});
