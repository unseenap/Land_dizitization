# Phase 9 — Dashboard

## Implemented

- Added permission `dashboard.read` for every existing role through reviewed migration `0011_phase9_dashboard.sql`.
- Implemented the browser-safe dashboard contract and server-only scoped metric service.
- Added `GET /api/v1/dashboard/summary` and replaced the dashboard welcome page with scoped workflow metrics.
- Reported documents processed, pending verification, approved records, processing failures, validation findings, confidence, error statistics, state progress and district progress.
- State/district rows use the known scoped document denominator and reconcile with the top-level document total.
- Extraction accuracy is explicitly `NOT_MEASURED`; average model confidence is shown separately and never labelled as accuracy.

## Metric definitions

- **Documents processed:** distinct scoped documents with at least one `SUCCEEDED` processing job.
- **Pending verification:** documents currently in `VERIFICATION_PENDING` or `RETURNED_FOR_EDIT`.
- **Approved records:** documents currently in `VERIFICATION_APPROVED`.
- **Validation status:** latest extraction run per document and its current finding counts.
- **Confidence:** current extraction fields with confidence, missing confidence, average confidence and the fixed 0.7 review threshold.
- **Error statistics:** processing jobs in `FAILED`, `CANCELLED` or `RESULT_REJECTED`, grouped by error code.
- **State/district progress:** processed and approved workflow shares. No total land-record inventory denominator has been supplied, so these are not represented as national or state inventory completion.

## Verification

- Migration `0011_phase9_dashboard.sql` was applied successfully.
- A non-test service check against the synthetic seed reconciled 22 top-level documents, 22 state documents and 22 district documents.
- The state-count duplication found during that check was corrected and the reconciliation check passed.

## Limits

- Phase 9 tests, typecheck, lint, build and browser checks were intentionally deferred at the user's request.
- The current synthetic seed has no completed processing jobs, so processed/approved values are zero until the demo workflow runs.
- Accuracy, OCR capability and model quality measurements remained unavailable at Phase 9 delivery until the Phase 10 feedback workflow produced evaluated data.
