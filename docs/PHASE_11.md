# Phase 11 — Acceptance and deployment

## Implemented

- Added the reproducible `npm run acceptance` command, which runs the full local gate in order: lint, TypeScript, integration tests, production build, client secret scan and browser scenarios.
- Added focused feedback integration coverage for the complete approved prediction/truth → dataset review → evaluation → audited export path.
- Fixed fresh-database seeding so all Phase 2–Phase 10 role permissions are granted after synthetic roles are created.
- Fixed a PostgreSQL `json`/`jsonb` coalesce error in feedback dataset summaries.
- Confirmed the synthetic migration, seed and fixture workflow for the local PostgreSQL environment.
- Verified the deployable Next.js UI/API surface and separate durable processing/integration worker entrypoints.
- Finalized the end-to-end demonstration and deployment guides while preserving the explicit mock-model and mock-government boundaries.

## Acceptance results

Recorded on 2026-09-11 with Node.js 22.20.0, npm 10.9.3, PostgreSQL 18.4 and Chrome through Playwright:

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 25 tests passed |
| `npm run build` | Production build passed; 50 application/API routes generated |
| `npm run security:client` | 25 client build files checked; configured server secrets not found |
| `npm run test:e2e` | 6 Chrome scenarios passed |

No accuracy, official government integration or production-security certification is inferred from these checks.

## Deployment boundary

The repository contains the application, workers, SQL migrations, synthetic seed data and deployment guidance. It does not contain an independently deployed OCR model, model weights, real government credentials or a live government integration. The model adapter, government adapters and parcel fixtures are explicitly labelled mocks and remain replaceable through their contracts.

Before a real deployment, complete the operational prerequisites in `docs/DEPLOYMENT.md`, connect the authorized model API, configure persistent shared storage and PostgreSQL, and perform an independent infrastructure/security review. Do not inject the migration-owner credential into the web runtime.

## Reproduction

```powershell
npm ci
npm run db:local
npm run db:migrate
npm run db:seed
npm run acceptance
```

Browser tests require the local demo database and installed Chrome. The integration tests create isolated temporary databases and storage, while browser tests intentionally retain their synthetic users and audit history.
