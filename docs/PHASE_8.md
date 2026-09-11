# Phase 8 - mock government integrations

Phase 8 adds a durable, audited export path from an exact approved land-record version to clearly labelled mock government adapters. It does not contact a real LRMS, DILRMP or government database.

## Implemented

- Reviewed migration `0010_phase8_integrations.sql` adds `integrations`, `integration_export_runs`, `integration_export_attempts`, `integration_export_history` and `integration_outbox`.
- Adapters are `LRMS`, `DILRMP` and `GOVERNMENT_DATABASE`. Modes are `MOCK` and `LIVE`; only mock mode is operational. Export and retry reject live mode with `LIVE_INTEGRATION_UNSUPPORTED`.
- Integration configuration is append-only and stores adapter identity, contract/mapping versions, allowed field keys, parcel-link/source-document flags and notes. No endpoint, credential or secret is accepted or echoed.
- An export pins `record_id`, `record_version_id`, department and integration in one row. Unique keys on `(integration_id,record_version_id)` and `idempotency_key` make repeated requests idempotent.
- Export creation validates that every mapped field key exists in the selected approved snapshot before it enqueues work. Requests return `202`; delivery happens only in the worker.
- The worker claims a transactional outbox event, builds a version-pinned envelope, records an attempt and payload hash, calls the in-process mock adapter, validates acknowledgement identity and stores the acknowledgement/history/audit atomically.
- Mock acknowledgements include `is_mock: true`, adapter, contract/mapping versions, idempotency key, deterministic acknowledgement ID, destination reference and an explicit statement that no real government system was contacted.
- Failed retryable runs are rescheduled with backoff. Exhausted or non-retryable failures become `FAILED`; an authorized user can requeue a retryable failed run while preserving the original idempotency key.
- APIs support scoped configuration, export creation, run reads and retry: `GET/POST /api/v1/integrations`, `POST /api/v1/integrations/{id}/exports`, `GET /api/v1/integrations/{id}/runs` and `POST /api/v1/integrations/{id}/runs/{runId}/retry`.
- The workspace page shows append-only configurations, run states, payload hashes, mock acknowledgement labels and retry controls.

## Permissions and scope

- `integrations.read` is granted to `administrator` and `supervisor`.
- `integrations.manage` and `integrations.export` are granted to `administrator`.
- Integration reads and mutations enforce department identity. Export creation additionally enforces the actor's district jurisdiction scope over the approved record.
- Runtime database grants are least privilege: integration configuration and history are insert/read only; only export runs and outbox rows can be updated by the application role.

## Verification

- Tests, type checking, linting, build and browser checks were intentionally not run for this phase at the user's request.
- Migration `0010_phase8_integrations.sql` was applied to the local demo database.
- The synthetic seed completed and created one clearly labelled mock LRMS, DILRMP and government database integration for each synthetic department.
- The code and migration were reviewed, but runtime behavior must not be described as verified until focused integration and browser tests run.

## Limits

- Mock adapters are deterministic in-process functions and perform no network I/O. They are not government compatibility tests.
- `LIVE` is a reserved configuration value only. Real exchange requires authorized official specifications, sandbox credentials, data-sharing approvals, security testing and reconciliation behavior.
- Source images are never exported. The envelope includes only configured approved fields, IDs, jurisdiction, approval metadata, optional approved parcel links and provenance hashes.
- Unknown-delivery reconciliation, official acknowledgement semantics, rate limits and production monitoring remain future work.
