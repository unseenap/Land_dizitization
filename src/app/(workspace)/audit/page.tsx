import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { listAudit } from "@/modules/audit/server/service";
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { actor, token } = await pageAuth();
  if (!actor.permissions.includes("audit.read"))
    return (
      <section className="panel">
        <h1>Access restricted</h1>
        <p>Your role does not include audit history.</p>
      </section>
    );
  const raw = Number((await searchParams).page ?? 1);
  const page = Number.isInteger(raw) && raw > 0 && raw <= 10000 ? raw : 1;
  const data = await listAudit(token, page);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Accountability</p>
          <h1>Audit history</h1>
          <p className="muted">
            Recorded security and account changes within your access scope.
          </p>
        </div>
        <span className="tag neutral">Append-only history</span>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Audit events</caption>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((event) => (
              <tr key={event.id}>
                <td className="nowrap">
                  {event.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td>
                  <strong>
                    {event.action.replaceAll(".", " / ").replaceAll("_", " ")}
                  </strong>
                </td>
                <td>
                  <span className="mono small">
                    {event.actorId?.slice(0, 8) ?? "System"}
                  </span>
                </td>
                <td>
                  <details>
                    <summary>View event</summary>
                    <pre>
                      {JSON.stringify(
                        {
                          id: event.id,
                          actorId: event.actorId,
                          entityId: event.entityId,
                          requestId: event.requestId,
                          details: event.details,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && <p className="empty">No audit events yet.</p>}
      </div>
      <div className="pagination">
        {page > 1 ? (
          <Link className="button" href={`/audit?page=${page - 1}`}>
            Previous
          </Link>
        ) : (
          <span />
        )}
        <span>
          Page {page} · {data.total} events
        </span>
        {page * 25 < data.total ? (
          <Link className="button" href={`/audit?page=${page + 1}`}>
            Next
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
