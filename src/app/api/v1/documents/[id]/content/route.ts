import { NextRequest, NextResponse } from "next/server";
import { route, sessionToken } from "@/server/http";
import { readDocumentFile } from "@/modules/documents/server/service";
export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return route(async (req, requestId) => {
    const download = req.nextUrl.searchParams.get("download") === "1";
    const file = await readDocumentFile(
      sessionToken(req),
      (await context.params).id,
      download ? "original" : "preview",
      requestId,
    );
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition":
          (download ? "attachment" : "inline") +
          "; filename*=UTF-8''" +
          encodeURIComponent(file.name).replace(/'/g, "%27"),
        "Content-Security-Policy":
          "sandbox; default-src 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  })(request);
}
