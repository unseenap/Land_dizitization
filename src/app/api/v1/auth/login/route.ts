import { NextResponse } from "next/server";
import { route, assertOrigin, readJson, SESSION_COOKIE } from "@/server/http";
import { login, csrfToken } from "@/modules/identity/server/service";
import { getConfig } from "@/server/config";
export const POST = route(async (request, id) => {
  assertOrigin(request);
  const session = await login(await readJson(request), id);
  const response = NextResponse.json({ csrfToken: csrfToken(session.token) });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: new URL(getConfig().APP_URL).protocol === "https:",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
});
