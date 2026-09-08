# Server infrastructure

Planned infrastructure: validated environment, PostgreSQL/Drizzle connection and transaction factory, authentication actor context, private storage adapter, pg-boss queue/outbox transport, HTTP clients, redacted logger and typed errors.

No business module owns a second database client or hard-coded model credential. Mark Next.js-facing infrastructure server-only. Worker-compatible services must not depend on React or Next.js request globals; inject actor/configuration/dependencies.

No runtime code exists. See [architecture](../../docs/ARCHITECTURE.md).
