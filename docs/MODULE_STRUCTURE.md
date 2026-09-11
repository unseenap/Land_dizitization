# Modular project structure

Implemented modules: identity, audit, master-data, document-types, documents, processing, validation, duplicates, verification, land-records, gis, integrations, feedback and dashboard, with Next.js routes, server-only services, safe contracts and UI. Private local storage and bounded file inspection are shared infrastructure. The tree below describes the full target layout; PHASE_8.md lists the current government-mock boundary and PHASE_10.md lists the feedback/evaluation boundary.

## Application layout

~~~text
src/
  app/                     Next.js UI routes and /api/v1 Route Handlers
  modules/                 Domain modules, each with explicit public boundaries
    identity/
    master-data/
    document-types/
    documents/
    processing/
    validation/
    duplicates/
    verification/
    land-records/
    gis/
    integrations/
    feedback/
    dashboard/
    audit/
  server/                  Server infrastructure: DB, auth context, storage, queue, HTTP
  shared/                  Safe UI primitives and general non-secret utilities
workers/                   Durable TypeScript application job runner
database/                  Schema definitions, reviewed SQL migrations and seeds
contracts/
  model-api/               Language-neutral model request/result contract
  application-api/         Public Next.js API schemas / future OpenAPI
tests/                     Integration, contract and end-to-end test ownership
sample_data/               Synthetic fixture policy
docs/                      Architecture, requirements and operational plans
~~~

The independently deployed model has its own repository/runtime. Its weights, preprocessing/OCR code, prompts and training pipeline are maintained there. This repository owns model request/result compatibility, policy validation and reviewed feedback delivery.

## Internal module convention

~~~text
module/
  README.md
  contracts/               Serializable request/response schemas, safe for clients
  server/                  Services, repositories, policies; never browser imports
  ui/                      Module-specific components, forms and client hooks
  tests/                   Focused unit tests
~~~

Create implementation subfolders when they contain real code. Separate server exports from browser-safe contracts; do not use a barrel that re-exports both. Services enforce permissions and transactions, repositories own queries, routes parse/serialize HTTP, UI components display approved DTOs.

## Ownership map

| Module | Owns | Collaborates with |
|---|---|---|
| identity | Users, roles, permissions, sessions, scope | audit |
| master-data | Department and administrative hierarchy | integrations, audit |
| document-types | Type definitions, immutable schema versions | validation, audit |
| documents | Uploads, originals/pages, metadata/history | identity, storage, audit |
| processing | Jobs, model adapter, OCR/extraction runs | documents, document-types, validation |
| validation | Normalization, business rules and findings | master-data, integrations, duplicates |
| duplicates | Candidate matches, scores, human resolution | documents, land-records, audit |
| verification | Tasks, field decisions, corrections, history, approval snapshots | validation, duplicates, land-records, feedback, audit |
| land-records | Approved snapshots, owners, mutations, registration, search | documents, gis |
| gis | JSONB GeoJSON parcels, CRS/provenance, version-pinned record-link proposal/review | master-data, land-records, audit |
| integrations | Mock LRMS/DILRMP/database adapters, append-only mappings, idempotent approved-version exports, acknowledgements and retries | land-records, gis, audit |
| feedback | Approved truth pairs, reviewed datasets, evaluations and audited model-team exports | verification, processing, audit |
| dashboard | Scoped metric queries/read models | processing, validation, feedback |
| audit | Append-only events and authorized event reading | explicit actor context |

Modules call another module's public service/contract, not its private repository. Read models may use documented SQL views with authorization. Cross-module approval uses one unit-of-work transaction passed to participants. Integrations and model adapters never update land-record tables directly.

## Planned route groups

UI: (auth)/login; (workspace)/dashboard, documents/upload, documents/[documentId], verification/[taskId], records/[recordId], map, feedback, audit; (workspace)/admin/users, roles, document-types, integrations, settings.

API: src/app/api/v1/<resource>/route.ts and resource-specific dynamic routes. UI group parentheses do not change public URLs. Every endpoint delegates to the matching module service.

## Independent delivery boundaries

Web deployment: Next.js UI and backend API.
Worker deployment: durable application jobs sharing TypeScript business services.
Model deployment: independent inference and evaluation/training environment, accessible by authenticated API.
Data services: PostgreSQL/PostGIS and private object storage.

This division enables model development and application development to proceed independently using shared contract fixtures without creating a second application backend.
