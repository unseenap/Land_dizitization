# master-data module

Status: Phase 2 implemented: scoped hierarchy lookup and administrative area creation.

## Ownership

Departments, states, districts, tehsils and villages. Districts map to existing jurisdiction scopes; parent relationships and department consistency are enforced by SQL. Entries are append-only through the current UI/API; external reference-data versioning is future work.

## Public operations

`getMasterData`, `createArea`, `requireVillage`. Administrator creation is scoped; state creation requires all department scopes. Services used by uploads validate the selected village before storage and again inside the write transaction.

## Dependencies and invariants

Integrations provide reference data; unavailable lookup remains NOT_CHECKED.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
