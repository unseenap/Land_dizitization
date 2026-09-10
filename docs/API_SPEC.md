# Next.js application API

Base /api/v1 uses Next.js Route Handlers. Phases 1 and 2 implement identity, audit, master-data, document-type and document intake endpoints. Phase 3 adds processing submission and status endpoints backed by durable jobs and a server-only model adapter. Phase 4 adds scoped extraction/validation reads and audited duplicate resolution. Later workflow endpoints remain proposed; the default model adapter is a labelled no-inference mock.

Current payloads use camelCase: user creation accepts name, email, password, role, scopeIds; access updates accept expectedRevision, active, role, scopeIds. Login returns csrfToken; /auth/me returns user and csrfToken. Send X-CSRF-Token and matching Origin on authenticated mutations. Paginated user/document/audit collections use fixed page_size 25. Later workflow examples below are proposed contracts, not currently callable endpoints.

## Implemented Phase 2 and Phase 3 endpoints

| Endpoint | Payload / response |
|---|---|
| GET /master-data | Scoped `{states,districts,tehsils,villages}` hierarchy |
| POST /master-data | `{kind,name,code,parentId?,jurisdictionId?}`; administrator; 201 |
| GET /document-types | `{items}` containing current schema version and field definitions for each department type |
| POST /document-types | `{code,name,fields,reason}`; administrator; 201 `{id,version}` |
| POST /document-types/{id}/schema-versions | `{expectedVersion,fields,reason}`; administrator; 201; stale version 409 |
| POST /documents/upload | Multipart exactly `file` and JSON-string `metadata`; UUID `Idempotency-Key` header; operator |
| GET /documents | `page`, `q` (title/display ID/reference), optional `villageId` and `typeId`; scoped `{items,page,page_size,total}` |
| GET /documents/{id} | Safe document DTO; no private object keys |
| PATCH /documents/{id} | `{expectedRevision,title,language,reference,notes,reason}`; uploader only; 200 `{id,revision}` |
| GET /documents/{id}/content | Authenticated PDF bytes or reencoded WebP preview; `?download=1` returns unchanged source as attachment |
| GET /documents/{id}/pages | `{items:[{pageNumber,width,height}]}`; PDF points or source image pixels |
| GET /documents/{id}/history | `{metadata,status}` with immutable revisions, reasons, actors and timestamps |
| POST /documents/{id}/process | `{tasks?,languageHints?,requestedModelVersion?}`; authorized operator/admin; 202 with durable job summary; idempotent for document revision |
| GET /documents/{id}/processing | Scoped latest job with status, attempts, artifacts and immutable job history |
| GET /documents/{id}/validation | Scoped extraction fields, evidence, findings, blockers and duplicate candidates |
| POST /duplicates/{id}/resolve | `{decision,reason}`; verifier/admin only; CSRF protected; records audited decision |

Upload metadata is `{title,villageId,schemaVersionId,language?,reference?,notes?}`. `villageId` is required, `schemaVersionId` is a version UUID or null. The department/uploader come from the session. Successful upload returns 201 `{document,reused:false}`; an identical retry under the same user's key returns 200 `{document,reused:true}`. Changed content under the same key returns 409. This does not deduplicate independently uploaded identical files.

Each field definition is `{key,label,type,required,critical}` with type `text|number|date|boolean`. Schemas contain 1–50 unique safe keys, subject to the shared 16 KiB JSON request bound. Stored JSON Schema allows null for unknown candidates; required and critical annotations remain separate for the later validation workflow. Published versions and document source identity cannot be patched or deleted.

All document reads enforce department and descendant district scope. Private responses are `private, no-store`; file responses also use `nosniff`, same-origin resource policy and restrictive sandbox headers. Unsupported files return 415; corrupt or unsupported document structures return 422; size violations return 413; inspection contention/upload throttling returns 429. See PHASE_2.md for file limits.

## Shared contract

Browser auth: HttpOnly secure session cookie plus CSRF protection on mutations; server validates actor and jurisdiction. Integration clients use scoped service credentials. Never trust a client-submitted department ID without authorization.

Lists use page=1, page_size=25 (max 100) and return items/page/page_size/total. Stable sort includes ID. UUID resources; UTC ISO timestamps; typed DTOs. Errors: {error:{code,message,details,request_id}} without stack traces or secrets.

