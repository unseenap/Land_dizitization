# document-types module

Status: design boundary only; no runtime implementation.

## Ownership

Configurable document types and immutable extraction schema versions.

## Public operations

Publish schema, select type, list fields and critical-field policy.

## Dependencies and invariants

Processing pins schema versions; UI forms use safe schema contracts.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
