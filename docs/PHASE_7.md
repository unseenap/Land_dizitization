# Phase 7 - synthetic cadastral parcels and reviewed GIS links

Phase 7 adds a scoped cadastral layer and a human-reviewed bridge from approved land records to parcels. It does not infer or fabricate real cadastral boundaries.

## Implemented

- Reviewed migration `0009_phase7_gis.sql` adds `gis_parcels`, `gis_record_links` and `gis_record_link_history`.
- Parcel geometry is stored as JSONB GeoJSON with explicit `source_crs`, `target_crs`, source name/reference, provenance object and a `synthetic` flag. `NULL` geometry is allowed only with a recorded missing-geometry reason.
- Parcels are immutable through ordinary application DML. The runtime role can read parcels but cannot create, update or delete them.
- A link proposal pins the parcel, land record and exact approved record version. Composite foreign keys require the version to belong to the same record and department.
- Proposals move only from `PROPOSED` to `APPROVED` or `REJECTED`. Review updates, link history and audit entries run in one transaction with actor/session locking.
- `GET /api/v1/gis/parcels`, `POST /api/v1/gis/record-links` and `POST /api/v1/gis/record-links/{id}/review` expose scoped list, proposal and review operations.
- The GIS workspace supports text/village/geometry filtering, explicit missing-geometry display, link proposals, reviews and link status.
- Local synthetic seeding creates three parcels per synthetic village: two static GeoJSON polygons and one intentionally geometry-missing parcel.

## Permissions and scope

- `gis.read` is granted to every seeded workspace role.
- `gis.link` is granted to `administrator` and `gis_officer`.
- `gis.review` is granted to `administrator` and `verifier`, separating proposal from review.
- Parcel reads and link mutations enforce department identity and district jurisdiction scope. Out-of-scope IDs return `404`; already proposed/reviewed links return `409`.

## Verification

- Tests were intentionally not run for this implementation at the user's request.
- Migration `0009_phase7_gis.sql` was applied to the local demo database and the synthetic parcel seed completed successfully.
- The migration, runtime code and documentation were reviewed. Add focused PostgreSQL integration and browser tests before treating Phase 7 as a verified baseline.

## Limits

- PostGIS is not installed in the local environment. This phase uses JSONB GeoJSON and does not provide spatial indexes, topology validation, area measurement or bbox queries.
- Parcel fixtures are explicitly synthetic static coordinates and must not be represented as real cadastral boundaries.
- The UI is a table/workspace, not an interactive Leaflet map.
- Area discrepancy warnings and external cadastral adapter ingestion remain future work.
