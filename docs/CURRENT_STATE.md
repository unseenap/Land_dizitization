# Current state

Last Updated: 2026-09-11.

## Completed

- Phase 1 Next.js App Router application with TypeScript, pinned dependencies and production build.
- Sign-in, authenticated workspace, scoped user creation/access editing, audit history and sign-out UI.
- PostgreSQL migration and Drizzle schema for departments, jurisdictions, users, roles/permissions, scopes, sessions, login throttling and audit.
- Separate migration-owner/runtime roles; runtime cannot create tables or rewrite audit history.
- Scrypt password hashes; opaque expiring sessions stored as hashes; session revocation on account access changes.
- Service-level permissions and department/jurisdiction constraints, CSRF/Origin checks, bounded JSON input, safe errors and structured request logging.
- Atomic account mutations/audit events, revision conflicts and concurrent-edit protection.
- Isolated Windows PostgreSQL setup on port 55432; seven synthetic seed accounts with locally generated credentials.
- Ten PostgreSQL integration tests passed, including cross-scope denial, runtime grants, concurrent changes, revocation, rate limiting and audit-failure rollback.
- Three Chrome browser scenarios passed: sign-in/user creation/access edit/audit/logout; API permissions/CSRF; mobile viewport layout.
- Production build, TypeScript and ESLint passed. Desktop/mobile screenshots were inspected.
- Client-build scan checked 15 JavaScript files and found no configured server secret values. The browser suite exited successfully outside the Windows sandbox, which had blocked its server cleanup.
- Updated README diagrams and Phase 1 setup documentation. Both supplied master prompts remain unchanged.
- Phase 2 document workspace: scoped upload/list/filter/detail, PDF canvas navigation/zoom, WebP image previews and unchanged original downloads.
- Administrative state/district/tehsil/village hierarchy; configurable document types with immutable schema versions.
- Private local storage, bounded format/page/pixel inspection, upload throttling and idempotent retries, including concurrent requests.
- Uploader-only descriptive metadata editing with revision conflicts and immutable metadata/status history; original identity/location/schema cannot be rewritten.
- Migration 0002_documents.sql applied; Drizzle runtime mappings, synthetic hierarchy/types and generated fictional PDF/PNG fixtures added.
- Final verification: all 21 PostgreSQL integration tests and all 6 Chrome browser scenarios passed. Build, TypeScript and ESLint passed. Client scan checked 21 JavaScript files without finding configured server secrets.
- Desktop/mobile document screenshots inspected; upload, schema administration, metadata history, source download and lost-response retry verified through the browser.
- A professional full-product UI redesign is planned in UI_REDESIGN_PLAN.md using accessible owned primitives, selected Magic UI and React Bits enhancements, Phosphor icons, responsive role-aware dashboards and reduced-motion behavior. This visual redesign is documented but not yet implemented.
- Phase 3 durable processing: PostgreSQL jobs, attempts, transactional outbox, immutable artifacts and job history.
- Server-only versioned model contract with strict mock and HTTP adapters; results are checked for identity, revision, input hash, schema, field keys, evidence pages/bounds and confidence ranges.
- Processing submission/status APIs, document processing controls and a TypeScript worker for durable submit/poll/ingest.
- Processing tests cover idempotent submission, worker submit/poll ingestion, accepted artifacts and malformed-result quarantine.
- Phase 4 evidence-aware extraction runs preserve model source values, normalized values, confidence and page/block evidence.
- Application validation records required-field, type, positive-area, confidence and administrative-hierarchy findings with explicit blocking severity.
- Scoped duplicate candidates store source-hash, survey, owner, area and location signals; authorized verifiers/administrators can resolve candidates with audit history.
- Document detail exposes extraction, validation findings, blockers and duplicate review; validation and duplicate-resolution APIs are available.
- Final verification: all 24 PostgreSQL integration tests and all 6 Chrome E2E scenarios passed. Production build, TypeScript, ESLint and the client-build secret scan passed for the Phase 4 implementation.
- Phase 5 human verification and approval: accepted model ingestion atomically creates a scoped verification task and moves its document to `VERIFICATION_PENDING`.
- Task workflow supports pending review, return for correction, corrected resubmission, pending approval, approval and rejection; transitions require `expectedStatus`, CSRF and service-level authorization.
- Verifiers can record `ACCEPT_MODEL` or `ACCEPT_CORRECTION` decisions for each field; operators can submit typed corrections only after a task is returned.
- Final approval requires decisions for every field, non-null required/critical values, every duplicate resolved as not-duplicate and no record-level blockers.
- Approval snapshots preserve document identity, source/artifact hashes, fields, evidence, findings, duplicate decisions, field decisions, corrections and the approval reason. Approved task data is database-enforced immutable.
- Verification task APIs and a split review workbench are implemented; document detail links to its scoped task.
- Final verification: all 24 PostgreSQL integration tests pass. TypeScript, ESLint, production build, the client-secret scan and all 6 Chrome E2E scenarios pass. Migration `0007_phase5_verification.sql` was applied to the local demo database.
- Phase 6 approved land records: approval atomically materializes one immutable record version per approved verification task, with owners, mutation records, registration records, the current-version pointer and audit history.
- Scoped record list, text search, village/type filters, record detail, source/verification links, all approved fields and version history are available through APIs and UI.
- Search reads only current approved versions and enforces department/jurisdiction scope; foreign direct IDs return `404`.
- Final verification: all 24 PostgreSQL integration tests pass. TypeScript, ESLint, production build, the client-secret scan and all 6 Chrome E2E scenarios pass. Migration `0008_phase6_land_records.sql` was applied to the local demo database.
- Phase 7 GIS: reviewed migration `0009_phase7_gis.sql` adds immutable synthetic parcels, version-pinned record links and immutable link history.
- Migration `0009_phase7_gis.sql` was applied to the local demo database and the synthetic parcel seed completed successfully.
- Parcels carry explicit source/target CRS, source/provenance metadata and either JSONB GeoJSON geometry or a recorded missing-geometry reason.
- Scoped GIS listing, missing-geometry filtering, link proposal and one-time approve/reject review are available through APIs and the workspace UI.
- `gis.read`, `gis.link` and `gis.review` separate visibility, proposal and review authority; every mutation appends link history and audit.
- Phase 7 tests were intentionally deferred at the user's request; do not treat this phase as verified until tests run.
- Phase 8 integrations: reviewed migration `0010_phase8_integrations.sql` adds append-only adapter configurations, idempotent export runs, attempts, history and a transactional outbox.
- Mock LRMS, DILRMP and government database adapters build a version-pinned envelope and return deterministic acknowledgements labelled `is_mock: true`; no network call or real government system is involved.
- Export requests validate mapped fields, scope and exact approved version, then return `202`. The separate integration worker delivers asynchronously, stores attempts/history/audit and handles retry backoff.
- Scoped integration configuration, export, run-list and retry APIs plus the `/integrations` workspace are implemented.
- Migration `0010_phase8_integrations.sql` was applied and the synthetic seed completed successfully.
- Phase 8 tests were intentionally deferred at the user's request; do not treat this phase as verified until tests run.
- Phase 9 dashboard: reviewed migration `0011_phase9_dashboard.sql` adds the scoped `dashboard.read` permission for every existing role.
- The dashboard service/API/UI report documents processed, pending verification, approved records, processing failures, latest validation findings, current confidence, grouped processing errors, and state/district workflow progress.
- State/district progress uses the known scoped document denominator and is not presented as total land-record inventory completion. Extraction accuracy is explicitly not measured and remains separate from model confidence.
- Migration `0011_phase9_dashboard.sql` was applied. A synthetic-data service check reconciled the top-level, state and district document totals after fixing a state-level duplicate-count bug.
- Phase 9 tests were intentionally deferred at the user's request; do not treat this phase as verified until tests run.
- Phase 10 feedback: reviewed migration `0012_phase10_feedback.sql` adds immutable approved prediction/truth examples, reviewed datasets, pinned dataset items, evaluation runs and idempotent model-team exports.
- Dataset creation uses explicit approval date ranges and jurisdiction scope; examples preserve extraction evidence, model metadata and the latest human field decision.
- A separate review approves or rejects each dataset. Evaluations are immutable per dataset/model version and report field accuracy with truth-labelled denominators, corrections, missing predictions and document-type/language/field segments.
- Exports require `feedback.export`, store a deterministic payload and SHA-256, append audit events and explicitly disable automatic retraining.
- Migration `0012_phase10_feedback.sql` was applied to the local demo database.
- Phase 10 tests were intentionally deferred at the user's request; do not treat this phase as verified until tests run.

