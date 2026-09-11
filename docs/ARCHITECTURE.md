# Architecture and technology recommendations

Phase 8 status: Next.js UI/API, PostgreSQL/Drizzle identity, audit, documents, processing, validation, verification, approved land records, synthetic GIS parcels/links and mock government integrations are implemented. Durable processing and integration workers, private local storage and the mock/HTTP model adapter are implemented; a real model endpoint, PostGIS, interactive maps, live government exchange and production shared storage remain pending. Dependency versions are pinned in package.json; see PHASE_6.md for the verified baseline and PHASE_7.md/PHASE_8.md for the deferred-test boundaries.

## System topology

~~~mermaid
flowchart TD
  Browser[Authorized browser] --> Next[Next.js pages and Route Handlers]
  Next --> Modules[TypeScript business modules]
  Modules --> DB[(PostgreSQL with JSONB GeoJSON)]
  Modules --> Store[Private object storage]
  Modules --> Outbox[Transactional outbox]
  Outbox --> Worker[TypeScript durable job runner]
  Worker --> Model[Separate model HTTP API]
  Model --> Inference[Preprocessing / OCR / layout / extraction]
  Worker --> Modules
  Modules --> Gov[Government and GIS adapters]
  Other[Other authorized model clients] --> Model
~~~

The web frontend and application backend are one Next.js application. The worker is an independent process of the same TypeScript project for job orchestration. The model service is an independent deployment/project; it receives only authorized document inputs and has no direct application-database access.

## Next.js boundaries

Use App Router pages/layouts and Route Handlers for versioned HTTP APIs. Server-rendered pages call authorized services directly; client components call application APIs. Keep upload interactions, editable verification forms and map viewers in narrow client boundaries. Service modules and credentials remain server-only.

Next.js documents both Route Handlers and the limits of long-lived handlers on some hosting platforms. That supports our decision to submit work quickly and process it through a durable worker. [Official Next.js backend guide](https://nextjs.org/docs/app/guides/backend-for-frontend). Server/client boundaries are described in [Next.js component documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components).

## Selected and recommended components

| Choice | Reason | Alternative and tradeoff |
|---|---|---|
| Next.js + TypeScript for UI/API | User-selected unified application stack | Separate applications add deployment coordination |
| PostgreSQL with JSONB GeoJSON | Runs in the current local environment and preserves explicit CRS/provenance | PostGIS remains the future option for spatial indexes and measurements |
| Drizzle + node-postgres | Recommended typed relational access with explicit SQL control | Prisma also viable; pick one migration owner |
| Zod + versioned JSON Schema contracts | Validate app inputs and exchange language-neutral model schemas | Compile/configure dynamic schemas safely |
| pg-boss durable queue | PostgreSQL-backed Node jobs avoid another infrastructure service initially | BullMQ/Redis viable later; isolate queue adapter |
| Private S3-compatible storage | App/model/worker can access scoped files across hosts | Local adapter for single-host demo only |
| Tailwind + Leaflet | Form-oriented UI and prototype cadastral overlays | Larger maps may later need vector tiles/MapLibre |

Drizzle documents PostGIS integration and explicit extension migrations; arbitrary parcel polygons will use reviewed SQL/custom mappings, without assuming point examples cover every spatial type. [Drizzle PostGIS guide](https://orm.drizzle.team/docs/guides/postgis-geometry-point). pg-boss provides a PostgreSQL-backed Node.js queue; external side effects still require application idempotency. [pg-boss repository](https://github.com/timgit/pg-boss).

Exact stable package/runtime versions will be selected and locked during implementation. These are design recommendations, not installed dependencies.

## Transaction and failure design

Upload acceptance follows durable private object storage and metadata commit; compensate orphan objects on failed metadata writes. Save processing intent, status and audit in a PostgreSQL transaction with an outbox event. The worker dispatches outbox entries to the queue idempotently.

Model submission uses a stable request key; save remote job ID and schedule polling. Each poll is bounded and rescheduled, never an endless HTTP wait. A remote timeout after submission triggers reconciliation by key before resubmitting. Persist completed artifacts, validation state and audit together. Retain old runs when retrying.

Phase 5 approval checks authorization, expected status and blockers. In the same transaction, Phase 6 stores the immutable verification snapshot and audit event, marks the task/document approved, materializes the searchable immutable record version and updates the current-approved pointer. Integration delivery and feedback export will read that exact approved version. Remote delivery failure cannot undo approval.

Use separate bounded connection pools/concurrency for web and worker. Domain services have no dependency on React or next/headers; Route Handlers and server pages build an actor context and pass it in. Worker services receive an explicit service identity. This keeps the same rules usable outside the Next.js request context.
