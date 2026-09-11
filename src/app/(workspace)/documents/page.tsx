import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { listDocuments } from "@/modules/documents/server/service";
import { listTypes } from "@/modules/document-types/server/service";
import { getMasterData } from "@/modules/master-data/server/service";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";

function statusMeta(status: string): {
  label: string;
  tone: string;
  icon: AppIconName;
} {
  const normalized = status.replaceAll("_", " ").toLowerCase();
  if (status.includes("APPROVED")) return { label: normalized, tone: "success", icon: "success" };
  if (status.includes("FAILED") || status.includes("REJECTED")) return { label: normalized, tone: "danger", icon: "error" };
  if (status.includes("PENDING") || status.includes("RETURNED")) return { label: normalized, tone: "warning", icon: "warning" };
  if (status.includes("PROCESSING")) return { label: normalized, tone: "info", icon: "processing" };
  return { label: normalized, tone: "neutral", icon: "document" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
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
  const hasFilters = Boolean(filters.q || filters.villageId || filters.typeId);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Document workspace</p>
          <h1>Documents</h1>
          <p className="muted">Search preserved originals within your assigned jurisdictions.</p>
        </div>
        {actor.permissions.includes("documents.upload") && (
          <Link className="button primary" href="/documents/upload">
            <AppIcon name="upload" size={17} /> Upload documents
          </Link>
        )}
      </div>
      <form className="filter-grid panel document-filters" aria-label="Document filters">
        <label>
          Search
          <span className="input-control"><AppIcon name="search" size={17} /><input
            name="q"
            defaultValue={String(filters.q ?? "")}
            placeholder="Title, document ID or reference"
            maxLength={100}
          /></span>
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
        <div className="filter-actions">
          <button className="button primary" type="submit">Apply filters</button>
          {hasFilters && <Link className="button" href="/documents"><AppIcon name="clear" size={16} />Clear</Link>}
        </div>
      </form>
      <div className="toolbar">
        <p>
          <strong>{result.total}</strong> document{result.total === 1 ? "" : "s"} in this view
        </p>
        <span className="tag neutral">Originals retained</span>
      </div>
      <div className="table-wrap documents-table">
        <table aria-label="Documents">
          <thead>
            <tr>
              <th>Document</th>
              <th>Location</th>
              <th>Type / version</th>
              <th>Added</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((doc) => {
              const status = statusMeta(doc.status);
              return (
              <tr key={doc.id} className="document-row">
                <td>
                  <Link className="document-title-link" href={`/documents/${doc.id}`}>
                    <span className="file-type-icon"><AppIcon name={doc.mimeType === "application/pdf" ? "filePdf" : "fileImage"} size={20} /></span>
                    <span><strong>{doc.title}</strong><span className="cell-secondary">{doc.displayId} · {doc.pageCount} page(s)</span></span>
                    <AppIcon className="row-arrow" name="arrow" size={16} />
                  </Link>
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
                <td><time dateTime={doc.createdAt}>{formatDate(doc.createdAt)}</time></td>
                <td>
                  <span className={`status-badge ${status.tone}`}><AppIcon name={status.icon} size={14} />{status.label}</span>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <div className="document-card-list" aria-label="Documents">
        {result.items.map((doc) => {
          const status = statusMeta(doc.status);
          return <article className="document-result-card" key={doc.id}>
            <div className="document-card-top">
              <span className="file-type-icon"><AppIcon name={doc.mimeType === "application/pdf" ? "filePdf" : "fileImage"} size={21} /></span>
              <span className={`status-badge ${status.tone}`}><AppIcon name={status.icon} size={14} />{status.label}</span>
            </div>
            <div><h2>{doc.title}</h2><p className="mono muted small">{doc.displayId}</p></div>
            <dl className="document-card-details">
              <div><dt>Location</dt><dd>{doc.village}<span>{doc.district}</span></dd></div>
              <div><dt>Type</dt><dd>{doc.typeName ?? "Unclassified"}<span>{doc.schemaVersion ? `Schema v${doc.schemaVersion}` : "No schema assigned"}</span></dd></div>
              <div><dt>Added</dt><dd><time dateTime={doc.createdAt}>{formatDate(doc.createdAt)}</time><span>{doc.pageCount} page(s)</span></dd></div>
            </dl>
            <Link className="button document-open" href={`/documents/${doc.id}`}>Open document <AppIcon name="arrow" size={16} /></Link>
          </article>;
        })}
      </div>
      {!result.items.length && (
        <section className="empty-state" aria-live="polite">
          <span className="empty-state-icon"><AppIcon name={hasFilters ? "search" : "documents"} size={28} /></span>
          <h2>{hasFilters ? "No documents match these filters" : "No documents are available"}</h2>
          <p>{hasFilters ? "Clear the filters or try a different title, ID, reference, village or document type." : "There are no preserved documents in your current jurisdiction scope."}</p>
          <div className="empty-state-actions">
            {hasFilters && <Link className="button" href="/documents">Clear filters</Link>}
            {!hasFilters && actor.permissions.includes("documents.upload") && <Link className="button primary" href="/documents/upload"><AppIcon name="upload" size={16} />Upload documents</Link>}
          </div>
        </section>
      )}
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
