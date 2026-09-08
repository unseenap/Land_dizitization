# verification module

Status: design boundary only; no runtime implementation.

## Ownership

Review tasks, revisions, field decisions, corrections and approval orchestration.

## Public operations

Claim, correct, approve fields, return, reject, verify and approve record.

## Dependencies and invariants

Atomic approval calls land-records/audit and records feedback intent; reject stale revision.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
