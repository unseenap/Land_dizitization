# PostgreSQL / PostGIS schema design

Phase 1 schema and reviewed SQL migration 0001_foundation.sql are implemented, with Drizzle used for runtime data access. Implemented tables: departments, jurisdictions, users, roles, permissions, user_roles, role_permissions, user_scopes, sessions, login_limits and audit_logs. A checksum-tracked schema_migrations table belongs to the migration runner.

Phase 2 migration `0002_documents.sql` adds states, districts, tehsils, villages, document_types, document_schema_versions, documents, document_pages, document_metadata, document_status_history and upload_limits. Districts map one-to-one to existing jurisdiction scopes. Composite foreign keys prevent cross-department parent references. Document village is required; pinned schema is nullable. PostGIS/geometry remains deferred.

SQL grants keep land_app separate from the migration owner. Runtime cannot create tables, delete documents, mutate historical rows or change hierarchy entries. A document trigger prevents rewriting its original identity, location, hash, uploader or pinned schema. Metadata, status and schema histories reject mutation even by ordinary owner DML. Immutable triggers are not protection from a malicious database administrator who can disable them. User-scope triggers prevent cross-department assignment. Use new migrations for changes; applied checksums must remain unchanged.

Phase 3 migrations `0003_processing.sql` and `0004_processing_permissions.sql` add `processing_jobs`, `processing_attempts`, `processing_outbox`, `processing_artifacts` and `processing_job_history`. The application worker uses these tables for durable submit/poll/ingest and preserves rejected model payloads as diagnostic artifacts.

Phase 4 migration `0006_phase4_validation.sql` adds immutable `extraction_runs`, `extraction_fields` and `validation_findings`, plus `duplicate_candidates` for scoped signals and audited human resolution.

Phase 5 migration `0007_phase5_verification.sql` adds `verification_tasks`, `verification_field_decisions`, `verification_field_corrections`, `verification_history` and `verification_approvals`. Task identity is immutable; approved tasks, decisions, corrections, history and snapshots are append-only through ordinary application DML.

Phase 6 migration `0008_phase6_land_records.sql` adds `land_records`, `land_record_versions`, `landowners`, `mutation_records` and `registration_records`. One record belongs to one source document; one immutable version belongs to one approved verification task. Record versions and their child rows are append-only through ordinary application DML, and the current-version pointer is constrained to the same record.

Phase 7 migration `0009_phase7_gis.sql` adds `gis_parcels`, `gis_record_links` and `gis_record_link_history`. Geometry is nullable JSONB GeoJSON with required source/target CRS, provenance and either geometry or a missing-geometry reason. Parcels are immutable; link proposals are version-pinned and reviewed once.

Phase 8 migration `0010_phase8_integrations.sql` adds `integrations`, `integration_export_runs`, `integration_export_attempts`, `integration_export_history` and `integration_outbox`. Adapter configuration is append-only. An export run pins the department, record, exact record version and idempotency key; composite foreign keys prevent cross-record or cross-department references. Attempts and history are immutable; runs and outbox rows support durable worker state updates.

Phase 9 migration `0011_phase9_dashboard.sql` adds permission `dashboard.read` and grants it to every existing role. Dashboard metrics are service-owned scoped read queries over existing tables; no new fact table or mutable metric store is introduced.

Phase 10 migration `0012_phase10_feedback.sql` adds `feedback_examples`, `feedback_datasets`, `feedback_dataset_items`, `evaluation_runs` and `feedback_export_runs`. Examples are immutable and derived from approved verification decisions plus extraction evidence. Dataset identity and selection dates are immutable; only a pending dataset can receive review attribution. Items, evaluations and exports are append-only. Exports are idempotent per approved dataset and store a payload hash.

## Tables by module

