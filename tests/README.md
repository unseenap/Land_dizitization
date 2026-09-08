# Test ownership

Planned cross-module integration tests use PostgreSQL/PostGIS and private temporary storage. Model/government contract tests use labelled deterministic fixtures. End-to-end tests cover login, upload, review/approve, search, GIS and export. Focused unit tests live beside modules.

Required failure cases: foreign-scope access, revoked sessions, invalid upload, duplicate job delivery, model mismatch/malformed/stale result, concurrent approval, integration outage and audit rollback.

No tests have been implemented or executed. See [implementation gates](../docs/IMPLEMENTATION_PLAN.md).
