# Integrations module

Owns department-scoped government adapter configuration and approved-record delivery. Browser-safe contracts live in `contracts/`; authorization, transactions, mock adapters and worker logic live in `server/`.

## Current boundary

- Supports mock LRMS, DILRMP and government database exchange only.
- Stores append-only configuration with contract/mapping versions; no credentials or endpoints.
- Queues an idempotent export of one exact approved record version.
- Processes delivery through `integration_outbox` in `npm run worker:integrations`.
- Stores attempts, history, payload hash, mock acknowledgement and audit events.
- Rejects live mode as unsupported until authorized official integration work exists.

The mock acknowledgement explicitly says that no real government system was contacted. See `docs/PHASE_8.md` for the detailed boundary and deferred verification status.
