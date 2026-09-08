# Next.js application API

Proposed base /api/v1, implemented later through src/app/api/v1 Route Handlers. These endpoints belong to Next.js, independently of the model service's /v1 API.

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
| GET /validations?document_id=... | Versioned findings |
| POST /validations/{id}/resolve | Allowed officer resolution/reason |
| GET /documents/{id}/duplicates | Scoped candidate signals |
| POST /duplicates/{id}/resolve | Officer confirms/dismisses with reason |
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
