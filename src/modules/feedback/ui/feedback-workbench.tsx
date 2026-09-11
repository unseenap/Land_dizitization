"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import type {
  FeedbackDatasetSummary,
  FeedbackEvaluationSummary,
  FeedbackExportResult,
} from "../contracts";

function percent(value: number | null) {
  return value === null ? "Not evaluated" : `${(value * 100).toFixed(1)}%`;
}

function statusClass(status: FeedbackDatasetSummary["status"]) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export function FeedbackWorkbench({
  datasets,
  evaluations,
  csrfToken,
  canManage,
  canExport,
}: {
  datasets: FeedbackDatasetSummary[];
  evaluations: FeedbackEvaluationSummary[];
  csrfToken: string;
  canManage: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(path: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = body
        ? await api(path, {
            method: "POST",
            csrfToken,
            body,
          })
        : await api<FeedbackExportResult>(path, {
            method: "POST",
            csrfToken,
          });
      const exportResult = result as FeedbackExportResult;
      setMessage(
        exportResult?.payloadSha256
          ? `Export ${exportResult.id} ready · SHA-256 ${exportResult.payloadSha256.slice(0, 16)}… · ${exportResult.payload.examples.length} examples`
          : "Request completed. Refreshing feedback data.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The request failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Feedback and evaluation</h2>
      <p className="muted">
        Datasets are pinned to approved prediction/truth pairs. Evaluation uses
        truth-labelled fields as the denominator; confidence is reported
        separately and never treated as accuracy. Exports never trigger
        automatic retraining.
      </p>
      {canManage && (
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void send("/api/v1/feedback/datasets", {
              name: form.get("name"),
              fromDate: form.get("fromDate"),
              toDate: form.get("toDate"),
            });
          }}
        >
          <div className="form-stack">
            <label>
              Dataset name
              <input
                name="name"
                required
                minLength={3}
                maxLength={120}
                placeholder="May 2026 approved fields"
              />
            </label>
            <label>
              Approval start date
              <input name="fromDate" type="date" required />
            </label>
            <label>
              Approval end date
              <input name="toDate" type="date" required />
            </label>
            <button className="button" disabled={busy}>
              Create pending dataset
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Status</th>
              <th>Models</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset) => (
              <tr key={dataset.id}>
                <td>
                  <strong>
                    v{dataset.version} · {dataset.name}
                  </strong>
                  <span className="cell-secondary">
                    {dataset.itemCount} examples · approvals {dataset.fromDate} to{" "}
                    {dataset.toDate}
                  </span>
                </td>
                <td>
                  <span className={`tag ${statusClass(dataset.status)}`}>
                    {dataset.status.replaceAll("_", " ")}
                  </span>
                  {dataset.reviewReason && (
                    <span className="cell-secondary">{dataset.reviewReason}</span>
                  )}
                </td>
                <td>
                  {dataset.modelVersions.length ? (
                    dataset.modelVersions.map((model) => (
                      <span key={model.modelVersion} className="cell-secondary">
                        {model.modelProvider} · {model.modelName} ·{" "}
                        {model.modelVersion} ({model.examples})
                      </span>
                    ))
                  ) : (
                    <span className="cell-secondary">No examples</span>
                  )}
                </td>
                <td>
                  {canManage && dataset.status === "PENDING_REVIEW" && (
                    <form
                      className="form-stack compact"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void send(`/api/v1/feedback/datasets/${dataset.id}/review`, {
                          decision: form.get("decision"),
                          reason: form.get("reason"),
                        });
                      }}
                    >
                      <select name="decision" defaultValue="APPROVED">
                        <option value="APPROVED">Approve</option>
                        <option value="REJECTED">Reject</option>
                      </select>
                      <input
                        name="reason"
                        required
                        minLength={3}
                        maxLength={500}
                        placeholder="Review reason"
                      />
                      <button className="button" disabled={busy}>
                        Submit review
                      </button>
                    </form>
                  )}
                  {canManage && dataset.status === "APPROVED" && (
                    <form
                      className="form-stack compact"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        void send("/api/v1/feedback/evaluations", {
                          datasetId: dataset.id,
                          modelVersion: form.get("modelVersion"),
                        });
                      }}
                    >
                      <select name="modelVersion" required>
                        {dataset.modelVersions.map((model) => (
                          <option key={model.modelVersion} value={model.modelVersion}>
                            {model.modelVersion}
                          </option>
                        ))}
                      </select>
                      <button className="button" disabled={busy}>
                        Run evaluation
                      </button>
                    </form>
                  )}
                  {canExport && dataset.status === "APPROVED" && (
                    <form
                      className="form-stack compact"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void send(`/api/v1/feedback/datasets/${dataset.id}/export`);
                      }}
                    >
                      <button className="button" disabled={busy}>
                        Generate model-team export
                      </button>
                    </form>
                  )}
                  {dataset.export && (
                    <span className="cell-secondary">
                      Export {dataset.export.payloadSha256.slice(0, 16)}… ·{" "}
                      {new Date(dataset.export.exportedAt).toLocaleString()}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!datasets.length && (
          <p className="empty">
            No feedback datasets exist yet. Approve verification tasks first, then
            create a dataset.
          </p>
        )}
      </div>

      <h3>Evaluation runs</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Model</th>
              <th>Accuracy</th>
              <th>Segments</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation) => (
              <tr key={evaluation.id}>
                <td>
                  <strong>
                    v{evaluation.datasetVersion} · {evaluation.datasetName}
                  </strong>
                  <span className="cell-secondary">
                    {new Date(evaluation.createdAt).toLocaleString()}
                  </span>
                </td>
                <td>
                  {evaluation.modelVersion}
                  <span className="cell-secondary">
                    {evaluation.metrics.totalExamples} examples ·{" "}
                    {evaluation.metrics.evaluatedFields} truth-labelled
                  </span>
                </td>
                <td>
                  {percent(evaluation.metrics.accuracy)}
                  <span className="cell-secondary">
                    {evaluation.metrics.correctFields} correct ·{" "}
                    {evaluation.metrics.incorrectFields} incorrect
                  </span>
                </td>
                <td>
                  <span className="cell-secondary">
                    {evaluation.metrics.byDocumentType.length} document types ·{" "}
                    {evaluation.metrics.byLanguage.length} languages ·{" "}
                    {evaluation.metrics.byField.length} fields
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!evaluations.length && (
          <p className="empty">No model evaluations have been generated.</p>
        )}
      </div>
      {message && <p className="form-message">{message}</p>}
      {!canManage && !canExport && (
        <p className="empty">Your role can view feedback but cannot manage it.</p>
      )}
    </div>
  );
}
