# Phase 10 — Feedback and evaluation

## Objective

Turn approved human decisions into reproducible model-feedback datasets, calculate explicit model-quality metrics with fixed denominators, and provide reviewed, audited exports to the independent model team without automatic retraining.

## Implemented

- Reviewed migration `0012_phase10_feedback.sql` adds `feedback_examples`, `feedback_datasets`, `feedback_dataset_items`, `evaluation_runs` and `feedback_export_runs`.
- `feedback.read`, `feedback.manage` and `feedback.export` separate scoped visibility, dataset/evaluation management and model-team export.
- Examples are derived only from approved verification snapshots, immutable extraction evidence and the latest human field decision. Each row pins task/run/document/schema identity, document type, language, prediction, truth, confidence, correction state, evidence and model metadata.
- Dataset creation selects approved examples by an explicit inclusive date range and jurisdiction scope, then pins the exact examples in immutable dataset items. A second human review approves or rejects the dataset before evaluation or export.
- Evaluation runs are immutable and unique per dataset/model version. Metrics report total examples, truth-labelled denominator, correct/incorrect fields, missing predictions, field accuracy, correction rate, average confidence and document-type/language/field segments.
- Accuracy is calculated only from truth-labelled fields. Confidence is reported separately and never used as an accuracy claim. Empty denominators remain `Not evaluated`.
- Model-team exports are idempotent per approved dataset, store a deterministic payload and SHA-256 hash, include available evaluations, append audit events and explicitly set `automaticRetraining: false`.
- APIs and UI are available at `/api/v1/feedback/*` and `/feedback`.
- Migration `0012_phase10_feedback.sql` was applied to the local demo database.

## Deliberate boundaries

- No model retraining, weight update, active-learning loop or external model-team transfer occurs in this application.
- Metrics are field-level exact-match accuracy against approved values. Character error rate and word error rate require full reference transcriptions and remain pending.
- Exports are generated only after explicit dataset review and a separate export permission.
- Dataset visibility requires every pinned example to remain within the requesting actor's department/jurisdiction scope.

## Verification status

Phase 11 added a focused PostgreSQL integration test covering the approved prediction/truth workflow, scoped dataset creation, review immutability, model evaluation, field accuracy, correction rate and idempotent audited export. This test exposed and fixed two issues: missing feedback role grants in the synthetic seed and a PostgreSQL `json`/`jsonb` coalesce error in dataset listing. The full Phase 11 gate includes this test.
