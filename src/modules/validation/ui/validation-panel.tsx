import type { ValidationView } from "../contracts";
import type { DuplicateCandidateView } from "@/modules/duplicates/contracts";
import { DuplicateList } from "@/modules/duplicates/ui/duplicate-list";

export function ValidationPanel({
  validation,
  csrfToken,
  canResolveDuplicates,
}: {
  validation: ValidationView & { duplicates: DuplicateCandidateView[] };
  csrfToken: string;
  canResolveDuplicates: boolean;
}) {
  if (!validation.run)
    return (
      <section className="panel">
        <h2>Extraction and validation</h2>
        <p className="muted">No accepted model result is available yet.</p>
      </section>
    );
  return (
    <>
      <section className="panel">
        <div className="toolbar">
          <div>
            <h2>Extraction and validation</h2>
            <span className="cell-secondary">
              Revision {validation.run.documentRevision} ·{" "}
              {validation.run.blockerCount} blockers ·{" "}
              {validation.run.duplicateCount} duplicate candidates
            </span>
          </div>
          <span className="tag">{validation.run.status}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Source value</th>
                <th>Normalized</th>
                <th>Confidence</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {validation.fields.map((field) => (
                <tr key={field.fieldKey}>
                  <td>
                    {field.label}
                    {field.required ? " *" : ""}
                    {field.critical ? " (critical)" : ""}
                  </td>
                  <td>{field.sourceValue === null ? "—" : String(field.sourceValue)}</td>
                  <td>{field.normalizedValue === null ? "—" : String(field.normalizedValue)}</td>
                  <td>
                    {field.confidence === null
                      ? "Not reported"
                      : `${(field.confidence * 100).toFixed(0)}%`}
                  </td>
                  <td>
                    {field.evidence.length
                      ? field.evidence
                          .map((item) => `p${item.page}: ${item.sourceText}`)
                          .join(" | ")
                      : "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Validation findings</h3>
        <div className="stack compact">
          {validation.findings.map((finding, index) => (
            <p className="small" key={`${finding.code}-${finding.fieldKey ?? "record"}-${index}`}>
              <strong>{finding.code}</strong> · {finding.message}
              {finding.fieldKey ? ` (${finding.fieldKey})` : ""}
            </p>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Duplicate review</h2>
        <DuplicateList
          csrfToken={csrfToken}
          initial={validation.duplicates}
          canResolve={canResolveDuplicates}
        />
      </section>
    </>
  );
}
