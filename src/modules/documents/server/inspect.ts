import "server-only";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { AppError } from "@/server/errors";
import { getConfig } from "@/server/config";
type Inspection = {
  mime: string;
  pages: { width: number; height: number }[];
  preview: Buffer | null;
};
let running = 0;
export function detectMime(name: string, bytes: Buffer, claimed: string) {
  const extension = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
  };
  const mime = map[extension];
  if (!mime)
    throw new AppError(
      415,
      "UNSUPPORTED_FILE",
      "Use PDF, JPG, PNG or a single-page TIFF.",
    );
  if (
    claimed &&
    claimed !== "application/octet-stream" &&
    claimed !== mime &&
    !(mime === "image/tiff" && claimed === "image/x-tiff")
  )
    throw new AppError(
      415,
      "FILE_TYPE_MISMATCH",
      "The file type and extension do not match.",
    );
  const valid =
    mime === "application/pdf"
      ? bytes.subarray(0, 5).toString() === "%PDF-"
      : mime === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : mime === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : ["49492a00", "4d4d002a", "49492b00", "4d4d002b"].includes(
              bytes.subarray(0, 4).toString("hex"),
            );
  if (!valid)
    throw new AppError(
      415,
      "FILE_TYPE_MISMATCH",
      "The file contents do not match its extension.",
    );
  return mime;
}
export async function inspectDocument(
  name: string,
  bytes: Buffer,
  claimed: string,
): Promise<Inspection> {
  const config = getConfig();
  if (!bytes.length)
    throw new AppError(422, "EMPTY_FILE", "The file is empty.");
  if (bytes.length > config.MAX_UPLOAD_MB * 1024 * 1024)
    throw new AppError(
      413,
      "FILE_TOO_LARGE",
      `Files must be at most ${config.MAX_UPLOAD_MB} MiB.`,
    );
  const mime = detectMime(name, bytes, claimed);
  if (running >= 2)
    throw new AppError(
      429,
      "UPLOAD_BUSY",
      "Document inspection is busy. Retry this upload shortly.",
    );
  running++;
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve("scripts/inspect-document.mjs"), {
        workerData: { bytes, mime, maxPages: config.MAX_DOCUMENT_PAGES },
        resourceLimits: { maxOldGenerationSizeMb: 128 },
        execArgv: [],
      });
      let settled = false;
      const finish = (error?: Error, result?: Inspection) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void worker.terminate();
        if (error) reject(error);
        else resolve(result!);
      };
      const timer = setTimeout(
        () =>
          finish(
            new AppError(
              422,
              "INSPECTION_TIMEOUT",
              "The document could not be inspected within the time limit. Try a simpler scan.",
            ),
          ),
        15000,
      );
      worker.on("message", (message) => {
        if (!message.ok)
          finish(
            new AppError(
              422,
              "INVALID_DOCUMENT",
              /supported|pages|dimensions|incomplete|complex/.test(
                message.error ?? "",
              )
                ? message.error
                : "The document is corrupt or unsupported.",
            ),
          );
        else
          finish(undefined, {
            mime,
            pages: message.pages,
            preview: message.preview ? Buffer.from(message.preview) : null,
          });
      });
      worker.on("error", () =>
        finish(
          new AppError(
            422,
            "INVALID_DOCUMENT",
            "The document could not be safely inspected.",
          ),
        ),
      );
      worker.on("exit", () => {
        if (!settled)
          finish(
            new AppError(
              422,
              "INVALID_DOCUMENT",
              "Document inspection stopped unexpectedly.",
            ),
          );
      });
    });
  } finally {
    running--;
  }
}
