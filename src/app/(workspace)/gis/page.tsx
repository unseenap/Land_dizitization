import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { csrfToken } from "@/modules/identity/server/service";
import { getMasterData } from "@/modules/master-data/server/service";
import { listGisParcels } from "@/modules/gis/server/service";
import { GisLinkWorkbench } from "@/modules/gis/ui/link-workbench";
import { listLandRecords } from "@/modules/land-records/server/service";
import type { LandRecordsResult } from "@/modules/land-records/contracts";

export default async function GisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { actor, token } = await pageAuth();
  const params = await searchParams;
  const filters = Object.fromEntries(
    Object.entries(params).filter(
      ([key, value]) =>
        ["q", "page", "villageId", "geometry"].includes(key) &&
        typeof value === "string" &&
        value,
    ),
  );
  const [parcels, tree, records] = await Promise.all([
    listGisParcels(token, filters),
    getMasterData(token),
    actor.permissions.includes("records.read")
      ? listLandRecords(token, { page: 1 })
      : Promise.resolve({ items: [], page: 1, page_size: 25, total: 0 } satisfies LandRecordsResult),
  ]);
  const pageLink = (page: number) =>
    `/gis?${new URLSearchParams({ ...filters, page: String(page) } as Record<string, string>)}`;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cadastral layer</p>
          <h1>GIS parcels</h1>
          <p className="muted">
            Synthetic parcels with explicit CRS and provenance inside your assigned jurisdictions.
          </p>
        </div>
        <span className="tag warning">Synthetic fixtures</span>
      </div>
      <form className="filter-grid panel">
        <label>
          Search
          <input name="q" defaultValue={String(filters.q ?? "")} maxLength={100} placeholder="Parcel, source or village" />
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
          Geometry
          <select name="geometry" defaultValue={String(filters.geometry ?? "all")}>
            <option value="all">All parcels</option>
            <option value="present">With geometry</option>
            <option value="missing">Missing geometry</option>
          </select>
        </label>
        <button className="button">Apply filters</button>
      </form>
      <div className="toolbar">
        <p>
          {parcels.total} parcel{parcels.total === 1 ? "" : "s"}
        </p>
        <span className="tag neutral">EPSG:4326 → EPSG:4326</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Parcel</th>
              <th>Location</th>
              <th>Geometry</th>
              <th>Source and provenance</th>
            </tr>
          </thead>
          <tbody>
            {parcels.items.map((parcel) => (
              <tr key={parcel.id}>
                <td>
                  <strong>{parcel.parcelNumber}</strong>
                  <span className="cell-secondary">{parcel.synthetic ? "Synthetic" : "External"}</span>
                </td>
                <td>
                  {parcel.village}
                  <span className="cell-secondary">{parcel.district}</span>
                </td>
                <td>
                  {parcel.geometry ? (
                    <span className="tag success">GeoJSON present</span>
                  ) : (
                    <>
                      <span className="tag danger">Missing</span>
                      <span className="cell-secondary">{parcel.missingGeometryReason}</span>
                    </>
                  )}
                </td>
                <td>
                  {parcel.sourceName}
                  <span className="cell-secondary">
                    {parcel.sourceReference} · {parcel.sourceCrs} → {parcel.targetCrs}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!parcels.items.length && <p className="empty">No parcels match.</p>}
      </div>
      <div className="pagination">
        <span>
          Page {parcels.page} of {Math.max(1, Math.ceil(parcels.total / 25))}
        </span>
        <div>
          {parcels.page > 1 && (
            <Link className="button" href={pageLink(parcels.page - 1)}>
              Previous
            </Link>
          )}
          {parcels.page * 25 < parcels.total && (
            <Link className="button" href={pageLink(parcels.page + 1)}>
              Next
            </Link>
          )}
        </div>
      </div>
      <GisLinkWorkbench
        parcels={parcels.items}
        records={records.items}
        links={parcels.links}
        csrfToken={csrfToken(token!)}
        canLink={actor.permissions.includes("gis.link")}
        canReview={actor.permissions.includes("gis.review")}
      />
    </>
  );
}
