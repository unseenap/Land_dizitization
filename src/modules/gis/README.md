# gis module

Status: Phase 7 implemented with scoped synthetic parcels and reviewed record links. Tests are deferred.

## Ownership

JSONB GeoJSON parcel geometry, explicit source/target CRS, provenance, missing-geometry reasons and link history.

## Public operations

Scoped parcel listing/filtering, proposed/reviewed record links and audited status history.

## Dependencies and invariants

Parcel fixtures are explicitly synthetic. PostGIS, spatial indexing, topology validation, area measurement and discrepancy warnings remain future work; never present synthetic coordinates as real cadastral boundaries.

## Implementation layout

contracts/ contains browser-safe typed schemas, server/ owns scoped transactions and ui/ contains the link workbench. Keep server exports separate from client contracts. Routes remain in src/app and delegate to this module.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
