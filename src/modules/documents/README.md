# documents module

Status: Phase 2 implemented. See [Phase 2](../../../docs/PHASE_2.md).

## Ownership

Original/private objects, pages, metadata, hashes and document history.

## Public operations

`uploadDocument`, `listDocuments`, `getDocument`, `updateMetadata`, `getDocumentPages`, `getDocumentHistory`, `readDocumentFile`. No processing intent or model call is submitted in this phase.

## Dependencies and invariants

Never overwrite originals; scoped file access is independent of knowing an object key.

## Implementation layout

contracts/ contains browser-safe Zod definitions and DTOs. server/ owns scoped service transactions and file inspection. ui/ contains batch upload, PDF canvas preview and metadata editing. Routes stay thin. Shared storage and multipart transport live in src/server; the bounded inspection worker lives in scripts/inspect-document.mjs. Critical tests are in tests/documents.test.ts and tests/e2e/documents.spec.ts.

See [module structure](../../../docs/MODULE_STRUCTURE.md) and [implementation plan](../../../docs/IMPLEMENTATION_PLAN.md).
