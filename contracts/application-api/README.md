# Application API contracts

Canonical design: [API_SPEC](../../docs/API_SPEC.md).

Planned versioned schemas/OpenAPI describe Next.js /api/v1 endpoints. Keep serializable DTOs safe for client use; never expose ORM rows or server secrets. Contract tests will check runtime routes against these schemas.

No runtime schemas are implemented yet.
