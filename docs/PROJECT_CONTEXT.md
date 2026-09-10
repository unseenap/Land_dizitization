# Project context

Design baseline: 2026-09-09. Problem ID: SIH26018 / 26018. Title: Intelligent Land Record Digitization and Validation System. Organization named in the supplied master: Ministry of Rural Development. These identity and capability statements come from the user's brief; no independent official-problem verification is asserted.

## Source precedence

The user's latest instruction determines the stack and separate-model boundary. MASTER_PROJECT_PROMPT_SIH26018.md is the new capability baseline. The older SIH26018 Master AI Project Prompt.md remains historical source material. CURRENT_STATE records actual progress; implemented code and migrations will determine runtime behavior.

## Objective and users

Convert scanned PDFs, images, handwritten and historical land documents into structured, validated, searchable, GIS-linked digital records. Minimize repetitive transcription while preserving accountable human review and original evidence.

Users are authorized administrators, document operators, verification officers, GIS/data officers and supervisors. Access is constrained by department and state/district/tehsil/village scope. Public access to sensitive records is excluded by default.

## Required capabilities

Secure document repository and metadata; preprocessing; printed, handwritten and multilingual recognition; layout understanding; classification; configurable field extraction; normalization; confidence; rule and cross-database checks; duplicate detection; field/record verification; audit and versions; records/search; GIS/cadastral links; government APIs; correction feedback and evaluation.

Required dashboards: documents processed, measured extraction accuracy, validation status, pending cases, error statistics, state-wise and district-wise progress. Confidence is a separate metric.

Land fields include owner details, survey/khasra/khata numbers, plot area/unit, village/tehsil/district/state, classification, ownership, mutations and registration. Repeating owners and mutation records must be supported.

## Runtime ownership

Next.js owns frontend, backend APIs, permissions, validation, workflow, records and integration policy. PostgreSQL stores application data; PostGIS stores spatial data. Private object storage stores files. The separately deployed model owns preprocessing, OCR/handwriting/layout recognition and learned extraction. Its implementation language and hosting can differ without changing the app.

A TypeScript worker runs application jobs outside HTTP request lifetimes. It does not implement an alternative backend API or host models.

## Assumptions and limits

No actual model URL, endpoint schema, credentials, supported language list, dataset or jurisdiction rules have been supplied. The documented model contract is a proposal for both teams to align on; an adapter will map an existing service if necessary.

Use synthetic data and mock government connectors first. State/language-specific capability claims need representative fixtures. Human record approval is the proposed MVP default even when no field correction is needed. Thresholds remain configurable, not production standards.

Phases 1–4 implement Next.js, PostgreSQL migrations, scoped identity/user management, audit, administrative hierarchy, versioned document types, private uploads/previews, durable model processing, evidence-aware extraction, normalization, validation and duplicate review. Real model connection, review/approval and GIS remain pending. See PHASE_4.md and CURRENT_STATE.md for the verified boundary.
