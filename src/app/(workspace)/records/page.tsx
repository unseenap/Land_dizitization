import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { listLandRecords } from "@/modules/land-records/server/service";
import { listTypes } from "@/modules/document-types/server/service";
import { getMasterData } from "@/modules/master-data/server/service";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await pageAuth();
  const params = await searchParams;
  const filters = Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) =>
        ["q", "page", "villageId", "typeId"].includes(key) &&
        typeof value === "string" &&
        value,
    ),
  );
  const [result, types, tree] = await Promise.all([
    listLandRecords(token, filters),
    listTypes(token),
    getMasterData(token),
  ]);
  const pageLink = (page: number) =>
    `/records?${new URLSearchParams({ ...filters, page: String(page) } as Record<string, string>)}`;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Approved land records</p>
          <h1>Records</h1>
          <p className="muted">
            Searchable immutable versions within your assigned jurisdictions.
          </p>
        </div>
        <span className="tag neutral">Human approved</span>
      </div>
      <form className="filter-grid panel">
        <label>
          Search
          <input
            name="q"
            defaultValue={String(filters.q ?? "")}
            placeholder="Owner, survey/khasra/khata, registration or record ID"
            maxLength={100}
          />
        </label>
        <label>
          Village
          <select name="villageId" defaultValue={String(filters.villageId ?? "")}>
            <option value="">All villages</option>
            {tree.villages.map((village) => (
              <option key={village.id} value={village.id}>
                {village.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Document type
          <select name="typeId" defaultValue={String(filters.typeId ?? "")}>
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button">Apply filters</button>
      </form>
      <div className="toolbar">
        <p>
          {result.total} record{result.total === 1 ? "" : "s"}
        </p>
        <span className="tag neutral">Current approved versions</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Record</th>
              <th>Owner / identifiers</th>
              <th>Location</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((record) => (
              <tr key={record.id}>
                <td>
                  <Link href={`/records/${record.id}`}>
                    <strong>{record.displayId} →</strong>
                  </Link>
                  <span className="cell-secondary">{record.documentTitle}</span>
                </td>
                <td>
                  {record.ownerName ?? "Owner unavailable"}
                  <span className="cell-secondary">
                    {[record.surveyNumber, record.khasraNumber, record.khataNumber]
                      .filter(Boolean)
                      .join(" · ") || "Identifiers unavailable"}
                  </span>
                </td>
                <td>
                  {record.village}
                  <span className="cell-secondary">{record.district}</span>
                </td>
                <td>
                  Version {record.version}
                  <span className="cell-secondary">
                    {new Date(record.approvedAt).toLocaleDateString("en-IN")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!result.items.length && <p className="empty">No approved records match.</p>}
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