## Working

Phases 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 and 11 complete. Later work is limited to authorized live integrations, focused test expansion and production hardening.

## Pending

Later: authorized live model connection, authorized live government exchange and production hardening.

## Phase 11 acceptance

Completed on 2026-09-11: lint, TypeScript, all 25 PostgreSQL integration tests, production build, a 25-file client secret scan and all 6 Chrome browser scenarios passed. The reproducible command is `npm run acceptance`. The focused test also verifies the Phase 10 feedback workflow and fixes fresh-seed permissions plus dataset-summary serialization. Focused Phase 7–Phase 9 tests remain a recommended hardening task rather than an acceptance blocker.

## Known issues and limits

- PostGIS is not installed locally. Phase 7 stores explicitly synthetic JSONB GeoJSON in ordinary PostgreSQL and does not provide spatial indexes, topology validation, area measurement or bbox queries.
- Districts map to existing department jurisdiction scopes; descendants inherit that boundary. Administrative entries are create-only in Phase 2. Partial-scope audit readers see only their own events; full-department readers see department events.
- Roles/permission definitions are seeded; user role assignment works, but editing permission definitions through a UI is not implemented.
- Password-reset/rotation UX, SSO/MFA, retention cleanup, production infrastructure/security assessment and model data-sharing decisions remain pending.
- Uploaded source documents are supported; only fictional local fixtures have been used for verification. The default mock model performs no inference. Phase 8 government adapters are in-process mocks, so no extraction accuracy or government connection is claimed.
- Phase 2 storage is local/persistent only; no S3 adapter or ephemeral/multi-instance filesystem support. Antivirus/quarantine, OS parser isolation, crash-orphan reconciliation, encryption and backup restore verification remain production work. See PHASE_2.md for exact limits.
- PDF/JPEG/PNG/single-page TIFF are accepted. Processing uses the mock adapter by default; a real OCR service requires HTTP model configuration and authorized input transfer. Pinned schema/location cannot be changed through the metadata editor.
- Phase 4 normalization and duplicate policies are deterministic application defaults, not jurisdiction-certified rules. Fuzzy/transliteration matching and configurable rule administration remain future work.
- Phase 5 has no verification queue listing; users reach a task from the scoped document detail page.
- Phase 6 search is case-insensitive substring matching over standard indexed fields. Fuzzy/transliteration search and a repeating multi-owner/multi-mutation editor remain future work; every approved field is preserved in the immutable snapshot.
- Windows local DB needs PostgreSQL command-line tools in PATH. The browser tests use installed Chrome.
- Browser tests create and deactivate synthetic test accounts; their audit history is intentionally retained in the local demo database. Integration tests use a separate temporary database.

