# duplicates module

Status: Phase 4 implemented. Scoped candidate signals and audited human resolution are available.

## Ownership

Scoped duplicate candidates, similarity signals and resolutions.

## Public operations

Compare hash/identifiers/location/owner/area and record officer decisions.

## Dependencies and invariants

Do not auto-merge or reveal cross-scope candidates; audit resolutions.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
