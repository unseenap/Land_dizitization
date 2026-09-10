# Server infrastructure

Planned infrastructure: validated environment, PostgreSQL/Drizzle connection and transaction factory, authentication actor context, private storage adapter, pg-boss queue/outbox transport, HTTP clients, redacted logger and typed errors.

No business module owns a second database client or hard-coded model credential. Mark Next.js-facing infrastructure server-only. Worker-compatible services must not depend on React or Next.js request globals; inject actor/configuration/dependencies.

Phase 1 implements config.ts, db.ts, errors.ts, http.ts, logger.ts and page-auth.ts. Phase 2 adds storage.ts and upload-http.ts for private local objects and bounded multipart input. Queue/outbox transport and model HTTP clients remain pending. See [architecture](../../docs/ARCHITECTURE.md) and [Phase 1](../../docs/PHASE_1.md).