Use expected_revision for draft/review changes; stale updates return 409. Processing/export/approval actions have logical idempotency keys. HTTP: 200 read/action, 201 created, 202 queued, 204 logout; 401/403 auth, 404 absent/inaccessible, 409 conflict, 413 size, 415 format, 422 schema, 429 rate limit, 503 unavailable.

## Endpoint families

| Endpoint | Purpose / gate |
|---|---|
| POST /auth/login; POST /auth/logout; GET /auth/me | Session creation/revocation and scoped identity |
| GET/POST /users; PATCH /users/{id} | Admin user/role/scope management |
| GET/POST /roles; PATCH /roles/{id} | Admin configurable permissions |
| GET /master-data/{kind} | Scoped administrative hierarchy |
| GET/POST /document-types | List/create types |
| POST /document-types/{id}/schema-versions | Publish immutable schema version |
| POST /documents/upload | Operator multipart file + metadata → stored document |
| GET /documents; GET /documents/{id} | Scoped list/detail |
| GET /documents/{id}/content; GET /documents/{id}/pages | Private preview/original after object-level permission |
| GET /documents/{id}/history | Status and permitted event history |
| POST /documents/{id}/process | Persist intent → 202 application job_id |
| GET /processing/jobs/{id} | Application status and available model stage progress |
| POST /processing/jobs/{id}/retry | Authorized failed-job retry |
| GET /extractions/{id} | Accepted structured candidate result/evidence |
| GET /documents/{id}/ocr | Original OCR blocks/run history |
| GET /documents/{id}/validation | Implemented in Phase 4 |
| POST /duplicates/{id}/resolve | Implemented in Phase 4 |
| GET /verifications; GET /verifications/{id} | Queue/task/current revision |
| POST /verifications/{id}/claim | Atomic assignment, expected revision |
| PATCH /verifications/{id}/fields | Typed changes/reasons; invalidate affected approvals |
| POST /verifications/{id}/field-decisions | Review decisions for current field paths/revision |
| POST /verifications/{id}/submit | Operator resubmits correction; revalidation |
| POST /verifications/{id}/verify | Officer completes current revision review |
| POST /verifications/{id}/approve | Officer creates immutable approved record version |
| POST /verifications/{id}/reject; POST /verifications/{id}/return | Required reason; preserve evidence |
| GET /land-records; GET /land-records/{id}; GET /land-records/{id}/versions | Approved records and history |
| POST /land-records/{id}/amendments | New draft from approved version |
| GET /search | Scoped identifiers/owner/location/type/status/date queries |
| GET /gis/parcels | Bounded bbox/location/survey GeoJSON |
| POST /gis/record-links; POST /gis/record-links/{id}/review | GIS officer proposes/reviews links |
| GET/POST /integrations | Admin adapter/mapping configuration, no secret echo |
| POST /integrations/{id}/exports | Explicit export permission + approved version → 202 delivery |
| GET /integrations/{id}/runs; POST /integrations/{id}/runs/{runId}/retry | Delivery acknowledgement and retry |
| GET /feedback/datasets; POST /feedback/datasets | Authorized approved-truth dataset selection |
| POST /feedback/datasets/{id}/export | Explicit model-feedback export permission |
| GET /feedback/evaluations | Metrics with dataset/model/version/denominator |
| GET /dashboard/summary | Required scoped KPIs |
| GET /audit | Authorized action/entity/actor/date filters |
| GET/PATCH /admin/settings | Versioned policies and limits |
| GET /health/live; GET /health/ready | Sanitized liveness/readiness |

Batch UI sends one bounded upload request per file and aggregates progress; an optional batch ID groups successes/failures. A future direct-object upload flow must verify size/hash/ownership before accepting metadata.

## Examples

Processing request: {expected_revision:1}, Idempotency-Key header. Response: {job_id,document_id,status:"QUEUED"}. The browser polls the application job, never the model directly.

Correction: {expected_revision:3,changes:[{field_path:"survey_number",value:"123/4",reason:"Confirmed from original page 1"}]}. Field paths and values validate against the pinned type schema.

Approval: {expected_revision:4,reason:"Source and required fields reviewed"}. Response: {record_id,record_version:1,status:"APPROVED",integration_status:"NOT_SENT"}. Approval is an atomic service operation, never a generic status PATCH.

Scope, CSRF and authorization apply equally to Route Handlers, future Server Actions and direct server-rendered service calls. OpenAPI and machine-readable runtime schemas are pending implementation.
