# document-types module

Status: Phase 2 implemented: department-scoped type creation and immutable schema publication.

## Ownership

Configurable document types and immutable extraction schema versions.

## Public operations

`listTypes`, `createType`, `publishVersion`. Configurable scalar fields expose key, label, type, required and critical annotations. Administrator publication requires the expected current version and a reason.

## Dependencies and invariants

Uploads pin schema versions; UI forms use safe schema contracts. Publishing a new version does not change existing documents. The future processing adapter will consume the pinned schema.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
