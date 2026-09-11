# Implementation plan after design approval

Phases 1 through 8 are implemented. Their working UI → Next.js API/service → PostgreSQL paths are documented in PHASE_1.md through PHASE_8.md. Phase 9 and later remain pending authorization. Each phase must preserve critical tests and update current state. Phase 7 and Phase 8 tests are intentionally deferred.

| Phase | Modules / deliverables | Completion gate |
|---|---|---|
| 1 Foundation | Next.js, typed config, DB/migrations, identity, audit | Login and denied cross-scope requests; clean migration; no secret leakage |
| 2 Documents | Type schemas, master data, uploads/private previews/history | Valid file stored and previewed; invalid/foreign files denied |
| 3 Model contract and jobs  | Queue/outbox, mock adapter, model API contract, HTTP adapter and worker | Submit/poll/ingest survives retry; malformed/stale outputs rejected |
| 4 Extraction and validation | Evidence, normalization, business/master checks, duplicates | Multiple types/languages represented; blockers and duplicate reasons visible |
| 5 Verification | Split viewer, field decisions, return/edit/approve | Concurrent/stale edits safe; approval immutable and audited |
| 6 Records | Owners/mutations/registration, search/version history | Approved record retrieved by required filters within scope |
| 7 GIS | Synthetic parcels/cadastral layer, reviewed links | Correct CRS/provenance and missing geometry handling |
| 8 Government APIs | Mock LRMS/DILRMP/database adapters | Idempotent approved export with labelled acknowledgement |
| 9 Dashboard | Required KPIs, state/district progress | Counts reconcile; confidence distinct from measured accuracy |
| 10 Feedback | Verified truth datasets, evaluation/model comparison | Reproducible denominators, reviewed export and no automatic retraining |
| 11 Acceptance/deployment | Critical tests, synthetic seeds, verified commands/demo | Complete demo and failure cases pass with reported limits |

## Model team handoff

Agree MODEL_API_CONTRACT, supported formats/languages, handwriting capabilities, schemas, input transport, authentication, job/result lifecycle and timeouts. The app team may implement against clearly labelled contract fixtures while the independent service is developed. No fake prediction should be presented as real OCR.

## Test strategy

Unit: typed schemas, normalization/units, confidence boundaries and missingness, rule findings, duplicate signals.
Integration: PostgreSQL constraints, scoped queries, approval/audit atomicity, queue/outbox recovery, model and government contracts.
End-to-end: login → upload → processing → validation → review → approval → search → GIS → mock export → dashboard/feedback.
Security: cross-scope objects, CSRF, revoked sessions, file limits, model identity/hash mismatches and server/client secret boundary.
AI evaluation: labelled printed/handwritten/mixed-language fixtures; metrics by type/language/quality with fixed held-out datasets.

No acceptance percentages or runtime performance targets are claimed until measured. Update CURRENT_STATE and executable commands at each implemented phase.
