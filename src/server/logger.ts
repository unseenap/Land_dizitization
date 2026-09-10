import "server-only";

// Whitelist operational metadata. Do not log requests, headers, credentials or error objects.
export function logEvent(
  level: "info" | "error",
  event: string,
  requestId: string,
  status?: number,
) {
  console[level](
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      event,
      requestId,
      status,
    }),
  );
}
