# verification module

Status: implemented in Phase 5.

## Ownership

Verification tasks, field decisions, typed corrections, workflow history and immutable approval snapshots.

## Public operations

Get a scoped task, review fields, submit for approval, return for correction, reject, submit corrections and approve the record.

## Dependencies and invariants

Approval is human-only, requires decisions for every field, blocks required/critical null values and unresolved duplicates, and stores an immutable snapshot. Service-level authorization and `expectedStatus` stale-state checks protect both server pages and Route Handlers.

## Implementation layout

`contracts/` contains browser-safe schemas and DTOs, `server/` contains the transactional service, and `ui/` contains the split review workbench. Routes remain in `src/app` and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
