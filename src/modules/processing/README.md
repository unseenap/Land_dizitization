# processing module

Status: Phase 3 implemented. Durable jobs/outbox, model contract validation, mock/HTTP clients and the processing worker are available. OCR inference remains in the separately deployed model service.

## Ownership

Durable jobs, model adapter, OCR/extraction runs and evidence.

## Public operations

Submit and inspect scoped processing jobs; workers submit/poll/reconcile model jobs and ingest only validated results.

## Dependencies and invariants

Model inference stays external. Coordinate validation and audit with idempotent transactions.

## Implementation layout

contracts/ contains browser-safe model schemas, server/ contains the adapter, services and worker, and ui/ contains processing controls. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
