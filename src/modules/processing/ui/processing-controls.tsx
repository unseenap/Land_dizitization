"use client";

import { useEffect, useState } from "react";
import type { ProcessingJobSummary } from "../contracts";

type ProcessingView = {
  job: ProcessingJobSummary;
  history: Array<Record<string, unknown>>;
} | null;

export function ProcessingControls({
  documentId,
  csrfToken,
  initial,
  canSubmit,
}: {
  documentId: string;
  csrfToken: string;
  initial: ProcessingView;
  canSubmit: boolean;
}) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const active = view?.job.status === "QUEUED" || view?.job.status === "SUBMITTING" || view?.job.status === "SUBMITTED" || view?.job.status === "RUNNING";

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/v1/documents/${documentId}/processing`, { cache: "no-store" });
      if (response.ok) setView(await response.json());
    }, 2000);
    return () => window.clearInterval(timer);
  }, [active, documentId]);

  async function start() {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/v1/documents/${documentId}/process`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ tasks: ["ocr"] }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error?.message ?? "Processing could not be started.");
      return;
    }
    setView({ job: body.job, history: [] });
    setMessage("Processing job queued.");
  }

  return (
    <div className="stack compact">
      <div className="toolbar">
        <div>
          <strong>Processing</strong>
          <span className="cell-secondary">
            {view ? `${view.job.status} · ${view.job.stage}` : "Not started"}
          </span>
        </div>
        {canSubmit && !active && (!view || view.job.status === "FAILED" || view.job.status === "RESULT_REJECTED") && (
          <button className="button primary" type="button" disabled={busy} onClick={start}>
            {busy ? "Queueing..." : "Start processing"}
          </button>
        )}
      </div>
      {message && <p className="small muted">{message}</p>}
      {view?.job.errorMessage && <p className="small error-text">{view.job.errorMessage}</p>}
    </div>
  );
}
