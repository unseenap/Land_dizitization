# feedback module

Status: implemented for Phase 10.

## Ownership

Approved prediction/truth pairs, dataset versions and evaluations.

## Public operations

Create approval-derived datasets, review them, compute reproducible model evaluations and audit authorized model-team exports.

## Dependencies and invariants

Examples are derived only from approved verification snapshots and immutable extraction evidence. Dataset review, evaluation and export are separate authorized actions. Accuracy uses truth-labelled fields as the denominator and never uses model confidence. Exports are idempotent, reviewed and never trigger automatic retraining.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
