# validation module

Status: design boundary only; no runtime implementation.

## Ownership

Normalization rules and versioned business/master findings.

## Public operations

Normalize without losing source; validate required fields, dates, area and hierarchy.

## Dependencies and invariants

Call master-data, duplicates and integration public contracts; distinguish unknown from pass.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
