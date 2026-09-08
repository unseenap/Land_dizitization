# Durable application job runner

Planned separate TypeScript process using pg-boss/PostgreSQL and the same business services as Next.js.

Responsibilities: outbox dispatch, model submission/reconciliation/polling/result ingestion, bounded retries, government delivery and approved feedback exports. Persist remote IDs and reject stale result promotion.

This process hosts no frontend, application HTTP backend or inference model. It must survive web restarts and use explicit service identity. No worker code or startup command exists yet.

See [architecture](../docs/ARCHITECTURE.md) and [model API contract](../docs/MODEL_API_CONTRACT.md).
