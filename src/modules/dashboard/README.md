# dashboard module

Status: Phase 9 implemented for scoped workflow metrics.

## Ownership

Scoped read models and required metric definitions.

## Public operations

Processed documents, validation status, pending verification, processing errors, model confidence and state/district workflow progress. Measured extraction accuracy remains explicitly unavailable until Phase 10 evaluation data exists.

## Dependencies and invariants

Metrics are computed from scoped application tables. Processed and approved shares use the known document denominator, not an invented total land-record inventory. Confidence is always reported separately from accuracy.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
