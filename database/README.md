# PostgreSQL / PostGIS database

Planned contents: Drizzle schema definitions, versioned reviewed SQL migrations, PostgreSQL/PostGIS setup and synthetic seeds.

One migration owner controls the schema. Spatial MultiPolygon types/indexes may require explicit SQL/custom mappings. Never use destructive schema auto-sync against approved data. Queue schema is managed according to pg-boss version requirements.

Phases 1-4 implement schema.ts plus migrations/0001_foundation.sql through 0006_phase4_validation.sql. The migration runner uses an advisory lock and checksums. Identity, sessions, permissions, audit, administrative hierarchy, schema versions, documents/pages/metadata/status history, upload limits, processing jobs, attempts, outbox events, artifacts, job history, extraction runs/fields, validation findings and duplicate candidates are available. Drizzle table mappings support runtime queries; reviewed SQL owns composite constraints, checks, indexes, grants and triggers. PostGIS and parcels remain pending. See [database design](../docs/DATABASE_SCHEMA.md) and [setup](../docs/DEPLOYMENT.md).
