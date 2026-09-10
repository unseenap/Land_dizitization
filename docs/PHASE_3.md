# Phase 3 - durable processing and model API adapter

Phase 3 adds the application boundary for a separately deployed OCR/document model. This repository does not contain model weights or inference code. The model service is called through a versioned, server-only adapter and all remote work is represented by durable PostgreSQL jobs and outbox events.

## Implemented

- Reviewed migrations `0003_processing.sql`, `0004_processing_permissions.sql` and `0005_processing_role_permissions.sql`.
- Processing jobs store document revision/hash, schema version, request/payload identity, attempts, remote job IDs, model versions, errors and terminal status.
- Transactional outbox events support submit and poll work; a TypeScript worker claims events with `FOR UPDATE SKIP LOCKED`.
- Mock model client implements the proposed v1 contract without claiming OCR accuracy.
- HTTP model client supports bearer authentication, bounded requests, idempotency keys and strict response parsing.
- Contract validation checks IDs, revisions, input hashes, schema versions, allowed fields, page references, bounding boxes, confidence ranges and response shape.
- Accepted results are preserved as immutable artifacts; malformed, stale or mismatched results are quarantined and cannot complete a document.
- `POST /api/v1/documents/{id}/process` queues a job; `GET /api/v1/documents/{id}/processing` returns scoped status, attempts, artifacts and history.
- Document details expose processing status and allow authorized operators to start a job.
- `npm run worker:processing` runs the durable worker loop.

## Model service handoff

Configure `MODEL_API_MODE=mock` for local fixture verification. For the separately hosted service, set `MODEL_API_MODE=http`, `MODEL_API_URL`, `MODEL_API_TOKEN` and `MODEL_INPUT_BASE_URL`. The model API must implement the endpoints in [MODEL_API_CONTRACT.md](MODEL_API_CONTRACT.md). The input URL is an authorized transfer reference; the application never gives the model a database credential or local filesystem path.

The mock result contains no OCR or extracted fields and is labelled with `MOCK_RESULT_NO_INFERENCE`. Replace it only after both teams pass the shared contract fixtures.

## Verification

- Existing Phase 1 and Phase 2 PostgreSQL tests remain passing.
- Processing tests cover idempotent submission, worker submit/poll/ingest, accepted artifacts and malformed-result quarantine.
- TypeScript, ESLint and production build remain required gates.

## Remaining limits

The real OCR endpoint, signed cross-host input delivery, model capabilities negotiation in the UI, retries after process crashes, and production queue supervision still require deployment/model-team integration. OCR, classification, extraction, normalization, business validation and duplicate matching remain later phase responsibilities.
