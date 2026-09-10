"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
export function PdfPreview({ id }: { id: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let disposed = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    (async () => {
      try {
        const lib = await import("pdfjs-dist");
        lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const response = await fetch(`/api/v1/documents/${id}/content`, {
          signal: abort.signal,
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Preview is unavailable. Refresh or sign in again.");
        const data = new Uint8Array(await response.arrayBuffer());
        if (disposed) return;
        task = lib.getDocument({
          data,
          enableXfa: false,
          stopAtErrors: true,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
        });
        const doc = await task.promise;
        if (!disposed) setPdf(doc);
      } catch (e) {
        if (!disposed)
          setError(e instanceof Error ? e.message : "Preview failed.");
      }
    })();
    return () => {
      disposed = true;
      abort.abort();
      void task?.destroy();
    };
  }, [id]);
  useEffect(() => {
    if (!pdf) return;
    let disposed = false;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    (async () => {
      try {
        const source = await pdf.getPage(page);
        if (disposed || !canvas.current) return;
        const base = source.getViewport({ scale: 1 });
        const scale = Math.min(
          zoom * 1.4,
          Math.sqrt(8000000 / (base.width * base.height)),
        );
        const viewport = source.getViewport({ scale });
        const target = canvas.current;
        target.width = viewport.width;
        target.height = viewport.height;
        render = source.render({ canvas: target, viewport });
        await render.promise;
        if (!disposed) setReady(true);
      } catch (e) {
        if (!disposed)
          setError(e instanceof Error ? e.message : "Page rendering failed.");
      }
    })();
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [pdf, page, zoom]);
  return (
    <section aria-label="PDF preview">
      <div className="toolbar">
        <button
          className="button"
          disabled={!pdf || page === 1}
          onClick={() => {
            setReady(false);
            setPage(page - 1);
          }}
        >
          Previous page
        </button>
        <span>
          Page {page} of {pdf?.numPages ?? "…"}
        </span>
        <button
          className="button"
          disabled={!pdf || page === pdf.numPages}
          onClick={() => {
            setReady(false);
            setPage(page + 1);
          }}
        >
          Next page
        </button>
        <label>
          Zoom
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
            <option value={1.5}>150%</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert" className="error-message">
          {error}
        </p>
      ) : (
        <>
          <p className="small muted" role="status">
            {ready ? "Page rendered" : "Loading preview…"}
          </p>
          <div className="source-canvas">
            <canvas ref={canvas} style={{width:`${zoom*100}%`,maxWidth:'none'}} aria-label={`Document page ${page}`} />
          </div>
        </>
      )}
    </section>
  );
}
