export default function DocumentsLoading() {
  return (
    <div role="status" aria-label="Loading documents" className="documents-loading">
      <div className="page-heading">
        <div><span className="skeleton skeleton-kicker" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-copy" /></div>
        <span className="skeleton skeleton-button" />
      </div>
      <div className="panel document-filter-skeleton"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /><span className="skeleton skeleton-button" /></div>
      <div className="skeleton-table" aria-hidden="true">
        <div className="skeleton-table-head" />
        {[0, 1, 2, 3, 4].map((row) => <div className="skeleton-table-row" key={row}><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>)}
      </div>
      <span className="sr-only">Loading documents…</span>
    </div>
  );
}
