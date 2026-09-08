# dashboard module

Status: design boundary only; no runtime implementation.

## Ownership

Scoped read models and required metric definitions.

## Public operations

Processed, measured accuracy, validation, pending, errors and state/district progress.

## Dependencies and invariants

Metrics come from module read contracts/views; no fake accuracy or unknown denominators.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
