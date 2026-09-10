# audit module

Status: Phase 1 implemented. server/writer.ts appends events inside the mutation transaction. server/service.ts reads scoped history. PostgreSQL grants and a trigger prevent runtime history changes. Full-department readers see department events; narrower-scope readers see only their own events. Document-specific audit is deferred to later phases.

## Ownership

Append-only attributable application/security events and authorized event search.

## Public operations

Append inside business transactions; scoped history retrieval.

## Dependencies and invariants

Restrict mutation and reading of before/after values; no secrets in event payloads.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
