# Phase 4 - extraction, validation and duplicate review

Phase 4 turns an accepted model artifact into immutable, evidence-aware application data. The separately deployed model still owns OCR and extraction; this application owns normalization, authoritative validation, duplicate policy and human duplicate decisions.

## Implemented

- Reviewed migration `0006_phase4_validation.sql` with runtime grants, checks, indexes and immutability triggers.
- `extraction_runs` bind one accepted artifact to its document revision and schema version and record `VALIDATED` or `BLOCKED`.
- `extraction_fields` preserve model source values, normalized values, confidence, missing reasons and page/block/bounding-box evidence.
- `validation_findings` record required-field, type, positive-area, confidence and administrative-hierarchy results with `PASS`, `WARNING`, `FAIL` or `NOT_CHECKED`.
- Text is whitespace-normalized, numeric strings accept comma grouping, dates require `YYYY-MM-DD`, and booleans remain boolean. Invalid or non-positive values become blocking findings.
- State/district/tehsil/village fields are checked against the document's assigned master-data hierarchy; extracted and expected values are retained.
- `duplicate_candidates` compare same-department, same-village, same-schema documents using source hash, survey number, owner name, area and location signals. Scores and reasons are stored without auto-merging.
- Authorized verifiers and administrators can resolve a candidate as duplicate or not duplicate; decisions are audited and cannot be silently rewritten.
- `GET /api/v1/documents/{id}/validation` exposes scoped fields, findings and duplicate candidates.
- `POST /api/v1/duplicates/{id}/resolve` accepts an authorized, CSRF-protected human decision.
- The document detail page shows normalized extraction, confidence, evidence, findings, blockers and duplicate decisions.

## Verification

- The Phase 4 integration test uses a synthetic schema with text, number, date and boolean fields and English/Hindi language hints.
- It verifies source-value preservation, normalization, evidence, master-data matching, duplicate signals, blocking status, operator denial and verifier resolution.
- All 24 PostgreSQL integration tests pass, including the prior Phase 1–3 suites.
- Production build, TypeScript and ESLint pass.
- All 6 Chrome E2E scenarios pass, and the client-build scan found no configured server secrets.

## Limits

- The default mock model still returns no inference. Contract fixtures drive Phase 4 tests; no extraction accuracy is claimed.
- Duplicate matching is deterministic and scoped to the same village/schema within a department. Fuzzy name, transliteration and cross-village matching remain future work.
- Confidence review threshold is currently 0.7 and duplicate threshold is 0.5 with at least two signals; these are application defaults, not certified production thresholds.
- Duplicate resolution does not approve a record or clear the immutable historical blocker. Phase 5 verification must consume the resolution decision before final approval.
