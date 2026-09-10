import { NextResponse } from "next/server";
import {
  route,
  sessionToken,
  assertCsrf,
  readJson,
  pageNumber,
} from "@/server/http";
import { listUsers, createUser } from "@/modules/identity/server/service";
export const GET = route(async (request) =>
  NextResponse.json(
    await listUsers(sessionToken(request), pageNumber(request)),
  ),
);
export const POST = route(async (request, id) => {
  assertCsrf(request);
  return NextResponse.json(
    await createUser(sessionToken(request), await readJson(request), id),
    { status: 201 },
  );
});
