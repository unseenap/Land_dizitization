# Independent model service contract

Canonical design: [MODEL_API_CONTRACT](../../docs/MODEL_API_CONTRACT.md).

This boundary will contain versioned language-neutral JSON Schemas/OpenAPI plus accepted/rejected fixtures shared with the model team. The model need not use TypeScript. Transport fixtures must cover capabilities, async submission, reconciliation, results, nulls, evidence, stale revisions and errors.

The application adapter and contract validators are implemented in `src/modules/processing`; shared JSON fixtures and a live model connection are still pending alignment with the independent service. Do not store model weights, inference code or secret credentials here.
