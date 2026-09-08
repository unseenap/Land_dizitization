# AI pipeline and feedback

## Stage ownership

| Stage | Runs in | Stored evidence |
|---|---|---|
| Upload/file checks | Next.js documents | Original object/hash, metadata |
| Preprocessing | Separate model service | Derived page references, transforms |
| Printed/handwritten multilingual OCR | Separate model service | Raw OCR, blocks, language, confidence |
| Layout and classification | Separate model service | Layout/type scores, model versions |
| Schema-based extraction | Separate model service | Strict candidate values and source evidence |
| Schema validation | App processing worker | Accepted/rejected result and reasons |
| Normalization | App validation module | Original plus normalized/transliterated values |
| Business/master checks | App validation and integrations | Versioned findings, source/mode |
| Duplicate detection | App duplicates | Scoped candidates, signals and resolutions |
| Confidence/review routing | App processing/verification | Policy version, score availability and reasons |
| Human review/approval | Next.js verification | Field decisions, corrections and approved version |
| Feedback/evaluation | App feedback; model team consumes approved exports | Versioned truth dataset and evaluation results |

Prompts and model runtimes belong to the separate service. The app sends schema/task profile and records the model/prompt versions reported. It does not install inference libraries. Adapters keep OCR/extraction capability differences out of business modules.

## Structured data and normalization

Required schema groups include landowner_details (repeatable where needed), survey_number, khasra_number, khata_number, plot_area {value, unit}, village, tehsil, district, state, land_classification, ownership details, mutation_records and registration_information. Schemas are immutable versions per document type.

Use strict transport and field schemas. Never infer unreadable identifiers, title ownership or parcel boundaries. Original-language text stays intact. Normalization creates separate values with rule provenance; local area units require jurisdiction-specific conversions. Ambiguous dates and missing master matches remain unresolved. Raw responses and original OCR remain restricted, preserved artifacts.

## Confidence policy

Provider scores are evidence signals, not measured accuracy. Persist OCR, classification and per-field scores independently, including null and method. A proposed conservative document score is the minimum available classification/required-field score, with an explicit coverage ratio. Missing critical scores, values or evidence force review; do not hide missingness through averaging.

Demo bands may start at >=0.90 high, >=0.70 and <0.90 medium, <0.70 low; these are configurable uncalibrated starting values. Rule failures and unresolved high-risk duplicates override a high score. All MVP records still need officer approval; high confidence allows fewer corrections.

Calibration and policy changes require versioned evaluation on held-out fixtures. A correct-format check or unavailable external lookup never increases an accuracy claim.

## Validation and duplicates

Findings contain rule_id/version, field_path, status PASS/WARNING/FAIL/NOT_CHECKED, severity INFO/LOW/MEDIUM/HIGH/CRITICAL, message, expected/actual value, source and mock/live indicator. Missing external data is NOT_CHECKED. Required blocking findings must be resolved with correction or an explicitly allowed, justified override.

Duplicate candidates combine exact document hash, scoped survey/khasra/khata/registration match, owner/location similarity and area comparison. Optional perceptual hashes come from model preprocessing. Store signal breakdown and compared record versions. Never merge automatically; an officer resolves possible duplicates. Candidate searches cannot leak another jurisdiction's record IDs or counts.

## Durable execution

Persist input revision/hash, schema/profile version, external request/job IDs, stage/attempt, model and prompt versions, timestamps, latency, output references and sanitized errors. Processing is driven by a PostgreSQL-backed queue and outbox; each remote call has a deadline. No unawaited HTTP work is relied upon after a Next.js response.

Retry transient failures without reupload. New input creates a new run and invalidates downstream results. Late results stay attached to their original revision. Model failure and business validation failure are different states. See MODEL_API_CONTRACT for transport semantics.

## Learning and accuracy

Store verified prediction/truth pairs for all reviewed fields, including unchanged ones. Pin dataset, model, prompt/schema and normalization versions. Partition datasets by source document/parcel to reduce train/test leakage and stratify by language/type/scan quality.

Report per-field raw and normalized match, per-type/language accuracy, correction frequency and OCR CER/WER when reference transcription exists. Denominator = reference-labelled evaluated fields; absent truth displays “Not evaluated”. Distinguish operational review samples from held-out evaluation to avoid implying representative accuracy.

Approved dataset export supports prompt improvement, OCR tuning or fine-tuning in the independent model project. Compare candidate models against held-out truth before accepting a new model profile. No automatic retraining or deployment occurs on each human correction.