| Module | Tables and main relationships |
|---|---|
| identity | users(department_id, login, password_hash, active); roles; permissions; user_roles; role_permissions; user_scopes(user_id, administrative scope); sessions(user_id, token_hash, expiry, revoked_at) |
| master-data | departments; states; districts(state_id); tehsils(district_id); villages(tehsil_id), each with unique scoped code/name/source/version |
| document-types | document_types(code, name); document_schema_versions(type_id, version, JSON schema, required/critical fields), unique type/version |
| documents | documents(department_id, uploader_id, village_id nullable, status, revision, original_key, MIME, byte_size, sha256); document_metadata(document_id, version, schema-bound JSONB); document_pages(document_id, page_number, dimensions, derived_key, transform); document_status_history |
| processing | processing_jobs(document_id, revision, request/payload hashes, status, remote job/model metadata); processing_attempts(job_id, operation, attempt, status, remote ID, error); processing_outbox(job_id, submit/poll event, availability and lock); processing_artifacts(job_id, accepted/rejected payload and hash); processing_job_history(job_id, status/stage transitions) |
| validation | extraction_runs(job/artifact/document/schema/revision/status/blockers); extraction_fields(run_id, source/normalized values, confidence, evidence); validation_findings(run_id, field/rule/status/severity/message/source) |
| duplicates | duplicate_candidates(run_id, document/candidate IDs, score, signals, status, resolution reason/actor/time) |
| verification | verification_tasks(run_id, document_id, department/schema/revision, status, returned reason); verification_field_decisions(task_id, field_key, decision/value/reason/actor); verification_field_corrections(task_id, field_key, value/reason/actor); verification_history(task_id, status transition, action/reason/actor); verification_approvals(task_id, immutable snapshot/reason/actor) |
| land-records | land_records(department_id, unique document_id, display_id, current_version_id); land_record_versions(record_id, version, unique task_id, document_id, village_id, schema_version_id, approved_snapshot, standard fields, source/artifact hashes, approver); landowners(version_id, sequence, name, relationship, ownership share); mutation_records(version_id, sequence, number, date, details); registration_records(version_id, sequence, number, date, details) |
| gis | gis_parcels(department_id, village_id, parcel_number, source name/reference, source/target CRS, nullable GeoJSON, missing reason, provenance, synthetic); gis_record_links(department_id, parcel_id, record_id, record_version_id, status, proposal/review reasons and actors); gis_record_link_history(link_id, status transition, action/reason/actor) |
| integrations | integrations(department_id, adapter, mode, contract/mapping versions, mapping, active, notes; no credentials); integration_export_runs(integration_id, department_id, record/version IDs, idempotency key, status, payload hash, acknowledgement, attempts/errors); integration_export_attempts(run_id, operation, request hash, response/error); integration_export_history(run_id, status transition, reason, actor); integration_outbox(run_id, availability, lock, published state, attempts) |
| feedback | feedback_examples(task/run/document/schema identity, field, source/prediction/truth, confidence, corrected, evidence, model metadata); feedback_datasets(version, date range, review status); feedback_dataset_items; evaluation_runs(dataset/model, metrics, denominators); feedback_export_runs(payload, hash) |
| audit/infrastructure | audit_logs(actor/service identity, action, entity/id, before/after restricted JSONB, reason, request_id, timestamp); outbox_events(type, key, payload_ref, state, attempts, available_at); pg-boss-owned queue schema |

## Constraints and transactions

Every scoped child must belong to the same department/jurisdiction as its parent. Use composite keys/FKs where practical and transactional authorization checks; guessing a UUID never grants access. Administrative hierarchy validates state → district → tehsil → village.

Unique constraints: login; type/version; document/page; result/field_path; verification task/run; record/version; logical request_key; destination/version/mapping delivery key. Findings refer to exactly one versioned input target. The current-approved pointer must reference a version of the same record.

Phase 5 approval checks task status and all workflow blockers, stores the immutable verification snapshot and audit event, and marks the document/task approved. In the same transaction, Phase 6 materializes the immutable land-record version, owners, mutations and registration from the human-approved decision values, updates the current pointer and appends the record-version audit event. A repeated approval cannot create a second version.

No cascading deletion of source evidence, approved versions or audit. Archive policy and retention need departmental decisions. Application DB roles cannot update historical approved/audit rows; this is not a cryptographic tamper-proof claim.

## Index and query plan

Index FKs and scoped queue/list predicates: documents(department_id,status,created_at), tasks(assignee,state,priority), audit(entity_type,entity_id,timestamp), model runs(document_id,started_at), deliveries(destination_id,state), and outbox(state,available_at).

Search projections cover document ID, owner name, survey/khasra/khata, registration, document type and hierarchy. Parameterize values and allowlist sort/filter fields. Add trigram/text indexes after query verification, preserving Unicode originals.

Use PostGIS MultiPolygon with SRID 4326, source CRS/provenance and a GiST index. Nullable geometry means unknown, not an invented point. Validate topology and coordinate ranges; use geodesic or appropriate projected measurements for area. GeoJSON uses longitude, latitude order. Review polygon SQL/custom type mapping instead of assuming generic ORM support.

## Migrations and storage

Keep schema definitions and SQL migrations in database; no auto-sync against production. Enable PostGIS explicitly with a migration/privileged setup step. Model service has no access to application tables. File bytes and large raw artifacts stay in private object storage; database rows retain hash, version and object reference.

Test clean migration, upgrade compatibility, transaction rollback, concurrent approval, foreign-scope references and backup restore. Synthetic seeds remain separate from migrations.
