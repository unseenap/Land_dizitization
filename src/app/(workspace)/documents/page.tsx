import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { listDocuments } from "@/modules/documents/server/service";
import { listTypes } from "@/modules/document-types/server/service";
import { getMasterData } from "@/modules/master-data/server/service";
export default async function Documents({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token, actor } = await pageAuth();
  const params = await searchParams;
  const filters = Object.fromEntries(
    Object.entries(params).filter(
      ([k, v]) =>
        ["q", "page", "villageId", "typeId"].includes(k) &&
        typeof v === "string" &&
        v,
    ),
  );
  const [result, types, tree] = await Promise.all([
    listDocuments(token, filters),
    listTypes(token),
    getMasterData(token),
  ]);
  const pageLink = (page: number) =>
    `/documents?${new URLSearchParams({ ...filters, page: String(page) } as Record<string, string>)}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Document workspace</p>
          <h1>Documents</h1>
          <p className="muted">
            Preserved originals within your assigned jurisdictions.
          </p>
        </div>
        {actor.permissions.includes("documents.upload") && (
          <Link className="button primary" href="/documents/upload">
            Upload documents
          </Link>
        )}
      </div>
      <form className="filter-grid panel">
        <label>
          Search
          <input
            name="q"
            defaultValue={String(filters.q ?? "")}
            placeholder="Title, document ID or reference"
            maxLength={100}
          />
        </label>
        <label>
          Village
          <select
            name="villageId"
            defaultValue={String(filters.villageId ?? "")}
          >
            <option value="">All villages</option>
            {tree.villages.map((v) => (
              <option value={v.id} key={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Document type
          <select name="typeId" defaultValue={String(filters.typeId ?? "")}>
            <option value="">All types</option>
            {types.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button">Apply filters</button>
      </form>
      <div className="toolbar">
        <p>
          {result.total} document{result.total === 1 ? "" : "s"}
        </p>
        <span className="tag neutral">Originals retained</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Document</th>
              <th>Location</th>
              <th>Type / version</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <Link href={`/documents/${doc.id}`}>
                    <strong>{doc.title} →</strong>
                  </Link>
                  <span className="cell-secondary">
                    {doc.displayId} · {doc.pageCount} page(s)
                  </span>
                </td>
                <td>
                  {doc.village}
                  <span className="cell-secondary">{doc.district}</span>
                </td>
                <td>
                  {doc.typeName ?? "Unclassified"}
                  <span className="cell-secondary">
                    {doc.schemaVersion
                      ? `Schema v${doc.schemaVersion}`
                      : "No schema assigned"}
                  </span>
                </td>
                <td>
                  <span className="tag">{doc.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.items.length && (
          <p className="empty">No documents match this view.</p>
        )}
      </div>
      <div className="pagination">
        <span>
          Page {result.page} of {Math.max(1, Math.ceil(result.total / 25))}
        </span>
        <div>
          {result.page > 1 && (
            <Link className="button" href={pageLink(result.page - 1)}>
              Previous
            </Link>
          )}
          {result.page * 25 < result.total && (
            <Link className="button" href={pageLink(result.page + 1)}>
              Next
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
