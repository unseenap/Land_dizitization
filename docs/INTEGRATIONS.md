# Integrations

## Two distinct adapter categories

Model adapter: authenticated communication with the separately deployed inference service, specified in MODEL_API_CONTRACT. Government adapters: approved-record exchange and master-data checks. The model never directly sends records to government systems.

## Government interfaces

| Adapter | Planned responsibility |
|---|---|
| LRMSAdapter | Approved record exchange/acknowledgement |
| DILRMPAdapter | Department-supplied modernization exchange mapping |
| GovernmentDatabaseAdapter | Registration and administrative lookups |
| GISAdapter | Spatial layer/parcel queries |
| CadastralMapAdapter | Source cadastral layers and provenance |

Initial implementations will be MockLRMSAdapter, MockDILRMPAdapter, MockGovernmentDatabaseAdapter and MockCadastralAdapter. No official endpoints are assumed. DILRMP is not treated as a guaranteed universal public API.

Each response includes source/version, mode mock/live, lookup time, outcome and errors. Unavailability is NOT_CHECKED, not a factual mismatch. UI and payloads clearly label fixtures.

## Approved snapshot export

Envelope: contract_version, mapping_version, record_id/version, source_document_id, jurisdiction, document_type, configured fields, approval, parcel links, provenance, is_mock and idempotency_key. Minimize personal fields; source images are excluded unless an explicit destination mapping permits them.

Validate mapping before enqueue. Outbox → delivery attempt → acknowledgement tracks a pinned approved version and mapping. Retries retain the same logical key. Reconcile unknown delivery outcomes when destination idempotency is absent. Store restricted summaries, no credentials. Failed export preserves approval; required-destination acknowledgement controls delivery summary only.

## GIS / cadastral behavior

Use PostGIS geometry and bounded GeoJSON in WGS84 longitude/latitude order. Retain source CRS, dataset provenance, version and usage/attribution information. Geometry import validates topology and jurisdiction. A village centroid is never represented as a parcel boundary.

GIS officers review links with evidence and reasons. Parcel/record area discrepancies use known units and appropriate spatial measurement; thresholds are configurable and results are review warnings. Approved attributes are not silently rewritten from map data.

## Real integration prerequisites

Obtain authorized endpoint specification, sandbox, credentials, data-sharing terms, administrative codes, mapping and rate limits. Add contract/security/reconciliation tests before enabling live mode. Actual production integration requires authorized official APIs, schemas, credentials and network access from the respective government systems.
