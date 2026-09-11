# Phase 6 - approved land records and scoped search

Phase 6 materializes the immutable verification snapshot into searchable land-record data. Approval remains a human decision; the model supplies evidence and candidate values only.

## Implemented

- Reviewed migration `0008_phase6_land_records.sql` adds `land_records`, `land_record_versions`, `landowners`, `mutation_records` and `registration_records`.
- `approveVerification` and record materialization run in one PostgreSQL transaction. Approval atomically creates or reuses one record per source document, creates one immutable version per approved verification task, updates the current-version pointer and appends the `records.version_created` audit event.
- The unique `task_id` on `land_record_versions` makes repeated approval idempotent. The current-version pointer is constrained to a version of the same record.
- Database guards make record versions, owners, mutation records and registration records immutable through ordinary application DML. Land-record identity is immutable; only the current pointer and update timestamp can change.
- Standard approved fields map to owner, survey, khasra, khata, area/unit, classification, ownership, registration and mutation columns. Nonstandard fields remain in the immutable approval snapshot and are displayed by the record detail page.
- `GET /api/v1/records`, `GET /api/v1/records/{id}`, `GET /api/v1/records/{id}/versions` and `GET /api/v1/search` expose scoped list, detail and history reads.
- The records UI supports paginated text search, village/type filters, approved-record detail, source and verification links, owners, mutations, registration data, approved fields and version history.
- Document detail links an approved document to its materialized record.

## Permissions and scope

- `records.read` is granted to every seeded workspace role.
- All record reads enforce `records.read`, department identity and district jurisdiction scope in the land-records service.
- Direct record IDs outside the caller's scope return `404`; they are never listed through search.
- Search reads only the current approved version. Draft, rejected and unapproved extraction results are not searchable records.

## Verification

- The PostgreSQL integration suite covers atomic approval-to-record materialization, correction propagation, owner/village/type search, owner/mutation/registration rows, current-pointer updates, two-version history, source and artifact hashes, foreign-scope denial, database rejection of illegal version edits and the `records.version_created` audit event.
- All 24 PostgreSQL integration tests pass.
- TypeScript, ESLint, the production build, the client-build secret scan and all 6 Chrome E2E scenarios pass.
- Migration `0008_phase6_land_records.sql` was applied to the local demo database.

## Limits

- The default model adapter performs no inference. Phase 6 verifies application materialization and search, not OCR or extraction accuracy.
- Search is case-insensitive substring matching over the indexed standard columns. Fuzzy, transliteration and jurisdiction-specific search remain future work.
- Materialization supports the standard single-owner and single mutation/registration field groups in this phase. The immutable snapshot preserves every approved field, but a repeating multi-owner/multi-mutation editor is not implemented.
- Amendments are not implemented. A later amendment must create a new immutable version and never rewrite an approved one.
- GIS parcel links, government export and feedback datasets read or extend approved versions in later phases.
