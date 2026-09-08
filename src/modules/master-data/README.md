# master-data module

Status: design boundary only; no runtime implementation.

## Ownership

Departments, states, districts, tehsils and villages with source versions.

## Public operations

Administrative lookups and hierarchy validation.

## Dependencies and invariants

Integrations provide reference data; unavailable lookup remains NOT_CHECKED.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
