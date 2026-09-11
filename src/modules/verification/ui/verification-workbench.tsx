"use client";
import { useState } from "react";
import { api } from "@/shared/api-client";
import type {
  VerificationField,
  VerificationTaskView,
} from "../contracts";

type DecisionState = {
  decision: "ACCEPT_MODEL" | "ACCEPT_CORRECTION";
  value: string;
};

type CorrectionState = {
  value: string;
  reason: string;
};

function initialDecision(field: VerificationField, view: VerificationTaskView) {
  const latest = view.decisions.find((decision) => decision.fieldKey === field.fieldKey);
  return {
    decision: latest?.decision ?? "ACCEPT_MODEL",
    value: latest ? String(latest.value ?? "") : String(field.normalizedValue ?? ""),
  };
}

function initialCorrection(field: VerificationField, view: VerificationTaskView) {
  const latest = view.corrections.find((correction) => correction.fieldKey === field.fieldKey);
  return {
    value: latest ? String(latest.value ?? "") : String(field.normalizedValue ?? ""),
    reason: latest?.reason ?? "",
  };
}

function parseValue(field: VerificationField, value: string) {
  if (field.fieldType === "boolean") return value === "true";
  if (field.fieldType === "number") return value;
  return value;
}

export function VerificationWorkbench({
  initial,
  csrfToken,
  canReview,
  canCorrect,
}: {
  initial: VerificationTaskView;
  csrfToken: string;
  canReview: boolean;
  canCorrect: boolean;
}) {
  const [view, setView] = useState(initial);
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>(() =>
    Object.fromEntries(initial.fields.map((field) => [field.fieldKey, initialDecision(field, initial)])),
  );
  const [corrections, setCorrections] = useState<Record<string, CorrectionState>>(() =>
    Object.fromEntries(initial.fields.map((field) => [field.fieldKey, initialCorrection(field, initial)])),
  );
  const [reviewReason, setReviewReason] = useState("");
  const [approvalReason, setApprovalReason] = useState("");
  const [busy, setBusy] = useState<"review" | "corrections" | "approve" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reviewable =
    canReview && (view.task.status === "PENDING_REVIEW" || view.task.status === "CORRECTED");
  const correctable = canCorrect && view.task.status === "RETURNED_FOR_EDIT";

  async function send(
    operation: "review" | "corrections" | "approve",
    path: string,
    body: unknown,
  ) {
    setBusy(operation);
    setMessage(null);
    try {
      setView(await api<VerificationTaskView>(path, { method: "POST", csrfToken, body }));
      setMessage("Verification workflow updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The update failed.");
    } finally {
      setBusy(null);
    }
  }

  async function submitReview(action: "SUBMIT" | "RETURN" | "REJECT") {
    await send("review", `/api/v1/verifications/${view.task.id}/review`, {
      expectedStatus: view.task.status,
      action,
      reason: reviewReason,
      decisions:
        action === "SUBMIT"
          ? view.fields.map((field) => {
              const state = decisions[field.fieldKey];
              return {
                fieldKey: field.fieldKey,
                decision: state.decision,
                correctedValue:
                  state.decision === "ACCEPT_CORRECTION"
                    ? parseValue(field, state.value)
                    : undefined,
                reason: reviewReason,
              };
            })
          : [],
    });
  }

  async function submitCorrections() {
    await send("corrections", `/api/v1/verifications/${view.task.id}/corrections`, {
      expectedStatus: view.task.status,
      corrections: view.fields.map((field) => ({
        fieldKey: field.fieldKey,
        value: parseValue(field, corrections[field.fieldKey]?.value ?? ""),
        reason: corrections[field.fieldKey]?.reason ?? "",
      })),
    });
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>Human verification</h2>
          <span className="cell-secondary">
            Revision {view.task.documentRevision} · {view.fields.length} fields ·{" "}
            {view.run.blockerCount} original blockers
          </span>
        </div>
        <span className="tag">{view.task.status}</span>
      </div>
      {view.task.returnedReason && (
        <p className="error-text">{view.task.returnedReason}</p>
      )}
      {message && <p role="status">{message}</p>}

      <div className="stack compact">
        {view.fields.map((field) => {
          const decision = decisions[field.fieldKey];
          const correction = corrections[field.fieldKey];
          return (
            <article className="history-entry" key={field.fieldKey}>
              <div className="toolbar">
                <div>
                  <strong>{field.label}</strong>
                  <span className="cell-secondary">
                    {field.fieldKey} · {field.fieldType}
                    {field.required ? " · required" : ""}
                    {field.critical ? " · critical" : ""}
                  </span>
                </div>
                <span className="tag">
                  {field.confidence === null
                    ? "No confidence"
                    : `${Math.round(field.confidence * 100)}%`}
                </span>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Model source</dt>
                  <dd>{field.sourceValue === null ? "—" : String(field.sourceValue)}</dd>
                </div>
                <div>
                  <dt>Normalized</dt>
                  <dd>{field.normalizedValue === null ? "—" : String(field.normalizedValue)}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    {field.evidence.length
                      ? field.evidence
                          .map((item) => `p${item.page}: ${item.sourceText}`)
                          .join(" | ")
                      : "None"}
                  </dd>
                </div>
              </dl>
              {reviewable && (
                <div className="form-stack compact">
                  <label>
                    Decision
                    <select
                      value={decision.decision}
                      onChange={(event) =>
                        setDecisions((current) => ({
                          ...current,
                          [field.fieldKey]: {
                            ...current[field.fieldKey],
                            decision: event.target.value as DecisionState["decision"],
                          },
                        }))
                      }
                    >
                      <option value="ACCEPT_MODEL">Accept model value</option>
                      <option value="ACCEPT_CORRECTION">Accept corrected value</option>
                    </select>
                  </label>
                  {decision.decision === "ACCEPT_CORRECTION" && (
                    <label>
                      Corrected value
                      {field.fieldType === "boolean" ? (
                        <select
                          value={decision.value || "false"}
                          onChange={(event) =>
                            setDecisions((current) => ({
                              ...current,
                              [field.fieldKey]: {
                                ...current[field.fieldKey],
                                value: event.target.value,
                              },
                            }))
                          }
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          value={decision.value}
                          type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : "text"}
                          step={field.fieldType === "number" ? "0.01" : undefined}
                          onChange={(event) =>
                            setDecisions((current) => ({
                              ...current,
                              [field.fieldKey]: {
                                ...current[field.fieldKey],
                                value: event.target.value,
                              },
                            }))
                          }
                        />
                      )}
                    </label>
                  )}
                </div>
              )}
              {correctable && (
                <div className="form-stack compact">
                  <label>
                    Corrected value
                    {field.fieldType === "boolean" ? (
                      <select
                        value={correction.value || "false"}
                        onChange={(event) =>
                          setCorrections((current) => ({
                            ...current,
                            [field.fieldKey]: { ...current[field.fieldKey], value: event.target.value },
                          }))
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        value={correction.value}
                        type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : "text"}
                        step={field.fieldType === "number" ? "0.01" : undefined}
                        onChange={(event) =>
                          setCorrections((current) => ({
                            ...current,
                            [field.fieldKey]: { ...current[field.fieldKey], value: event.target.value },
                          }))
                        }
                      />
                    )}
                  </label>
                  <label>
                    Reason
                    <input
                      value={correction.reason}
                      minLength={3}
                      maxLength={500}
                      onChange={(event) =>
                        setCorrections((current) => ({
                          ...current,
                          [field.fieldKey]: { ...current[field.fieldKey], reason: event.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {reviewable && (
        <div className="form-stack">
          <label>
            Review reason
            <textarea
              value={reviewReason}
              minLength={3}
              maxLength={500}
              onChange={(event) => setReviewReason(event.target.value)}
            />
          </label>
          <div className="toolbar">
            <button className="button primary" disabled={busy !== null || reviewReason.trim().length < 3} onClick={() => submitReview("SUBMIT")}>
              {busy === "review" ? "Saving…" : "Submit for approval"}
            </button>
            <button className="button" disabled={busy !== null || reviewReason.trim().length < 3} onClick={() => submitReview("RETURN")}>
              Return for correction
            </button>
            <button className="button danger" disabled={busy !== null || reviewReason.trim().length < 3} onClick={() => submitReview("REJECT")}>
              Reject record
            </button>
          </div>
        </div>
      )}
      {correctable && (
        <div className="form-stack">
          <button className="button primary" disabled={busy !== null} onClick={submitCorrections}>
            {busy === "corrections" ? "Submitting…" : "Submit corrections"}
          </button>
        </div>
      )}
      {canReview && view.task.status === "PENDING_APPROVAL" && (
        <div className="form-stack">
          <label>
            Approval reason
            <textarea
              value={approvalReason}
              minLength={3}
              maxLength={500}
              onChange={(event) => setApprovalReason(event.target.value)}
            />
          </label>
          <button
            className="button primary"
            disabled={busy !== null || approvalReason.trim().length < 3}
            onClick={() =>
              send("approve", `/api/v1/verifications/${view.task.id}/approve`, {
                expectedStatus: view.task.status,
                reason: approvalReason,
              })
            }
          >
            {busy === "approve" ? "Approving…" : "Approve record"}
          </button>
        </div>
      )}

      <h3>Findings</h3>
      <div className="stack compact">
        {view.findings.map((finding, index) => (
          <p className="small" key={`${finding.code}-${finding.fieldKey ?? "record"}-${index}`}>
            <strong>{finding.code}</strong> · {finding.message}
            {finding.fieldKey ? ` (${finding.fieldKey})` : ""}
          </p>
        ))}
      </div>
      <h3>Duplicate decisions</h3>
      <div className="stack compact">
        {view.duplicates.length ? (
          view.duplicates.map((duplicate) => (
            <p className="small" key={duplicate.id}>
              <strong>{duplicate.candidateDisplayId}</strong> · {duplicate.status} ·{" "}
              {duplicate.resolutionReason ?? "Pending human decision"}
            </p>
          ))
        ) : (
          <p className="small muted">No duplicate candidates.</p>
        )}
      </div>
      <h3>Workflow history</h3>
      <div className="stack compact">
        {view.history.map((entry, index) => (
          <p className="small" key={`${entry.action}-${index}`}>
            <strong>{entry.action}</strong> · {entry.fromStatus ?? "—"} → {entry.toStatus} ·{" "}
            {entry.reason}
          </p>
        ))}
      </div>
      {view.approval && (
        <>
          <h3>Final approval</h3>
          <p className="small">
            Approved by {view.approval.approvedBy} · {view.approval.createdAt} ·{" "}
            {view.approval.reason}
          </p>
          <p className="small muted">
            The approval snapshot, model artifact, evidence, corrections and decisions are immutable.
          </p>
        </>
      )}
    </section>
  );
}
