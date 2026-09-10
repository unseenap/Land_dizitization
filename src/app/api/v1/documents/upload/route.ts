import { NextResponse } from "next/server";
import { route, assertCsrf, sessionToken } from "@/server/http";
import { readUpload } from "@/server/upload-http";
import { uploadDocument } from "@/modules/documents/server/service";
import {
  requireActor,
  requirePermission,
} from "@/modules/identity/server/service";
export const runtime = "nodejs";
export const POST = route(async (request, id) => {
  assertCsrf(request);
  requirePermission(
    await requireActor(sessionToken(request)),
    "documents.upload",
  );
  const { file, metadata } = await readUpload(request);
  const result = await uploadDocument(
    sessionToken(request),
    file,
    metadata,
    request.headers.get("idempotency-key") ?? "",
    id,
  );
  return NextResponse.json(result, { status: result.reused ? 200 : 201 });
});
