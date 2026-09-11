# Phase 5 - field verification and auditable approval

Phase 5 completes the human-controlled review workflow after extraction and validation. The model supplies evidence and candidate values; authorized people decide, correct, return, reject and approve. The model never approves a record.

## Implemented

- Reviewed migration `0007_phase5_verification.sql` adds verification tasks, field decisions, corrections, workflow history and immutable approval snapshots.
- Accepted model-result ingestion atomically creates one task per extraction run and moves the document to `VERIFICATION_PENDING`.
- Task states are `PENDING_REVIEW`, `RETURNED_FOR_EDIT`, `CORRECTED`, `PENDING_APPROVAL`, `APPROVED` and `REJECTED`.
- `GET /api/v1/verifications/{id}` returns a scoped, browser-safe task view with document identity, artifact hash, fields, evidence, findings, duplicate candidates, decisions, corrections, history and approval.
- `POST /api/v1/verifications/{id}/review` lets verifiers/administrators accept model values, accept typed corrections, submit for approval, return to the operator or reject the record.
- `POST /api/v1/verifications/{id}/corrections` lets operators/administrators submit corrections only after a task is returned for edit.
- `POST /api/v1/verifications/{id}/approve` lets verifiers/administrators create the final approval after required checks pass.
- Every mutating request requires a session, CSRF/Origin checks, service-level permission checks and the expected task status; stale workflow transitions return `409`.
- The document detail page links to its verification task. The split workbench shows source context, candidate values, evidence, decisions, findings, duplicate resolutions and history.

## Approval rules

- Every extraction field must have a review decision.
- Required and critical fields must have a non-null approved value.
- Every duplicate candidate must be resolved as `RESOLVED_NOT_DUPLICATE`; a confirmed duplicate cannot be approved.
- Record-level blocking findings must be resolved except for the duplicate-candidate finding itself, which is governed by the duplicate decision.
- Approval stores an immutable snapshot containing document identity, source hash, artifact hash, fields, findings, duplicates, field decisions, corrections and the human approval reason.
- Approved tasks and their decisions, corrections, history and snapshots are database-enforced as immutable. This protects ordinary application mutations, not a determined database administrator.

## Permissions

- `verification.read` is granted to every workspace role.
- `verification.review` is granted to administrators and verifiers.
- `verification.correct` is granted to administrators and operators.
- Authorization is enforced in the verification service, so both UI pages and Route Handlers share the same policy.

## Verification

- The PostgreSQL integration suite covers task creation, return, correction, field decisions, stale-state rejection, authorization denial, duplicate-resolution consumption, approval snapshot preservation and audit history.
- All 24 PostgreSQL integration tests pass, including the Phase 1–4 suites.
- Production build, TypeScript, ESLint, the client-build secret scan and all 6 Chrome E2E scenarios pass.

## Limits

- There is no verification queue listing yet; users reach the task from the scoped document detail page.
- The model remains a clearly labelled no-inference mock by default, so this phase verifies application workflow and evidence preservation, not OCR accuracy.
- Approval creates the authoritative immutable snapshot in this module. Phase 6 must materialize searchable land-record versions, owners, mutations and registration data from that snapshot.
- Fuzzy/transliteration duplicate matching and configurable review thresholds remain future work.
