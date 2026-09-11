import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { getDashboardSummary } from "@/modules/dashboard/server/service";
import type { DashboardSummary } from "@/modules/dashboard/contracts";
import { AppIcon } from "@/components/ui/app-icon";
import { AnimatedContent } from "@/components/react-bits/animated-content";
import { CountUp } from "@/components/react-bits/count-up";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function confidence(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

export default async function Dashboard() {
  const { actor, token } = await pageAuth();
  const canReadDashboard = actor.permissions.includes("dashboard.read");
  const summary: DashboardSummary | null = canReadDashboard
    ? await getDashboardSummary(token)
    : null;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h1>Welcome, {actor.name}.</h1>
          <p className="muted">
            Scoped workflow metrics, validation status and jurisdiction progress.
          </p>
        </div>
        <span className="tag"><span className="status-dot" />Live scoped metrics</span>
      </div>
      {summary ? (
        <>
          <BentoGrid className="dashboard-bento">
            <AnimatedContent><BentoCard title="Documents processed" eyebrow="Workflow" icon={<AppIcon name="processing" size={22} />} className="metric metric-featured">
              <strong><CountUp value={summary.workflow.documentsProcessed} /></strong>
              <span>of {summary.workflow.documentsTotal} · {percent(summary.workflow.processedRate)}</span>
              <div className="progress-track" aria-label={`${percent(summary.workflow.processedRate)} processed`}><span style={{ width: percent(summary.workflow.processedRate) }} /></div>
            </BentoCard></AnimatedContent>
            <AnimatedContent delay={0.04}><BentoCard title="Pending verification" eyebrow="Review queue" icon={<AppIcon name="users" size={22} />} className="metric">
              <strong><CountUp value={summary.workflow.documentsPendingVerification} /></strong>
              <span>Includes records returned for correction</span>
            </BentoCard></AnimatedContent>
            <AnimatedContent delay={0.08}><BentoCard title="Approved records" eyebrow="Human approved" icon={<AppIcon name="success" size={22} />} className="metric metric-success">
              <strong><CountUp value={summary.workflow.documentsApproved} /></strong>
              <span>{percent(summary.workflow.approvedRate)} of workflow documents</span>
            </BentoCard></AnimatedContent>
            <AnimatedContent delay={0.12}><BentoCard title="Processing failures" eyebrow="Needs attention" icon={<AppIcon name="error" size={22} />} className="metric metric-danger">
              <strong><CountUp value={summary.workflow.documentsProcessingFailed} /></strong>
              <span>{summary.errors.length} recorded error type(s)</span>
            </BentoCard></AnimatedContent>
            <AnimatedContent delay={0.16}><BentoCard title="Model confidence" eyebrow="Current average" icon={<AppIcon name="dashboard" size={22} />} className="metric">
              <strong>{confidence(summary.confidence.averageConfidence)}</strong>
              <span>{summary.confidence.lowConfidenceFields} low-confidence fields</span>
            </BentoCard></AnimatedContent>
            <AnimatedContent delay={0.2}><BentoCard title="Not measured" eyebrow="Extraction accuracy" icon={<AppIcon name="warning" size={22} />} className="metric metric-warning">
              <p className="metric-note">Confidence is not accuracy. Use an approved feedback dataset to measure it.</p>
            </BentoCard></AnimatedContent>
          </BentoGrid>
          <div className="overview-grid">
            <section className="panel">
              <h2>Validation status</h2>
              <dl className="detail-list">
                <div>
                  <dt>Validated</dt>
                  <dd>{summary.validation.validatedRuns}</dd>
                </div>
                <div>
                  <dt>Blocked</dt>
                  <dd>{summary.validation.blockedRuns}</dd>
                </div>
                <div>
                  <dt>Pass findings</dt>
                  <dd>{summary.validation.passFindings}</dd>
                </div>
                <div>
                  <dt>Warnings</dt>
                  <dd>{summary.validation.warningFindings}</dd>
                </div>
                <div>
                  <dt>Failures</dt>
                  <dd>{summary.validation.failFindings}</dd>
                </div>
                <div>
                  <dt>Not checked</dt>
                  <dd>{summary.validation.notCheckedFindings}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <h2>Error statistics</h2>
              {summary.errors.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Count</th>
                        <th>Last message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.errors.map((error) => (
                        <tr key={error.code}>
                          <td>{error.code}</td>
                          <td>{error.count}</td>
                          <td>{error.lastMessage ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty">No processing errors are recorded.</p>
              )}
            </section>
          </div>
          <section>
            <div className="section-title">
              <h2>State-wise progress</h2>
              <span className="tag neutral">
                Workflow ratios · not inventory completion
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>State</th>
                    <th>Documents</th>
                    <th>Processed</th>
                    <th>Pending</th>
                    <th>Approved</th>
                    <th>Failed</th>
                    <th>Processed share</th>
                    <th>Approved share</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.states.map((state) => (
                    <tr key={state.id}>
                      <td>{state.name}</td>
                      <td>{state.documents}</td>
                      <td>{state.processed}</td>
                      <td>{state.pendingVerification}</td>
                      <td>{state.approved}</td>
                      <td>{state.processingFailed}</td>
                      <td>{percent(state.processedRate)}</td>
                      <td>{percent(state.approvedRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!summary.states.length && (
                <p className="empty">No states are assigned to your scope.</p>
              )}
            </div>
          </section>
          <section>
            <div className="section-title">
              <h2>District-wise progress</h2>
              <span className="tag neutral">Known document denominator</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>District</th>
                    <th>State</th>
                    <th>Documents</th>
                    <th>Processed</th>
                    <th>Pending</th>
                    <th>Approved</th>
                    <th>Failed</th>
                    <th>Approved share</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.districts.map((district) => (
                    <tr key={district.id}>
                      <td>{district.name}</td>
                      <td>{district.stateName ?? "—"}</td>
                      <td>{district.documents}</td>
                      <td>{district.processed}</td>
                      <td>{district.pendingVerification}</td>
                      <td>{district.approved}</td>
                      <td>{district.processingFailed}</td>
                      <td>{percent(district.approvedRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!summary.districts.length && (
                <p className="empty">No districts are assigned to your scope.</p>
              )}
            </div>
          </section>
          <p className="muted small">
            Generated {new Date(summary.generatedAt).toLocaleString()} for{" "}
            {summary.scope.departmentName} across{" "}
            {summary.scope.jurisdictionCount} jurisdiction(s). Progress shares
            compare workflow documents; no total land-record inventory
            denominator has been supplied.
          </p>
        </>
      ) : (
        <section className="next-phase">
          <span className="tag neutral">Dashboard unavailable</span>
          <h2>Your role does not have dashboard access.</h2>
          <p>Contact an administrator if you need scoped workflow metrics.</p>
        </section>
      )}
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
                {actor.roles.map((role) => role.replaceAll("_", " ")).join(", ")}
              </dd>
            </div>
            <div>
              <dt>Jurisdiction</dt>
              <dd>
                {actor.scopes.map((scope) => scope.name).join(", ") ||
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
          <h2>Workflow shortcuts</h2>
          <div className="action-list">
            <Link href="/documents">
              <strong>
                Document workspace <span aria-hidden="true">→</span>
              </strong>
              <span>Browse preserved originals, previews and processing.</span>
            </Link>
            <Link href="/records">
              <strong>
                Approved records <span aria-hidden="true">→</span>
              </strong>
              <span>Search current approved record versions.</span>
            </Link>
            {actor.permissions.includes("verification.read") && (
              <Link href="/verification">
                <strong>
                  Verification queue <span aria-hidden="true">→</span>
                </strong>
                <span>Review fields, evidence and duplicate decisions.</span>
              </Link>
            )}
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
                <span>Review sign-ins and access changes.</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
