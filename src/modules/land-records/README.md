# land-records module

Status: implemented in Phase 6.

## Ownership

Immutable approved versions, owners, mutations, registration and scoped search.

## Public operations

Materialize an approved verification snapshot in one transaction, retrieve scoped records/history and search current approved versions. Amendments are not implemented.

## Dependencies and invariants

Writes come only through the approved verification workflow. Record versions, owners, mutations and registration records are database-enforced immutable; the current-version pointer can only reference a version of the same record.

## Implementation layout

`contracts/` contains browser-safe typed schemas and DTOs, and `server/` contains the transactional materialization, authorization and search service. Routes remain in src/app and delegate to this module. See [Phase 6](../../../docs/PHASE_6.md).

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
