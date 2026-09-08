# audit module

Status: design boundary only; no runtime implementation.

## Ownership

Append-only attributable application/security events and authorized event search.

## Public operations

Append inside business transactions; scoped history retrieval.

## Dependencies and invariants

Restrict mutation and reading of before/after values; no secrets in event payloads.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
