import "server-only";
import { NextRequest } from "next/server";
import { getConfig } from "./config";
import { AppError } from "./errors";
export async function readUpload(request: NextRequest) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;"))
    throw new AppError(
      415,
      "CONTENT_TYPE",
      "Use multipart form data for uploads.",
    );
  const max = getConfig().MAX_UPLOAD_MB * 1024 * 1024 + 16384;
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new AppError(
      413,
      "FILE_TOO_LARGE",
      "The upload exceeds the size limit.",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "MISSING_FILE", "Select a file.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new AppError(
        413,
        "FILE_TOO_LARGE",
        "The upload exceeds the size limit.",
      );
    }
    chunks.push(value);
  }
  let form: FormData;
  try {
    form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": type },
    }).formData();
  } catch {
    throw new AppError(
      400,
      "INVALID_MULTIPART",
      "The upload form is malformed.",
    );
  }
  if (
    form.getAll("file").length !== 1 ||
    form.getAll("metadata").length !== 1 ||
    Array.from(form.keys()).some((key) => !["file", "metadata"].includes(key))
  )
    throw new AppError(
      422,
      "INVALID_UPLOAD",
      "Send exactly one file and its metadata.",
    );
  const file = form.get("file"),
    metadata = form.get("metadata");
  if (
    !(file instanceof File) ||
    typeof metadata !== "string" ||
    metadata.length > 8000
  )
    throw new AppError(
      422,
      "INVALID_UPLOAD",
      "Select a file and valid metadata.",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    throw new AppError(422, "INVALID_METADATA", "Metadata must be valid JSON.");
  }
  return {
    file: {
      name: file.name,
      type: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    },
    metadata: parsed,
  };
}
