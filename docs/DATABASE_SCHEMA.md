# PostgreSQL / PostGIS schema design

Phase 1 schema and reviewed SQL migration 0001_foundation.sql are implemented, with Drizzle used for runtime data access. Implemented tables: departments, jurisdictions, users, roles, permissions, user_roles, role_permissions, user_scopes, sessions, login_limits and audit_logs. A checksum-tracked schema_migrations table belongs to the migration runner.

Phase 2 migration `0002_documents.sql` adds states, districts, tehsils, villages, document_types, document_schema_versions, documents, document_pages, document_metadata, document_status_history and upload_limits. Districts map one-to-one to existing jurisdiction scopes. Composite foreign keys prevent cross-department parent references. Document village is required; pinned schema is nullable. PostGIS/geometry remains deferred.

SQL grants keep land_app separate from the migration owner. Runtime cannot create tables, delete documents, mutate historical rows or change hierarchy entries. A document trigger prevents rewriting its original identity, location, hash, uploader or pinned schema. Metadata, status and schema histories reject mutation even by ordinary owner DML. Immutable triggers are not protection from a malicious database administrator who can disable them. User-scope triggers prevent cross-department assignment. Use new migrations for changes; applied checksums must remain unchanged.

Phase 3 migrations `0003_processing.sql` and `0004_processing_permissions.sql` add `processing_jobs`, `processing_attempts`, `processing_outbox`, `processing_artifacts` and `processing_job_history`. The application worker uses these tables for durable submit/poll/ingest and preserves rejected model payloads as diagnostic artifacts.

## Tables by module

| Module | Tables and main relationships |
|---|---|
| identity | users(department_id, login, password_hash, active); roles; permissions; user_roles; role_permissions; user_scopes(user_id, administrative scope); sessions(user_id, token_hash, expiry, revoked_at) |
| master-data | departments; states; districts(state_id); tehsils(district_id); villages(tehsil_id), each with unique scoped code/name/source/version |
| document-types | document_types(code, name); document_schema_versions(type_id, version, JSON schema, required/critical fields), unique type/version |
| documents | documents(department_id, uploader_id, village_id nullable, status, revision, original_key, MIME, byte_size, sha256); document_metadata(document_id, version, schema-bound JSONB); document_pages(document_id, page_number, dimensions, derived_key, transform); document_status_history |
| processing | processing_jobs(document_id, revision, request/payload hashes, status, remote job/model metadata); processing_attempts(job_id, operation, attempt, status, remote ID, error); processing_outbox(job_id, submit/poll event, availability and lock); processing_artifacts(job_id, accepted/rejected payload and hash); processing_job_history(job_id, status/stage transitions) |
| validation | validation_rules(code, version, severity, configuration); validation_results(review_revision_id or extraction_result_id, rule_id, field_path, status, source, expected/actual, resolution) |
| duplicates | duplicate_matches(document_revision, candidate_record_version_id or candidate_document_id, signals, score, state, resolved_by, reason) |
| verification | review_revisions(document_id, base_extraction_id, revision, values); verification_tasks(document_id, submitted_revision, assignee, state); verification_actions(task_id, action, actor, reason, timestamp); field_decisions(task_id, revision, field_path, decision); field_corrections(task_id, field_path, old/new, source, reason) |
| land-records | land_records(department_id, current_approved_version_id); land_record_versions(record_id, version, document_id, review_revision_id, approved_snapshot, approver, timestamp); landowners(version_id, name, relationship, ownership); mutation_records(version_id, number, date, details); registration_records(version_id, number, date, details) |
| gis | gis_sources(provenance, source_crs, mock/live); gis_parcels(source_id, village_id, survey_number, geometry, source_area/unit); record_parcel_links(record_version_id, parcel_id, status, reviewer, reason); parcel_link_history |
| integrations | integrations(adapter, mode, mapping_version, configuration, secret_reference); integration_runs(destination_id, approved_version_id, idempotency_key, attempt, state, acknowledgement, error) |
| feedback | feedback_examples(approved_version_id, field_path, prediction, truth, confidence, was_corrected, evidence, model/schema versions); feedback_datasets(version, scope, approval); feedback_dataset_items; evaluation_runs(dataset_id, model_version, metrics, denominators) |
| audit/infrastructure | audit_logs(actor/service identity, action, entity/id, before/after restricted JSONB, reason, request_id, timestamp); outbox_events(type, key, payload_ref, state, attempts, available_at); pg-boss-owned queue schema |

## Constraints and transactions

Every scoped child must belong to the same department/jurisdiction as its parent. Use composite keys/FKs where practical and transactional authorization checks; guessing a UUID never grants access. Administrative hierarchy validates state → district → tehsil → village.

Unique constraints: login; type/version; document/page; result/field_path; record/version; logical request_key; destination/version/mapping delivery key. A partial unique index limits each document to one active verification task. Findings refer to exactly one versioned input target. The current-approved pointer must reference a version of the same record.

Approval transaction checks task/revision and all blockers, creates immutable version/owners/mutations/registration, stores actor/audit, updates current pointer and records feedback intent. Preserve unchanged verified fields as well as corrections. A repeated approval cannot create a second version.

No cascading deletion of source evidence, approved versions or audit. Archive policy and retention need departmental decisions. Application DB roles cannot update historical approved/audit rows; this is not a cryptographic tamper-proof claim.

## Index and query plan

Index FKs and scoped queue/list predicates: documents(department_id,status,created_at), tasks(assignee,state,priority), audit(entity_type,entity_id,timestamp), model runs(document_id,started_at), deliveries(destination_id,state), and outbox(state,available_at).

Search projections cover document ID, owner name, survey/khasra/khata, registration, document type and hierarchy. Parameterize values and allowlist sort/filter fields. Add trigram/text indexes after query verification, preserving Unicode originals.

Use PostGIS MultiPolygon with SRID 4326, source CRS/provenance and a GiST index. Nullable geometry means unknown, not an invented point. Validate topology and coordinate ranges; use geodesic or appropriate projected measurements for area. GeoJSON uses longitude, latitude order. Review polygon SQL/custom type mapping instead of assuming generic ORM support.

## Migrations and storage

Keep schema definitions and SQL migrations in database; no auto-sync against production. Enable PostGIS explicitly with a migration/privileged setup step. Model service has no access to application tables. File bytes and large raw artifacts stay in private object storage; database rows retain hash, version and object reference.

Test clean migration, upgrade compatibility, transaction rollback, concurrent approval, foreign-scope references and backup restore. Synthetic seeds remain separate from migrations.