## Important decisions

Phase 8 exports exact approved record versions through a separate durable worker to labelled in-process government mocks.

Next.js owns frontend and backend. Domain services remain server-only and callable from authorized server pages or API routes. The separately hosted model is not installed in this project. Drizzle owns runtime relational access; checksum-tracked reviewed SQL migrations own schema changes. Phase 3 uses the PostgreSQL outbox worker; pg-boss remains a future queue option. Phase 4 preserves model artifacts and extraction evidence immutably while keeping human duplicate decisions auditable. Phase 5 keeps approval human-only and stores an immutable approval snapshot. Phase 6 materializes that snapshot into immutable searchable record versions. Phase 7 links those versions to synthetic parcels only through reviewed proposals.

Local credentials live only in ignored .env.local and .local-data/demo-accounts.json. Migrations/seeds/tests use MIGRATION_DATABASE_URL; the app uses DATABASE_URL with restricted land_app credentials. Production should not inject the owner credential into the web process.

## Mocked / not yet integrated

Departments/accounts are explicitly synthetic. The mock model adapter is implemented for contract/worker tests but is not OCR. Phase 8 LRMS/DILRMP/database adapters are mocks. No production model endpoint, LRMS, DILRMP, registration or cadastral service is connected.

## Next recommended tasks

1. Add focused Phase 7, Phase 8, Phase 9 and Phase 10 PostgreSQL integration and browser tests.
2. Align `docs/MODEL_API_CONTRACT.md` and shared fixtures with the independently developed OCR service.
3. Configure authorized cross-host input delivery and run the worker against the real model in a controlled environment.
