# Separate model API contract

**Proposed v1 contract for agreement with the model team. No remote endpoint or capability is implemented or verified.** An existing model API may be mapped to this contract by the application adapter.

## Independence and ownership

The model service can serve this app and other authenticated clients. It owns its inference framework, model weights, preprocessing, OCR/handwriting recognition, layout, classification and extraction, plus model-side prompt versions. The Next.js app owns users, documents, business validation, verification, approved records, PostgreSQL and application audit.

The model has no application database credential. It receives a document reference, requested capabilities and a versioned extraction schema. It returns candidate data/evidence, never a final approval. TypeScript adapter operations: getCapabilities, submitJob, getJob, getResult, cancelJob, optionally submitFeedback.

## Authentication and files

Use HTTPS and a server-held scoped bearer credential (or agreed service identity). Only Next.js server/worker can call the model. Never use NEXT_PUBLIC_ for model secrets.

Use time-limited, read-only signed URLs for exact input objects; persist a stable object reference rather than the expiring URL as job identity. On expiry, issue a new authorized URL for the same hash/revision through reconciliation. Local-file demo mode must stream bytes through an authenticated transfer API because a remote model cannot read the application's disk path.

URLs returned by the model must be allowlisted, size-bounded and verified; do not fetch arbitrary URLs. No request may instruct the service to fetch arbitrary internal-network resources. Logs redact credentials and signed URLs.

## Model endpoints

Paths are relative to a configured model base URL, independent of /api/v1 application routes.

| Method / path | Behavior |
|---|---|
| GET /v1/capabilities | Contract versions, formats, max bytes/pages, languages, handwriting/layout support, model versions and async support |
| POST /v1/jobs | Authenticated submit; Idempotency-Key required; 202 remote job ID |
| GET /v1/jobs/{jobId} | QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELLED, stage if available, timestamps and safe error |
| GET /v1/jobs?request_id=... | Reconcile an uncertain submission by stable application request ID |
| GET /v1/jobs/{jobId}/result | Complete versioned result or 409 RESULT_NOT_READY |
| POST /v1/jobs/{jobId}/cancel | Idempotent best-effort cancellation; capability dependent |
| POST /v1/feedback/batches | Optional reviewed dataset delivery; explicit separate permission |

A model exposing only synchronous prediction requires the adapter to invoke it inside the durable worker with bounded deadlines. It must not hold a Next.js upload/processing request open.

## Submission example

~~~json
{
  "contract_version": "1.0",
  "request_id": "4b69113f-1256-4ec5-a50d-4d5a2a5628e5",
  "document_id": "411e649d-763e-4b53-8afd-7ae2d196589e",
  "document_revision": 1,
  "input": {
    "download_url": "https://storage.example.invalid/private/signed-input",
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "mime_type": "application/pdf"
  },
  "tasks": ["preprocess", "ocr", "layout", "classify", "extract"],
  "language_hints": ["hi", "en"],
  "schema": {
    "id": "land-record",
    "version": 1,
    "json_schema": {
      "type": "object",
      "properties": {
        "survey_number": {"type": ["string", "null"]}
      },
      "required": ["survey_number"],
      "additionalProperties": false
    }
  },
  "requested_model_version": null
}
~~~

The example deliberately includes only one field; actual schemas include all fields configured for the selected type. A null requested version means use the service default, but the response must record the exact version used. Production runs should pin an approved model profile.

## Result example

~~~json
{
  "contract_version": "1.0",
  "request_id": "4b69113f-1256-4ec5-a50d-4d5a2a5628e5",
  "job_id": "model-job-001",
  "document_id": "411e649d-763e-4b53-8afd-7ae2d196589e",
  "document_revision": 1,
  "input_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "schema_id": "land-record",
  "schema_version": 1,
  "model": {"provider": "separate-service", "name": "land-model", "version": "demo-v1", "prompt_version": "extract-v1"},
  "languages": ["hi"],
  "classification": {"document_type": "land-record", "confidence": 0.94},
  "pages": [{
    "page": 1,
    "width": 1000,
    "height": 1400,
    "ocr_text": "123/4",
    "blocks": [{"id": "b1", "text": "123/4", "bbox": [0.10, 0.20, 0.35, 0.25], "confidence": 0.91}]
  }],
  "fields": {
    "survey_number": {
      "value": "123/4",
      "confidence": 0.91,
      "missing_reason": null,
      "evidence": [{"page": 1, "block_ids": ["b1"], "bbox": [0.10, 0.20, 0.35, 0.25], "source_text": "123/4"}]
    }
  },
  "warnings": [],
  "timing": {"processing_ms": 1200}
}
~~~

Bounding boxes are normalized original-page coordinates [xmin,ymin,xmax,ymax], top-left origin, page numbers starting at 1. Derived-page transforms must map evidence back to the original. Confidence is nullable or 0–1; missing fields use null plus a reason. Multi-owner/mutation data uses schema-defined repeated groups with stable field paths.

## Acceptance and failures

Validate contract/schema versions, job/request/document IDs, revision, input hash, expected model profile, page references, coordinate ranges, allowed field keys, types and size. Reject unknown major contract versions. A stale completion remains historical output and cannot replace a newer revision. Unvalidated response artifacts are quarantined diagnostic data, never land records.

Error shape: error.code, error.message, error.retryable, request_id. Codes include UNSUPPORTED_FORMAT, UNSUPPORTED_LANGUAGE, INVALID_INPUT, SCHEMA_UNSUPPORTED, RATE_LIMITED, MODEL_UNAVAILABLE and INTERNAL_ERROR. An unavailable capability is explicit, never fabricated.

Use a stable logical request ID and payload hash across transient submission retries. Same key/different payload must return conflict. Persist each transport attempt and remote job ID. Reconcile timeouts; retry transient failures with capped backoff and Retry-After. Proposed defaults: three transient attempts, 30-second HTTP timeout, 15-minute overall job deadline, configurable after model benchmarks.

Baseline completion is worker polling with durable scheduled jobs. If webhooks are added later, require an HMAC or agreed signature, timestamp window, event-ID deduplication and server-side job reconciliation. The callback must use the same result-ingestion service as polling; no anonymous callback may finalize data.

## Feedback contract

Approved feedback includes dataset/version, document type, language, field path, original AI value, verified value, was_corrected, original confidence, evidence reference, model/prompt/schema versions and approved record version. Unchanged explicitly verified fields are included for unbiased evaluation. Exports are permission-controlled, minimized and audited. Delivery acknowledges a dataset version; it does not automatically train or deploy a model.

## Contract tests before connection

Test schema-valid results, null confidence, multiple owners, mixed language, unsupported capability, wrong document/hash, expired file URL, duplicate submission, timeout after accepted submission, malformed/oversized result, stale result and model outage. Use mock model fixtures first and label them. Both teams must validate fixtures against the same contract before replacing the mock.
