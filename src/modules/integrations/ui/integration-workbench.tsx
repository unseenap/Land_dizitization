"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import type {
  IntegrationExportRun,
  IntegrationSummary,
} from "../contracts";
import type { LandRecordSummary } from "@/modules/land-records/contracts";

export function IntegrationWorkbench({
  integrations,
  records,
  runs,
  csrfToken,
  canManage,
  canExport,
}: {
  integrations: IntegrationSummary[];
  records: LandRecordSummary[];
  runs: IntegrationExportRun[];
  csrfToken: string;
  canManage: boolean;
  canExport: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const retryable = runs.filter(
    (run) => run.status === "FAILED" && run.retryable,
  );

  async function send(path: string, body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      await api(path, {
        method: "POST",
        csrfToken,
        body,
      });
      setMessage("Request accepted. The durable integration worker will process it.");
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
      <h2>Government integrations</h2>
      <p className="muted">
        Exports pin one approved record version. Delivery is asynchronous and
        every acknowledgement is labelled as a mock; live government mode is
        intentionally rejected in Phase 8.
      </p>
      <div className="form-grid">
        {canManage && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void send("/api/v1/integrations", {
                adapter: form.get("adapter"),
                name: form.get("name"),
                mode: form.get("mode"),
                contractVersion: form.get("contractVersion"),
                mappingVersion: Number(form.get("mappingVersion")),
                mapping: {
                  fieldKeys: String(form.get("fieldKeys") ?? "")
                    .split(",")
                    .map((key) => key.trim())
                    .filter(Boolean),
                  includeParcelLinks: form.get("includeParcelLinks") === "on",
                  includeSourceDocumentId:
                    form.get("includeSourceDocumentId") === "on",
                },
                notes: form.get("notes") || undefined,
              });
            }}
          >
            <h3>Configure adapter</h3>
            <label>
              Adapter
              <select name="adapter" required>
                <option value="LRMS">LRMS</option>
                <option value="DILRMP">DILRMP</option>
                <option value="GOVERNMENT_DATABASE">Government database</option>
              </select>
            </label>
            <label>
              Name
              <input name="name" required minLength={3} maxLength={100} defaultValue="Synthetic mock" />
            </label>
            <label>
              Mode
              <select name="mode" required defaultValue="MOCK">
                <option value="MOCK">Mock</option>
                <option value="LIVE">Live (not configured)</option>
              </select>
            </label>
            <label>
              Contract version
              <input name="contractVersion" required defaultValue="mock-v1" />
            </label>
            <label>
              Mapping version
              <input name="mappingVersion" type="number" min={1} required defaultValue={1} />
            </label>
            <label>
              Field keys
              <input
                name="fieldKeys"
                required
                defaultValue="owner_name,survey_number,khasra_number,plot_area"
              />
            </label>
            <label className="checkbox">
              <input type="checkbox" name="includeParcelLinks" defaultChecked />
              Include approved parcel links
            </label>
            <label className="checkbox">
              <input type="checkbox" name="includeSourceDocumentId" defaultChecked />
              Include source document ID
            </label>
            <label>
              Notes
              <input name="notes" maxLength={500} placeholder="No credentials are stored" />
            </label>
            <button className="button primary" disabled={busy}>
              Save configuration
            </button>
          </form>
        )}
        {canExport && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const selected = String(form.get("record") ?? "").split(":");
              void send(`/api/v1/integrations/${form.get("integrationId")}/exports`, {
                recordId: selected[0],
                recordVersionId: selected[1],
              });
            }}
          >
            <h3>Queue export</h3>
            <label>
              Integration
              <select name="integrationId" required>
                {integrations
                  .filter((integration) => integration.active && integration.mode === "MOCK")
                  .map((integration) => (
                    <option key={integration.id} value={integration.id}>
                      {integration.name} · {integration.adapter} · {integration.contractVersion}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Approved record
              <select name="record" required>
                {records.map((record) => (
                  <option key={record.id} value={`${record.id}:${record.versionId}`}>
                    {record.displayId} · v{record.version} · {record.ownerName ?? "Owner unavailable"}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" disabled={busy || !integrations.length || !records.length}>
              Queue exact approved version
            </button>
          </form>
        )}
        {canExport && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const runId = String(form.get("runId"));
              const run = runs.find((item) => item.id === runId);
              void send(
                `/api/v1/integrations/${run?.integrationId}/runs/${runId}/retry`,
                { reason: form.get("reason") },
              );
            }}
          >
            <h3>Retry failed export</h3>
            <label>
              Failed run
              <select name="runId" required>
                {retryable.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.integrationName} · {run.recordDisplayId} v{run.recordVersion}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required minLength={3} maxLength={500} />
            </label>
            <button className="button" disabled={busy || !retryable.length}>
              Requeue run
            </button>
          </form>
        )}
      </div>
      {!canManage && !canExport && (
        <p className="empty">Your role can view integrations but cannot change them.</p>
      )}
      {message && <p className="form-message">{message}</p>}
    </div>
  );
}
