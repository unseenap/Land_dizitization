# integrations module

Status: design boundary only; no runtime implementation.

## Ownership

Government/master adapters, versioned mappings and delivery attempts.

## Public operations

Lookup references and export immutable approved snapshots with acknowledgement.

## Dependencies and invariants

LRMS/DILRMP/cadastral mocks are labelled; no direct model responsibilities here.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
