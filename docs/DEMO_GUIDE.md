# Planned demonstration

Phases 1-3 can be demonstrated now: sign in with a generated synthetic account, configure a document type, upload a fixture, queue processing, run the mock worker and inspect durable job history. Follow PHASE_1.md, PHASE_2.md and PHASE_3.md for setup and credentials. The mock adapter is not OCR; approval and government/GIS integration remain planned.

## Fixtures

Create synthetic jurisdictions and two departments; separate operator/verifier/GIS/admin/supervisor accounts with generated local credentials. Include two document types, English/Hindi or other supported regional scripts, a printed scan, a handwriting sample, low confidence, an invalid location/area, a duplicate and synthetic parcel data.

Real model fixtures must record capabilities and measured results. Mock model results are labelled MOCK and never counted as real OCR accuracy.

## Main scenario

1. Operator logs in and uploads a scanned document with metadata.
2. App preserves the private original and returns document ID.
3. Next.js queues processing; worker submits the document to the independent model API.
4. Available OCR/classification/extraction stages and evidence appear.
5. App validates fields, checks master data/duplicates and displays confidence.
6. Verifier compares source and fields, resolves findings and records field decisions/corrections.
7. Verifier explicitly approves the current revision; immutable record and audit are stored.
8. Search finds the approved record by survey/owner/location.
9. GIS officer reviews its synthetic parcel/cadastral link.
10. Authorized user exports an approved snapshot to a labelled mock government adapter.
11. Supervisor sees required metrics; unmeasured accuracy is shown as unavailable.
12. Reviewed prediction/truth pairs enter the feedback dataset for evaluation and optional approved model-team export.

## Failure checks

Wrong-scope direct ID/file/export denied; corrupt/oversized upload rejected; model offline/unsupported language visible; expired file URL recoverable; duplicate submission deduplicated; stale model result cannot replace new revision; malformed output rejected; unresolved blocker prevents approval; concurrent review returns conflict; model failure retries without reupload; government outage preserves approval; absent parcel stays absent.

## Evidence of completion

Record actual build, fixture versions, model/profile/schema, tested languages, completed/failed steps, timings, evaluation denominators and unresolved defects. No official government connectivity or production readiness is inferred from a mock demonstration.
