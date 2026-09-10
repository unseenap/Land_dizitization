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
- Phase 3 durable processing: PostgreSQL jobs, attempts, transactional outbox, immutable artifacts and job history.
- Server-only versioned model contract with strict mock and HTTP adapters; results are checked for identity, revision, input hash, schema, field keys, evidence pages/bounds and confidence ranges.
- Processing submission/status APIs, document processing controls and a TypeScript worker for durable submit/poll/ingest.
- Processing tests cover idempotent submission, worker submit/poll ingestion, accepted artifacts and malformed-result quarantine.
- Phase 4 evidence-aware extraction runs preserve model source values, normalized values, confidence and page/block evidence.
- Application validation records required-field, type, positive-area, confidence and administrative-hierarchy findings with explicit blocking severity.
- Scoped duplicate candidates store source-hash, survey, owner, area and location signals; authorized verifiers/administrators can resolve candidates with audit history.
- Document detail exposes extraction, validation findings, blockers and duplicate review; validation and duplicate-resolution APIs are available.
- Final verification: all 24 PostgreSQL integration tests and all 6 Chrome E2E scenarios passed. Production build, TypeScript, ESLint and the client-build secret scan passed for the Phase 4 implementation.

## Working

Phases 1, 2, 3 and 4 complete. Phase 5 and later remain pending.

## Pending

Phase 5: split viewer, field decisions, corrections, return/edit workflow and auditable final approval.

Later: record verification/approval, immutable land-record versions/search, PostGIS/parcel linking, government adapters, processing dashboards and feedback/evaluation.

## Known issues and limits

- PostGIS is not installed locally. Phase 1 uses ordinary PostgreSQL; enable PostGIS through a later reviewed GIS migration/setup step.
- Districts map to existing department jurisdiction scopes; descendants inherit that boundary. Administrative entries are create-only in Phase 2. Partial-scope audit readers see only their own events; full-department readers see department events.
- Roles/permission definitions are seeded; user role assignment works, but editing permission definitions through a UI is not implemented.
- Password-reset/rotation UX, SSO/MFA, retention cleanup, production infrastructure/security assessment and model data-sharing decisions remain pending.
- Uploaded source documents are supported; only fictional local fixtures have been used for verification. The default mock model performs no inference, and no extraction accuracy or government connection is claimed.
- Phase 2 storage is local/persistent only; no S3 adapter or ephemeral/multi-instance filesystem support. Antivirus/quarantine, OS parser isolation, crash-orphan reconciliation, encryption and backup restore verification remain production work. See PHASE_2.md for exact limits.
- PDF/JPEG/PNG/single-page TIFF are accepted. Processing uses the mock adapter by default; a real OCR service requires HTTP model configuration and authorized input transfer. Pinned schema/location cannot be changed through the metadata editor.
- Phase 4 normalization and duplicate policies are deterministic application defaults, not jurisdiction-certified rules. Fuzzy/transliteration matching and configurable rule administration remain future work.
- Windows local DB needs PostgreSQL command-line tools in PATH. The browser tests use installed Chrome.
- Browser tests create and deactivate synthetic test accounts; their audit history is intentionally retained in the local demo database. Integration tests use a separate temporary database.

## Important decisions

Next.js owns frontend and backend. Domain services remain server-only and callable from authorized server pages or API routes. The separately hosted model is not installed in this project. Drizzle owns runtime relational access; checksum-tracked reviewed SQL migrations own schema changes. Phase 3 uses the PostgreSQL outbox worker; pg-boss remains a future queue option. Phase 4 preserves model artifacts and extraction evidence immutably while keeping human duplicate decisions auditable.

Local credentials live only in ignored .env.local and .local-data/demo-accounts.json. Migrations/seeds/tests use MIGRATION_DATABASE_URL; the app uses DATABASE_URL with restricted land_app credentials. Production should not inject the owner credential into the web process.

## Mocked / not yet integrated

Departments/accounts are explicitly synthetic. The mock model adapter is implemented for contract/worker tests but is not OCR. No production model endpoint, LRMS, DILRMP, registration or cadastral service is connected.

## Next recommended tasks

1. Align `docs/MODEL_API_CONTRACT.md` and shared fixtures with the independently developed OCR service.
2. Configure authorized cross-host input delivery and run the worker against the real model in a controlled environment.
3. Begin Phase 5 field-level verification, corrections and auditable approval.
