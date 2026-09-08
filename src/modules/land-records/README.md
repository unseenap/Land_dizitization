# land-records module

Status: design boundary only; no runtime implementation.

## Ownership

Immutable approved versions, owners, mutations, registration and scoped search.

## Public operations

Create approved snapshot, retrieve/history/search and initiate amendments.

## Dependencies and invariants

Writes come through approved workflow; old approved data remains available.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
