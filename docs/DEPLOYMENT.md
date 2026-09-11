# Development and deployment

Phases 1–8 run as one Next.js UI/API process, PostgreSQL, persistent private local storage and optional TypeScript worker processes. The processing worker coordinates the separate model API; the integration worker processes mock government exports. S3, PostGIS and live government endpoints remain future services. File inspection uses bounded local worker threads; no model is required for upload or preview.

## Verified environment

Node.js 22.20.0, npm 10.9.3, PostgreSQL 18.4, Next.js 16.3.4 and React 19.2.8. Installed versions are pinned in package.json/package-lock.json. Browser tests use Chrome through Playwright.

## Windows local setup

Run from the repository root. PostgreSQL tools must be on PATH.

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:seed
npm run dev
npm run worker:processing
npm run worker:integrations
```

Open http://127.0.0.1:3000. Run each worker command in its own long-lived terminal. The DB script initializes an isolated loopback cluster at .local-data/postgres on port 55432, creates land_owner and restricted land_app credentials, and writes .env.local. It does not alter an existing default-port database. Rerunning starts the same cluster and preserves data. It refuses to overwrite an existing unrelated .env.local during first setup.

Generated demo credentials are in ignored .local-data/demo-accounts.json. Rerunning the seed adds missing fixtures and does not reset existing users or passwords. If credentials are lost, use an explicit administrator recovery process; the seed does not silently overwrite accounts.

Stop the isolated database when desired:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1 -Stop
```

If a managed execution sandbox blocks PostgreSQL's Windows restricted-token startup, run this local setup command in the user's regular terminal. Browser tests should also run in a regular terminal if the sandbox prevents Playwright from shutting down its server process. Do not change system database services to work around it.

## Other PostgreSQL installations

Provision a database and a LOGIN role named land_app, with a separate migration owner that can create tables and grant privileges. Set DATABASE_URL for land_app and MIGRATION_DATABASE_URL for the owner in .env.local or protected environment injection. The migration grants explicitly target land_app. Runtime must not connect as owner or superuser.

Set APP_URL to the exact browser origin; the default local origin is http://127.0.0.1:3000. SESSION_SECRET must contain at least 32 characters. APP_ENV=production requires an HTTPS APP_URL. Session cookies are Secure on HTTPS. SESSION_HOURS defaults to 8 and is constrained to 1–24.

## Build and verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run security:client
npm run test:e2e
npm run start
```

Integration tests need a migration owner permitted to create/drop uniquely named test databases. They seed isolated fixtures, exercise permissions/transactions/file storage and remove only generated test databases and temporary storage. Browser tests target the local demo app: they create/deactivate synthetic users and create document/type/master-data fixtures, preserving their history. They start the production server automatically if it is not already running. Build before running browser tests.

The client security check searches client build files for configured server secret values without printing them. It is a targeted regression check, not a comprehensive penetration test.

## Operations and production limits

/api/v1/health/live checks the app process. /api/v1/health/ready verifies database/session-table access. API logs contain request ID, event code, status and timestamp; credentials and request bodies are excluded. Audit events capture logins and account changes in PostgreSQL.

Before production, configure HTTPS termination, secure environment injection, least-privilege connections, backups and a restore test, reviewed CSP, rate limits at the trusted proxy, session/throttle retention, account recovery, SSO/MFA decisions and jurisdiction provisioning. Do not inject MIGRATION_DATABASE_URL into the deployed web runtime. Current labels and accounts are for synthetic development only.

Phase 2 uses `STORAGE_PROVIDER=local`, `STORAGE_PATH=./.local-storage`. Grant the web-process OS account access and prevent public/static directory mapping. Back up source objects and PostgreSQL together. The web deployment must include `scripts/inspect-document.mjs`, its runtime dependencies and generated `public/pdfjs` assets (copied automatically before build/dev). Ephemeral serverless filesystems and unshared multi-instance disks are unsupported. See PHASE_2.md for limits, failure cleanup and production scanning/orphan-reconciliation gaps.

Worker deployment must persist the PostgreSQL outboxes independently of HTTP lifetimes. Shared object storage and authenticated model access are required for real document processing. PostGIS, model profiles and live government mappings, credentials and data-transfer authorization must be verified before enabling anything beyond the current labelled mocks.
