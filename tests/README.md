# Test ownership

Planned cross-module integration tests use PostgreSQL/PostGIS and private temporary storage. Model/government contract tests use labelled deterministic fixtures. End-to-end tests cover login, upload, review/approve, search, GIS and export. Focused unit tests live beside modules.

Required failure cases: foreign-scope access, revoked sessions, invalid upload, duplicate job delivery, model mismatch/malformed/stale result, concurrent approval, integration outage and audit rollback.

Phases 1 and 2 have 21 passing PostgreSQL integration tests (foundation.test.ts and documents.test.ts) and six passing Chrome scenarios (e2e/foundation.spec.ts and e2e/documents.spec.ts). Tests cover scoped access, rollback, immutable history, original-byte preservation, invalid files, concurrent idempotency, partial storage failure and lost upload responses. Integration tests create/drop uniquely named temporary databases and storage. Browser tests preserve synthetic documents, schemas, administrative entries and audit in the demo database. Run npm test and, after building, npm run test:e2e. See [implementation gates](../docs/IMPLEMENTATION_PLAN.md) and [Phase 2 walkthrough](../docs/PHASE_2.md).
