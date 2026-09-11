import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { csrfToken } from "@/modules/identity/server/service";
import { listIntegrations, listIntegrationRuns } from "@/modules/integrations/server/service";
import { listLandRecords } from "@/modules/land-records/server/service";
import { IntegrationWorkbench } from "@/modules/integrations/ui/integration-workbench";
import type {
  IntegrationRunsResult,
  IntegrationsResult,
} from "@/modules/integrations/contracts";
import type { LandRecordsResult } from "@/modules/land-records/contracts";

export default async function IntegrationsPage() {
  const { actor, token } = await pageAuth();
  const canRead = actor.permissions.includes("integrations.read");
  const [integrations, records] = await Promise.all([
    canRead
      ? listIntegrations(token)
      : Promise.resolve({ items: [] } satisfies IntegrationsResult),
    actor.permissions.includes("records.read")
      ? listLandRecords(token, { page: 1 })
      : Promise.resolve({
          items: [],
          page: 1,
          page_size: 25,
          total: 0,
        } satisfies LandRecordsResult),
  ]);
  const runResults = await Promise.all(
    integrations.items.map((integration) =>
      listIntegrationRuns(token, integration.id, { page: 1 }),
    ),
  );
  const runs = runResults.flatMap((result: IntegrationRunsResult) => result.items);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Government exchange</p>
          <h1>Integrations</h1>
          <p className="muted">
            Idempotent export of exact approved record versions to clearly labelled mock LRMS,
            DILRMP and government database adapters.
          </p>
        </div>
        <span className="tag warning">Mock only</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Integration</th>
              <th>Mode</th>
              <th>Contract and mapping</th>
              <th>Configuration</th>
            </tr>
          </thead>
          <tbody>
            {integrations.items.map((integration) => (
              <tr key={integration.id}>
                <td>
                  <strong>{integration.name}</strong>
                  <span className="cell-secondary">{integration.adapter}</span>
                </td>
                <td>
                  {integration.mode === "MOCK" ? (
                    <span className="tag warning">Mock</span>
                  ) : (
                    <span className="tag danger">Live unsupported</span>
                  )}
                </td>
                <td>
                  {integration.contractVersion} · mapping v{integration.mappingVersion}
                  <span className="cell-secondary">
                    {integration.mapping.fieldKeys.length} configured fields
                  </span>
                </td>
                <td>
                  {integration.active ? "Active" : "Inactive"}
                  <span className="cell-secondary">Append-only · no secret stored</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!integrations.items.length && (
          <p className="empty">No integrations are configured for your department.</p>
        )}
      </div>
      <div className="toolbar">
        <p>{runs.length} recent export run{runs.length === 1 ? "" : "s"}</p>
        <span className="tag neutral">Run npm run worker:integrations</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Record</th>
              <th>Status</th>
              <th>Acknowledgement</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <strong>{run.integrationName}</strong>
                  <span className="cell-secondary">
                    Attempt {run.attempt} of {run.maxAttempts}
                  </span>
                </td>
                <td>
                  {run.recordDisplayId} v{run.recordVersion}
                  <span className="cell-secondary">{run.payloadSha256 ?? "Payload hash pending"}</span>
                </td>
                <td>
                  <span
                    className={`tag ${
                      run.status === "DELIVERED"
                        ? "success"
                        : run.status === "FAILED"
                          ? "danger"
                          : "neutral"
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.errorMessage && (
                    <span className="cell-secondary">{run.errorMessage}</span>
                  )}
                </td>
                <td>
                  {run.acknowledgement ? (
                    <>
                      <span className="tag warning">Mock acknowledgement</span>
                      <span className="cell-secondary">
                        {run.acknowledgement.destination_reference} ·{" "}
                        {run.acknowledgement.acknowledgementId.slice(0, 16)}
                      </span>
                    </>
                  ) : (
                    <span className="cell-secondary">Not acknowledged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!runs.length && <p className="empty">No exports have been queued.</p>}
      </div>
      <IntegrationWorkbench
        integrations={integrations.items}
        records={records.items}
        runs={runs}
        csrfToken={csrfToken(token!)}
        canManage={actor.permissions.includes("integrations.manage")}
        canExport={actor.permissions.includes("integrations.export")}
      />
      <p className="muted small">
        Need a larger run history? Refresh after the worker processes more events.{" "}
        <Link href="/audit">Review the audit trail</Link>.
      </p>
    </>
  );
}
