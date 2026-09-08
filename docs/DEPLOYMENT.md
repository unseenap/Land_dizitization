# Deployment plan

**No runtime is installed or deployed.** Current repository contains documentation, module ownership files and environment/ignore templates.

## Runtime topology

1. Next.js Node runtime: frontend pages and backend APIs together.
2. TypeScript worker: durable processing, polling, integration and feedback jobs.
3. PostgreSQL with PostGIS: app data, outbox and pg-boss queue.
4. Private S3-compatible storage: originals and result artifacts.
5. Separate model service: independently deployed and reachable by authenticated API.

Recommend a persistent Node/container deployment for the app/worker prototype, with database and object storage separately managed. If the web runtime is serverless, keep the worker persistent and use shared object storage; never depend on an ephemeral web filesystem.

## Future configuration

The root .env.example is a configuration template, not validated runtime code.

| Variable group | Purpose |
|---|---|
| APP_ENV, APP_URL, SESSION_SECRET | Runtime environment, public application URL and secret |
| DATABASE_URL, DATABASE_POOL_MAX | PostgreSQL connection and per-process pool limit |
| STORAGE_PROVIDER, STORAGE_PATH | Local-demo or S3-compatible storage |
| S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY | Shared private object storage |
| MODEL_PROVIDER, MODEL_API_BASE_URL, MODEL_API_KEY | Mock/HTTP model adapter selection and server-only endpoint/secret |
| MODEL_CONTRACT_VERSION, MODEL_PROFILE | Pinned exchange contract and inference profile |
| MODEL_HTTP_TIMEOUT_MS, MODEL_JOB_TIMEOUT_MS, MODEL_POLL_INTERVAL_MS | Bounded transport/job lifetime and polling |
| MODEL_MAX_ATTEMPTS | Transient retry budget |
| MAX_UPLOAD_MB, MAX_DOCUMENT_PAGES, MAX_BATCH_FILES | Proposed demo file limits |
| CONFIDENCE_HIGH_THRESHOLD, CONFIDENCE_REVIEW_THRESHOLD | Versioned review policy starting values |
| INTEGRATION_MODE, LOG_LEVEL | Labelled mock/live government mode and redacted logging |

The queue uses DATABASE_URL; no separate queue service is required in the recommended baseline. Configuration must fail fast on missing production secrets, invalid thresholds or live mode without an endpoint. Model URL/key are never browser-visible.

## Setup sequence after implementation authorization

Select compatible stable Next.js/Node/TypeScript/database-driver/queue versions and pin a lockfile. Create package scripts and Next.js configuration, validate environment, provision PostgreSQL/PostGIS and private storage, apply reviewed migrations, seed synthetic accounts/data, start web and worker, then verify model capabilities/contract.

Frontend and backend share one Next.js development/start command. Worker gets a separate script. Document exact installation, dev, build, worker, migration, seed and test commands only after verifying them. No runnable commands or sample credentials exist yet.

## Operations

Readiness verifies DB/storage and exposes model health separately so a model outage need not block record reading. Observe queue age, remote-job age, retry counts, schema rejection rate, processing duration, validation failures and approved export delivery.

Tune combined web/worker connection pools within database limits. Drain workers during upgrades; reconcile pending outbox and remote jobs after restarts. Never perform schema migrations per HTTP request. Use compatible app/migration rollout and a tested rollback plan.

Back up database and object storage coherently, encrypt/restrict backups and test restoration. Define retention and recovery objectives with the department. Model deployment lifecycle is independent; new model profiles require compatibility and held-out quality checks before selection.
