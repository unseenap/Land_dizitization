# Technical specification

## Implemented scope

Phase 1 implements identity, scoped user management, audit, configuration and error handling. Phase 2 adds administrative hierarchy, versioned document types, private upload/storage/preview/download, descriptive metadata and history. Phase 3 adds durable processing jobs/outbox, a server-only model API adapter, strict result validation, immutable artifacts and the worker loop. Phase 4 adds evidence-preserving extraction runs, normalization, application validation, duplicate candidates and audited human duplicate resolution. PHASE_1.md through PHASE_4.md record the implemented boundaries; verification/approval and later workflows remain target behavior.

Current roles are seeded configuration with fixed permission codes. Administrators assign one role and one or more jurisdictions to each account. Districts map these scopes to state/tehsil/village hierarchy. Full role-definition editing and password reset/rotation UI are pending. User access edits revoke every active session and reject stale revisions; self-access changes require another administrator.

Audit readers holding every jurisdiction see department events; narrower-scope readers see only their own events. This conservative Phase 1 rule avoids exposing other jurisdictions while record-specific audit scope is not implemented.

## Application stack and organization

Next.js App Router serves the UI and /api/v1 Route Handlers on the Node.js runtime. TypeScript is shared across routes, domain services and job orchestration. PostgreSQL/PostGIS is the system of record, with Drizzle and reviewed SQL migrations recommended. See MODULE_STRUCTURE for ownership.

Request flow: actor authentication → input parsing → module authorization → service transaction → repository → minimal DTO. Server Components call the same authorized services directly. Browser modules never import database connections or model clients. Large scans use upload endpoints/private storage rather than Server Actions.

Dynamic sensitive pages and responses must not enter shared caches. Declare private/no-store behavior at application and HTTP boundaries where appropriate. Scope any permitted cached aggregates by tenant, permissions and filters.

## Roles and scopes

| Action | Administrator | Operator | Verifier | GIS/Data Officer | Supervisor |
|---|---|---|---|---|---|
| Manage users/roles/config | Yes | No | No | No | No |
| Upload and submit corrections | Explicit extra permission | Yes | No | No | No |
| Review and approve fields/record | Explicit verifier role | No | Yes | No | No |
| Review parcel links | Explicit GIS role | No | No | Yes | No |
| View records | Scoped | Scoped | Scoped | Scoped | Scoped |
| View dashboard | Scoped | Own workflow | Own workflow | GIS workflow | Scoped |
| Government or feedback export | Explicit permission | No | Explicit permission | No | Explicit permission |
| Audit reading | Scoped | Own actions | Assigned cases | GIS actions | Scoped |

All access requires department/jurisdiction scope. Separate uploader from approver. A verifier can correct during review with recorded reasons. Admin status alone does not grant business approval.

## Document and pipeline state

Happy path: UPLOADED → QUEUED → PREPROCESSING → OCR_PROCESSING → OCR_COMPLETED → EXTRACTION_PROCESSING → EXTRACTION_COMPLETED → VALIDATION_PROCESSING → VERIFICATION_REQUIRED → VERIFIED → APPROVED.

Preprocessing/OCR/extraction labels reflect reported remote stages only. If the model returns no detailed progress, show “Model processing” with the known job status; do not fabricate completed sub-stages. Phase 3 persists remote attempts and status but does not implement inference locally.

Record review needs an exact revision. Every edit invalidates affected field approvals and prior validation. Verification completion requires resolved blocking findings and required field decisions. Explicit final approval creates a record version.

Return path: VERIFICATION_REQUIRED or VERIFIED → CORRECTION_REQUIRED → VALIDATION_PROCESSING after resubmission. Rejection requires reason and preserves evidence. Failed processing → PROCESSING_FAILED; retry resumes from a valid checkpoint as a new attempt. Edited input invalidates downstream outputs.

INTEGRATION_PENDING and INTEGRATED are document delivery summaries for the current approved version; approval remains a separate fact. Track per-destination delivery states. Changing an approved record starts a new draft while its previous approved version remains intact.

## Required UI

Login; scoped dashboard; document list/upload/detail; verification queue/split viewer; record list/detail/history; map; audit; admin users/roles/types/integrations/settings. The detail screen includes source, metadata, stage status, language, type, OCR, fields/confidence, validation, duplicates, corrections, record link, GIS and delivery history.

Use keyboard-friendly field editing, explicit page navigation and labels that do not depend on color. Null confidence displays “Unavailable”. Unsupported language/handwriting capability produces a visible result, not a claimed success. Source evidence can highlight normalized bounding boxes in the original page frame.

## Processing, validation and data

External model performs compute-heavy preprocessing, printed/handwriting OCR, layout, classification and extraction. Next.js business services perform authoritative schema validation, normalization rules, master checks, duplicate matching and review routing. Model-provided validation is advisory.

Proposed local limits: 25 MiB/file, 100 pages, 20 files/batch. Use paginated endpoints with default 25 and maximum 100 items. Configure stricter hosting limits if necessary. All job stages record state, attempt, input hash, model/schema/prompt versions and sanitized error.

Accuracy is computed against verified/reference values. State/district progress requires a known inventory denominator; otherwise display processed counts, not invented completion percentages. Critical tests and phase gates are in IMPLEMENTATION_PLAN.
