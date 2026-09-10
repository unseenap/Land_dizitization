# Durable application job runner

Separate TypeScript process using PostgreSQL outbox events and the same business services as Next.js. Start it with `npm run worker:processing`.

Responsibilities: outbox dispatch, model submission/reconciliation/polling/result ingestion, bounded retries, government delivery and approved feedback exports. Persist remote IDs and reject stale result promotion.

This process hosts no frontend, application HTTP backend or inference model. It must survive web restarts and use explicit service identity. Queue supervision and production process-manager configuration remain deployment work.

See [architecture](../docs/ARCHITECTURE.md) and [model API contract](../docs/MODEL_API_CONTRACT.md).
