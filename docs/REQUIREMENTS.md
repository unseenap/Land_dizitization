# Requirements and traceability

Baseline: MASTER_PROJECT_PROMPT_SIH26018.md with the user's Next.js/PostgreSQL/external-model override. All requirements below are planned.

## Functional requirements

| ID | Capability | Owner | Acceptance |
|---|---|---|---|
| F01 | Authentication, configurable roles and scope | identity | Direct API/file access from wrong scope denied |
| F02 | PDF/PNG/JPEG upload, batch progress; TIFF when supported | documents | Per-file validation, private preview and unique document ID |
| F03 | Secure repository, metadata and source retention | documents | Original hash/file preserved with metadata/history |
| F04 | Preprocessing and layout understanding | model service via processing | Derived pages and source coordinate transforms returned |
| F05 | Printed, handwritten, multilingual/mixed OCR | model service via processing | Capability-specific labelled fixtures and per-page output |
| F06 | Classification and configurable schemas | document-types + processing | Multiple types without hard-coded single-template forms |
| F07 | Strict structured extraction of required land fields | processing | Schema-valid values, nulls, confidence and evidence |
| F08 | Non-destructive normalization | validation | Source script/value retained alongside normalized value |
| F09 | Business rules and administrative consistency | validation + master-data | PASS/WARNING/FAIL/NOT_CHECKED with source and severity |
| F10 | Cross-database verification | integrations + validation | Unavailable source is NOT_CHECKED, never silently PASS |
| F11 | Multiple duplicate signals and human resolution | duplicates | Scoped candidate IDs, reasons, score and resolution |
| F12 | Confidence and uncertain-field routing | processing + verification | Configurable bands; missing score/evidence flagged |
| F13 | Field approval, correction, reject/return/record approval | verification | Revision checks, officer identity and reason history |
| F14 | Structured owners/mutations/registration and versions | land-records | Approved snapshots immutable, searchable within scope |
| F15 | Learning feedback and evaluation | feedback | Verified prediction/truth pairs and reproducible metrics |
| F16 | GIS and cadastral layers/linking | gis | Provenance, CRS, reviewed links and absent-geometry handling |
| F17 | Required interactive dashboards | dashboard | Processed, accuracy, validation, pending, errors, state/district progress |
| F18 | Audit/security events | audit | Each material mutation has an attributable event |
| F19 | Government exchange APIs | integrations | Versioned, authenticated, idempotent mock exports |
| F20 | Failure/retry and model independence | processing | Restart without reupload; model separately usable through HTTP |

## Non-functional requirements

| Area | Contract |
|---|---|
| Modularity | Module owns its tables/services; public contracts mediate dependencies |
| Security/privacy | Server-side access checks, private storage, secret isolation, safe uploads |
| Reliability | Durable jobs, bounded retries, revision locks and immutable outputs |
| Traceability | Document → model run → evidence → review → approved version → delivery |
| Usability/accessibility | Split viewer, keyboard editing, focus visibility and text status labels |
| Unicode | Preserve source script; support mixed languages and repeatable groups |
| Performance | Bounded uploads/results, asynchronous inference and indexed scoped queries |
| Scale | Separate web, worker and model deployment; tune pools/concurrency after measurement |
| Maintainability | Typed contracts, migration history, critical tests and current documentation |

## Acceptance policy and assumptions

All MVP records require explicit officer approval; high confidence may avoid correction, not accountability. Proposed demo limits: 25 MiB/file, 100 pages/file, 20 files/batch, configurable and enforced at every relevant boundary. No throughput, accuracy or production threshold is promised.

Learning feedback is core scope in the new brief. Automatic retraining and advanced active-learning ranking are later enhancements. Confidence heatmaps, historical linkage suggestions and natural-language search follow the complete primary workflow.

Official government interfaces, cadastral data, real model capabilities and production retention/identity policy remain external inputs. Use labelled fixtures/mocks without inventing connectivity.
