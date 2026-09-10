# Agent instructions

Read in order:
1. MASTER_PROJECT_PROMPT_SIH26018.md
2. docs/PROJECT_CONTEXT.md
3. docs/TECHNICAL_SPEC.md
4. docs/CURRENT_STATE.md
5. docs/MODULE_STRUCTURE.md and the relevant module README.

The user has authorized Phase 2: configurable document types, administrative master data, secure uploads, private storage/previews, metadata and document history. Preserve the completed Phase 1 identity/RBAC/audit foundation. Next.js is required for frontend AND application backend, PostgreSQL for the database, and a separate model exposed through an API. This overrides illustrative technology recommendations in either supplied master prompt. Model processing and later phases remain outside this request.

- Inspect current files before edits; preserve both supplied master prompts.
- Use Next.js App Router and Route Handlers with TypeScript business modules. Keep routes thin.
- Keep model inference, model weights and training outside this application. Connect through the versioned model API adapter.
- Respect module ownership. Share contract types without exporting database, credentials or server services to browser bundles.
- Enforce authorization inside services for both Route Handlers and Server Components.
- Use reviewed Drizzle/SQL migrations for every database change; preserve API compatibility.
- Validate model and external API outputs before accepting field data; models never approve records.
- Preserve originals, OCR, evidence, corrections, approved versions and audit history.
- Label mocks, unsupported model capabilities and unmeasured accuracy honestly.
- Never commit secrets or confidential real-world documents.
- Use durable jobs and idempotency for external work; never rely on an HTTP request staying alive.
- Test critical changed behavior, update affected docs and CURRENT_STATE after substantial work.
