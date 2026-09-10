# Next.js application routes

Status: Phases 1 and 2 implemented. Working routes include login, dashboard, admin/users, audit, documents/upload/detail/list, admin/master-data and admin/document-types. Next.js APIs serve the same authorized modules. Processing and other later routes remain planned.

App Router will serve both frontend pages and /api/v1 backend Route Handlers. Planned groups: (auth)/login and (workspace) for dashboard, documents, verification, records, map, audit and admin.

Server Components call authorized module services directly. Client components use application endpoints for interactions/polling. Route Handlers validate transport and delegate business behavior; do not put inference, database logic or workflow transitions in route files.

See [technical specification](../../docs/TECHNICAL_SPEC.md) and [API contract](../../docs/API_SPEC.md).
