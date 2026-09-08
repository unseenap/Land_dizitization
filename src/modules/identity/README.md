# identity module

Status: design boundary only; no runtime implementation.

## Ownership

Users, roles, permissions, sessions and department/jurisdiction scopes.

## Public operations

Login/logout/current identity; permission policies for every service entrypoint.

## Dependencies and invariants

Audit events; deny foreign objects and revoke sessions on access changes.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
