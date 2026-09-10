# Application API contracts

Canonical design: [API_SPEC](../../docs/API_SPEC.md).

Planned versioned schemas/OpenAPI describe Next.js /api/v1 endpoints. Keep serializable DTOs safe for client use; never expose ORM rows or server secrets. Contract tests will check runtime routes against these schemas.

Phase 1 identity runtime schemas are in src/modules/identity/contracts/index.ts; API transport and error behavior are in src/server/http.ts. Machine-readable OpenAPI for the full target remains pending. Phase 2 adds contracts under documents, document-types and master-data; PHASE_1.md, PHASE_2.md and API_SPEC.md document the implemented endpoints and payloads.
