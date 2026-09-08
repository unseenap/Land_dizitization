# gis module

Status: design boundary only; no runtime implementation.

## Ownership

Parcel geometry, source CRS/provenance, cadastral sources and link history.

## Public operations

Bounded GeoJSON queries, proposed/reviewed record links and discrepancy warnings.

## Dependencies and invariants

Use PostGIS with correct area units; never fabricate parcel boundaries.

## Implementation layout

Add contracts/ for browser-safe typed schemas, server/ for services/repositories/policies, ui/ for module components and tests/ for focused unit tests when implementing. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
