import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AppError } from "./errors";
import { getConfig } from "./config";
import { logEvent } from "./logger";
import { csrfToken } from "@/modules/identity/server/service";

export const SESSION_COOKIE = "land_session";
export function sessionToken(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value;
}
export function assertOrigin(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(getConfig().APP_URL).origin)
    throw new AppError(
      403,
      "ORIGIN_DENIED",
      "This request origin is not allowed.",
    );
}
export function assertCsrf(request: NextRequest) {
  assertOrigin(request);
  const token = sessionToken(request),
    provided = request.headers.get("x-csrf-token") ?? "";
  if (
    !token ||
    !/^[a-f0-9]{64}$/.test(provided) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(csrfToken(token)))
  )
    throw new AppError(
      403,
      "CSRF_DENIED",
      "Refresh the page before trying again.",
    );
}
export async function readJson(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "CONTENT_TYPE", "Use application/json.");
  if (Number(request.headers.get("content-length") ?? 0) > 16384)
    throw new AppError(413, "BODY_TOO_LARGE", "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new AppError(400, "INVALID_JSON", "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 16384) {
      await reader.cancel();
      throw new AppError(413, "BODY_TOO_LARGE", "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_JSON", "Enter a valid JSON body.");
  }
}
export function pageNumber(request: NextRequest) {
  return z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(request.nextUrl.searchParams.get("page") ?? 1);
}
export function route(
  action: (request: NextRequest, requestId: string) => Promise<NextResponse>,
) {
  return async (request: NextRequest) => {
    const requestId = randomUUID();
    try {
      const response = await action(request, requestId);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Request-ID", requestId);
      logEvent("info", "request.completed", requestId, response.status);
      return response;
    } catch (error) {
      const code =
        (error as { code?: string; cause?: { code?: string } })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code;
      const known =
        error instanceof AppError
          ? error
          : error instanceof ZodError
            ? new AppError(
                422,
                "VALIDATION_ERROR",
                "Check the submitted fields.",
              )
            : code === "23505"
              ? new AppError(
                  409,
                  "CONFLICT",
                  "An entry with these details already exists.",
                )
              : new AppError(
                  503,
                  "SERVICE_UNAVAILABLE",
                  "The service is temporarily unavailable. Please try again.",
                );
      logEvent("error", known.code, requestId, known.status);
      return NextResponse.json(
        {
          error: {
            code: known.code,
            message: known.message,
            request_id: requestId,
          },
        },
        {
          status: known.status,
          headers: {
            "Cache-Control": "private, no-store",
            "X-Request-ID": requestId,
          },
        },
      );
    }
  };
}
