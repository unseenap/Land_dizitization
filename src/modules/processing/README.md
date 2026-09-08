# processing module

Status: design boundary only; no runtime implementation.

## Ownership

Durable jobs, model adapter, OCR/extraction runs and evidence.

## Public operations

Submit/reconcile/poll model jobs, validate result identity/schema and route review.

## Dependencies and invariants

Model inference stays external. Coordinate validation and audit with idempotent transactions.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
