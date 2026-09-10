// Executed in an isolated worker with a heap limit and parent-enforced timeout.
import { parentPort, workerData } from "node:worker_threads";
import sharp from "sharp";
import { PDFDocument, PDFDict, PDFName, PDFArray, PDFRawStream } from "pdf-lib";

try {
  const bytes = Buffer.from(workerData.bytes);
  if (workerData.mime === "application/pdf") {
    if (
      bytes.subarray(0, 5).toString() !== "%PDF-" ||
      !bytes.subarray(-2048).includes(Buffer.from("%%EOF"))
    )
      throw new Error("The PDF is incomplete or invalid.");
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    const pages = doc.getPages();
    if (!pages.length || pages.length > workerData.maxPages)
      throw new Error(`Documents must contain 1–${workerData.maxPages} pages.`);
    const unsafe = new Set([
      "JavaScript",
      "JS",
      "OpenAction",
      "AA",
      "EmbeddedFiles",
      "EF",
      "XFA",
      "RichMedia",
      "Launch",
      "SubmitForm",
      "ImportData",
    ]);
    for (const [, object] of doc.context.enumerateIndirectObjects()) {
      const visited = new Set();
      function inspect(value, depth = 0) {
        if (depth > 40) throw new Error("PDF structure is too complex.");
        if (visited.has(value)) return;
        visited.add(value);
        if (value instanceof PDFName && unsafe.has(value.decodeText()))
          throw new Error(
            "PDFs with scripts, actions or embedded files are not supported.",
          );
        if (value instanceof PDFRawStream) inspect(value.dict, depth + 1);
        if (value instanceof PDFDict)
          for (const [key, entry] of value.entries()) {
            if (unsafe.has(key.decodeText()))
              throw new Error(
                "PDFs with scripts, actions or embedded files are not supported.",
              );
            inspect(entry, depth + 1);
          }
        if (value instanceof PDFArray)
          for (const entry of value.asArray()) inspect(entry, depth + 1);
      }
      inspect(object);
    }
    const dimensions = pages.map((page) => {
      const { width, height } = page.getSize();
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        width > 14400 ||
        height > 14400
      )
        throw new Error("PDF page dimensions exceed supported limits.");
      return { width, height };
    });
    parentPort.postMessage({ ok: true, pages: dimensions, preview: null });
  } else {
    const image = sharp(bytes, { limitInputPixels: 40000000, failOn: "error" });
    const metadata = await image.metadata();
    const expected = {
      "image/png": "png",
      "image/jpeg": "jpeg",
      "image/tiff": "tiff",
    }[workerData.mime];
    if (metadata.format !== expected)
      throw new Error("The file contents do not match its extension.");
    if ((metadata.pages ?? 1) !== 1)
      throw new Error(
        "Only single-page images and TIFFs are supported. Use PDF for multiple pages.",
      );
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 20000 ||
      metadata.height > 20000
    )
      throw new Error("Image dimensions exceed supported limits.");
    const preview = await image
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    parentPort.postMessage({
      ok: true,
      pages: [{ width: metadata.width, height: metadata.height }],
      preview,
    });
  }
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: error.message?.includes("encrypt")
      ? "Password-protected PDFs are not supported."
      : error.message,
  });
}
