"use client";

import { useState } from "react";
import type { DuplicateCandidateView } from "../contracts";

export function DuplicateList({
  csrfToken,
  initial,
  canResolve,
}: {
  csrfToken: string;
  initial: DuplicateCandidateView[];
  canResolve: boolean;
}) {
  const [candidates, setCandidates] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function resolve(candidate: DuplicateCandidateView, decision: "RESOLVED_NOT_DUPLICATE" | "RESOLVED_DUPLICATE") {
    setBusyId(candidate.id);
    setMessage(null);
    const response = await fetch(`/api/v1/duplicates/${candidate.id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({
        decision,
        reason:
          decision === "RESOLVED_DUPLICATE"
            ? "Confirmed as the same source record after review."
            : "Reviewed and confirmed as a distinct source record.",
      }),
    });
    const body = await response.json();
    setBusyId(null);
    if (!response.ok) {
      setMessage(body.error?.message ?? "The duplicate decision could not be saved.");
      return;
    }
    setCandidates((current) =>
      current.map((item) =>
        item.id === candidate.id
          ? {
              ...item,
              status: decision,
              resolutionReason:
                decision === "RESOLVED_DUPLICATE"
                  ? "Confirmed as the same source record after review."
                  : "Reviewed and confirmed as a distinct source record.",
              resolvedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setMessage("Duplicate decision saved.");
  }

  if (!candidates.length) return <p className="small muted">No duplicate candidates found.</p>;
  return (
    <div className="stack compact">
      {message && <p className="small muted">{message}</p>}
      {candidates.map((candidate) => (
        <article className="history-entry" key={candidate.id}>
          <div className="toolbar">
            <div>
              <strong>{candidate.candidateDisplayId}</strong>
              <span className="cell-secondary">
                {candidate.candidateTitle} · score {(candidate.score * 100).toFixed(0)}%
              </span>
            </div>
            <span className="tag">{candidate.status}</span>
          </div>
          <p className="small">
            {candidate.signals.map((signal) => signal.label).join(" · ")}
          </p>
          {candidate.status === "PENDING" && canResolve ? (
            <div className="toolbar">
              <button
                className="button"
                type="button"
                disabled={busyId === candidate.id}
                onClick={() => resolve(candidate, "RESOLVED_NOT_DUPLICATE")}
              >
                Not a duplicate
              </button>
              <button
                className="button danger"
                type="button"
                disabled={busyId === candidate.id}
                onClick={() => resolve(candidate, "RESOLVED_DUPLICATE")}
              >
                Confirm duplicate
              </button>
            </div>
          ) : (
            <p className="small muted">
              {candidate.resolutionReason ?? "Resolved"}
              {candidate.resolvedAt
                ? ` · ${new Date(candidate.resolvedAt).toLocaleString("en-IN")}`
                : ""}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
