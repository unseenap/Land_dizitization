# PostgreSQL / PostGIS database

Planned contents: Drizzle schema definitions, versioned reviewed SQL migrations, PostgreSQL/PostGIS setup and synthetic seeds.

One migration owner controls the schema. Spatial MultiPolygon types/indexes may require explicit SQL/custom mappings. Never use destructive schema auto-sync against approved data. Queue schema is managed according to pg-boss version requirements.

No migrations or tables are implemented. See [database design](../docs/DATABASE_SCHEMA.md).
