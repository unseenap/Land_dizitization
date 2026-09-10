import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
export default async function Dashboard() {
  const { actor } = await pageAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h1>Welcome, {actor.name}.</h1>
          <p className="muted">
            Preserve source documents, manage your team and review activity.
          </p>
        </div>
        <span className="tag">Document intake available</span>
      </div>
      <div className="overview-grid">
        <section className="panel">
          <h2>Your access</h2>
          <dl className="detail-list">
            <div>
              <dt>Department</dt>
              <dd>{actor.departmentName}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>
                {actor.roles.map((r) => r.replaceAll("_", " ")).join(", ")}
              </dd>
            </div>
            <div>
              <dt>Jurisdiction</dt>
              <dd>
                {actor.scopes.map((s) => s.name).join(", ") ||
                  "No jurisdiction assigned"}
              </dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{actor.email}</dd>
            </div>
          </dl>
        </section>
        <section className="panel">
          <h2>Available in this phase</h2>
          <div className="action-list">
            <Link href="/documents">
              <strong>
                Document workspace <span aria-hidden="true">→</span>
              </strong>
              <span>
                Browse preserved originals, previews and metadata history.
              </span>
            </Link>
            {actor.permissions.includes("users.manage") && (
              <Link href="/admin/users">
                <strong>
                  Users & access <span aria-hidden="true">→</span>
                </strong>
                <span>Add accounts and assign scoped permissions.</span>
              </Link>
            )}
            {actor.permissions.includes("audit.read") && (
              <Link href="/audit">
                <strong>
                  Audit history <span aria-hidden="true">→</span>
                </strong>
                <span>Review sign-ins and user access changes.</span>
              </Link>
            )}
            <div>
              <strong>Secure session</strong>
              <span>
                Your account is authenticated. Sign out when finished.
              </span>
            </div>
          </div>
        </section>
      </div>
      <section className="next-phase">
        <span className="tag neutral">Coming in later phases</span>
        <h2>Processing and verification come next.</h2>
        <p>
          Documents can now be uploaded and inspected. OCR, extraction,
          verification, maps and processing statistics will be introduced in
          later phases. No model results or accuracy measurements are claimed.
        </p>
      </section>
    </>
  );
}
