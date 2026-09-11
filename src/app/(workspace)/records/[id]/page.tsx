import Link from "next/link";
import { notFound } from "next/navigation";
import { pageAuth } from "@/server/page-auth";
import {
  getLandRecord,
  getLandRecordVersions,
} from "@/modules/land-records/server/service";

export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { token } = await pageAuth();
  const { id } = await params;
  const [record, versions] = await Promise.all([
    getLandRecord(token, id).catch(() => notFound()),
    getLandRecordVersions(token, id).catch(() => notFound()),
  ]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Link href="/records">Records</Link> / {record.displayId}
          </p>
          <h1>{record.ownerName ?? record.documentTitle}</h1>
          <p className="muted">
            {record.village} · {record.tehsil} · {record.district} ·{" "}
            {record.typeName ?? "Unclassified"} · Version {record.version}
          </p>
        </div>
        <div className="toolbar">
          <Link className="button" href={`/documents/${record.documentId}`}>
            Source document
          </Link>
          <Link className="button" href={`/verification/${record.taskId}`}>
            Verification evidence
          </Link>
        </div>
      </div>

      <div className="document-grid">
        <section className="panel">
          <h2>Current version</h2>
          <dl className="detail-list">
            <div>
              <dt>Owner</dt>
              <dd>{record.ownerName ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Survey / Khasra / Khata</dt>
              <dd>
                {[record.surveyNumber, record.khasraNumber, record.khataNumber]
                  .filter(Boolean)
                  .join(" · ") || "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>
                {record.plotArea === null
                  ? "Unavailable"
                  : `${record.plotArea} ${record.areaUnit ?? ""}`.trim()}
              </dd>
            </div>
            <div>
              <dt>Registration</dt>
              <dd>
                {[record.registrationNumber, record.registrationDate]
                  .filter(Boolean)
                  .join(" · ") || "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Mutation status</dt>
              <dd>{record.isMutated ? "Mutated" : "No mutation recorded"}</dd>
            </div>
            <div>
              <dt>Approved</dt>
              <dd>{new Date(record.approvedAt).toLocaleString("en-IN")}</dd>
            </div>
          </dl>
          <p className="small muted">Approval reason: {record.approvalReason}</p>
          <p className="small">Source SHA-256: {record.sourceSha256}</p>
          <p className="small">Artifact SHA-256: {record.artifactSha256}</p>
        </section>

        <section className="panel">
          <h2>Owners, mutations and registration</h2>
          <h3>Owners</h3>
          {record.owners.length ? (
            record.owners.map((owner) => (
              <p className="small" key={`${owner.sequence}-${owner.name}`}>
                <strong>{owner.name}</strong> ·{" "}
                {owner.relationship ?? "Relationship unavailable"} ·{" "}
                {owner.ownershipShare === null
                  ? "Share unavailable"
                  : `${owner.ownershipShare}%`}
              </p>
            ))
          ) : (
            <p className="small muted">No owner materialized from this schema.</p>
          )}
          <h3>Mutations</h3>
          {record.mutations.length ? (
            record.mutations.map((mutation) => (
              <p className="small" key={mutation.sequence}>
                <strong>{mutation.mutationNumber ?? "Unnumbered"}</strong> ·{" "}
                {mutation.mutationDate ?? "Date unavailable"}
              </p>
            ))
          ) : (
            <p className="small muted">No mutation recorded.</p>
          )}
          <h3>Registration</h3>
          {record.registration.length ? (
            record.registration.map((registration) => (
              <p className="small" key={registration.sequence}>
                <strong>{registration.registrationNumber ?? "Unnumbered"}</strong> ·{" "}
                {registration.registrationDate ?? "Date unavailable"}
              </p>
            ))
          ) : (
            <p className="small muted">No registration recorded.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Approved fields</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Approved value</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {record.fields.map((field) => (
                <tr key={field.fieldKey}>
                  <td>{field.label}</td>
                  <td>{field.value === null ? "Unavailable" : String(field.value)}</td>
                  <td>
                    {field.confidence === null
                      ? "Unavailable"
                      : `${Math.round(field.confidence * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Version history</h2>
        {versions.map((version) => (
          <div className="history-entry" key={version.versionId}>
            <strong>Version {version.version}</strong>
            <span className="cell-secondary">
              {new Date(version.approvedAt).toLocaleString("en-IN")} ·{" "}
              {version.ownerName ?? "Owner unavailable"}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
