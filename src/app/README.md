# Next.js application routes

Status: route architecture only. No page.tsx, layout.tsx or route.ts exists yet.

App Router will serve both frontend pages and /api/v1 backend Route Handlers. Planned groups: (auth)/login and (workspace) for dashboard, documents, verification, records, map, audit and admin.

Server Components call authorized module services directly. Client components use application endpoints for interactions/polling. Route Handlers validate transport and delegate business behavior; do not put inference, database logic or workflow transitions in route files.

See [technical specification](../../docs/TECHNICAL_SPEC.md) and [API contract](../../docs/API_SPEC.md).
