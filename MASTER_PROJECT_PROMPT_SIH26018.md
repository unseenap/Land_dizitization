# SIH26018 — MASTER PROJECT PROMPT

## 1. Project Identity

**Problem Statement ID:** 26018  
**Problem Statement Title:** Intelligent Land Record Digitization and Validation System  
**Organization:** Ministry of Rural Development  
**Domain:** Land Records, AI, OCR, Computer Vision, NLP, GIS, Government Digital Systems

---

## 2. Purpose of This File

This file is the single master context and execution prompt for any AI coding agent, software engineer, solution architect, or autonomous development model working on SIH26018.

The agent must use this file to understand the problem statement, design the solution, create the project structure, generate technical documentation, implement the web application, build the AI processing pipeline, prepare GIS and government-system integrations, add security and auditability, and keep the repository understandable for future models.

The implementation must remain faithful to the official problem statement. Where official APIs, schemas, datasets, or integration contracts are not supplied, create modular mock adapters and clearly label them as assumptions or placeholders rather than claiming real production integration.

---

# 3. Official Problem Context

Land records are central to:

- land administration,
- property ownership,
- taxation,
- land acquisition,
- dispute resolution,
- infrastructure planning,
- citizen services,
- government decision-making.

A large amount of historical land-record information in India still exists in non-structured forms such as:

- handwritten registers,
- scanned land documents,
- legacy PDF files,
- cadastral maps,
- historical records,
- printed forms,
- handwritten annotations,
- image-based documents.

These records are difficult to digitize reliably because they may contain:

- poor image quality,
- faded text,
- damaged pages,
- handwritten content,
- inconsistent document formats,
- multiple Indian languages,
- regional terminology,
- irregular layouts,
- legacy administrative formats.

Manual digitization is slow, costly, repetitive, and prone to data-entry errors.

The absence of standardized and accurate digital records creates problems in:

- maintaining reliable land databases,
- verifying ownership,
- integrating historical data with modern land-information systems,
- linking records with GIS and cadastral data,
- delivering citizen-centric services,
- decision-making,
- governance,
- auditability.

---

# 4. Core Problem to Solve

Build an **AI-powered Intelligent Land Record Digitization and Validation System** that automatically transforms unstructured and legacy land records into structured, validated, searchable and auditable digital land data.

The system must minimize manual effort while preserving human verification for uncertain or sensitive cases.

The solution must support scanned PDFs, images, handwritten records, maps, cadastral records and other historical land documents.

---

# 5. Required AI Capabilities

The platform must use a combination of:

- Artificial Intelligence,
- Optical Character Recognition,
- Computer Vision,
- Natural Language Processing,
- Machine Learning.

These capabilities should be used for:

1. Printed text recognition.
2. Handwritten text recognition.
3. Multilingual text recognition.
4. Document preprocessing.
5. Layout understanding.
6. Document classification.
7. Structured field extraction.
8. Confidence estimation.
9. Data validation.
10. Duplicate detection.
11. Cross-database verification.
12. Human-assisted correction.
13. Learning from verified corrections over time.

The architecture must keep OCR and AI providers replaceable so a different model can be used later without rewriting the complete application.

---

# 6. Required Input Types

The system should support at minimum:

- scanned PDF documents,
- image files,
- historical land documents,
- handwritten land records,
- cadastral or map-based records where possible.

Recommended supported upload formats for the prototype:

- PDF
- PNG
- JPG
- JPEG
- TIFF where technically practical

The file-processing layer should be modular enough to add more formats later.

---

# 7. Multilingual Requirement

The problem statement explicitly requires multilingual recognition across major Indian languages.

The solution must therefore be designed for:

- English,
- Hindi,
- regional Indian languages,
- mixed-language records,
- documents containing both printed and handwritten text.

Requirements:

- preserve original extracted text,
- detect or record document language where possible,
- avoid destroying regional-language text during normalization,
- support Unicode throughout the application,
- make OCR language packs/providers configurable,
- store normalized values separately when transliteration or standardization is needed.

Do not hard-code the system for English-only documents.

---

# 8. Required Structured Land Record Fields

The official problem statement identifies predefined land-record information including:

- landowner details,
- survey number,
- khasra number,
- khata number,
- plot area,
- village,
- tehsil,
- district,
- land classification,
- ownership details,
- mutation records,
- registration information.

The data model must support these fields.

A recommended normalized extraction schema is:

```json
{
  "document_type": "",
  "language": "",
  "landowner_details": {
    "owner_name": "",
    "related_person_name": "",
    "ownership_type": ""
  },
  "survey_number": "",
  "khasra_number": "",
  "khata_number": "",
  "plot_area": {
    "value": null,
    "unit": ""
  },
  "village": "",
  "tehsil": "",
  "district": "",
  "state": "",
  "land_classification": "",
  "mutation_records": [],
  "registration_information": {
    "registration_number": "",
    "registration_date": ""
  }
}
```

This is an implementation schema derived from the fields explicitly listed in the problem statement and may be extended when the supplied dataset or document types require additional fields.

Field definitions must be configurable rather than hard-coded into one fixed document template.

---

# 9. Core End-to-End Workflow

The target processing workflow should be:

```text
Authorized User
      ↓
Document Upload
      ↓
Secure Document Repository
      ↓
Document Preprocessing
      ↓
OCR / Handwriting Recognition
      ↓
Layout / Document Understanding
      ↓
Document Classification
      ↓
Structured Field Extraction
      ↓
Field Normalization
      ↓
Business Rule Validation
      ↓
Cross-Database Verification
      ↓
Duplicate Detection
      ↓
Confidence Scoring
      ↓
┌─────────────────────────────────┐
│ Is confidence sufficient?       │
└──────────────┬──────────────────┘
               │
       Yes     │      No
               │
               ↓
        Human Verification
               ↓
        Correction / Approval
               ↓
        Verified Digital Record
               ↓
     Structured Land Database
               ↓
 ┌─────────────┼───────────────┐
 ↓             ↓               ↓
LRMS          GIS            Government
/DILRMP       Platforms      Applications
```

Every important stage should expose status, errors and traceability.

---

# 10. Main Application Modules

The complete application should contain the following functional modules.

## 10.1 Authentication and Access Control

Implement secure authentication and Role-Based Access Control.

Suggested prototype roles:

- Administrator
- Document Operator
- Verification Officer
- GIS / Data Officer
- Supervisor

These roles are implementation recommendations to satisfy the PS requirement for role-based secure access.

Permissions should be centrally defined and easy to extend.

---

## 10.2 Document Upload Module

Provide a user-friendly upload interface with:

- drag-and-drop upload,
- file picker,
- PDF/image support,
- upload progress,
- validation,
- metadata entry,
- document preview,
- unique document ID,
- uploader identity,
- upload timestamp,
- optional district/state/document-type metadata,
- batch upload where practical.

Do not accept unsafe or unsupported files without validation.

---

## 10.3 Secure Document Repository

The problem statement explicitly requires a secure document repository with metadata management and audit trails.

The repository must store:

- original file,
- file name,
- file type,
- size,
- document ID,
- upload user,
- upload date/time,
- document status,
- document language,
- document type,
- related land-record ID if available,
- processing results,
- verification status.

Storage must be abstracted so a prototype can use local or S3-compatible storage and production can replace it later.

---

## 10.4 Document Preprocessing Module

Before OCR, support appropriate Computer Vision preprocessing such as:

- orientation detection,
- rotation correction,
- de-skewing,
- noise reduction,
- contrast enhancement,
- thresholding,
- border cleanup,
- page extraction,
- image normalization,
- perspective correction where relevant.

Preprocessing should be a pipeline rather than scattered functions.

---

## 10.5 OCR and Handwriting Recognition

Create a provider abstraction.

Conceptually:

```text
OCRProvider
├── PrintedOCRProvider
├── HandwritingOCRProvider
└── MultilingualOCRProvider
```

One provider may implement multiple capabilities.

Recommended prototype candidates can include open-source or API-based solutions, but the architecture must not depend permanently on one vendor.

OCR output should preserve, where available:

- page,
- extracted text,
- bounding box,
- confidence,
- language,
- block/line structure.

---

## 10.6 Document Classification

The AI should classify uploaded documents or pages into configured land-record categories.

The problem statement requires intelligent classification of extracted information into predefined land-record fields.

The system should therefore maintain configurable:

- document types,
- expected fields per document type,
- extraction schema,
- validation rules.

Example classification response:

```json
{
  "document_type": "Land Record",
  "confidence": 0.94
}
```

---

## 10.7 Structured Field Extraction

Convert OCR/document content into strict structured output.

Do not persist uncontrolled free-form LLM text directly into official record tables.

Recommended field-level structure:

```json
{
  "field_name": "survey_number",
  "value": "123/4",
  "confidence": 0.91,
  "source_page": 2,
  "source_text": "123/4"
}
```

Where available, keep document evidence/bounding boxes so verification officers can see where a value came from.

---

## 10.8 Confidence Scoring

The problem statement explicitly requires confidence scoring and automatic identification of uncertain fields.

Track confidence for:

- OCR output,
- document classification,
- individual extracted fields,
- document-level extraction,
- validation result where appropriate.

Suggested configurable status logic:

```text
High confidence    → can proceed without manual field correction
Medium confidence  → review recommended
Low confidence     → human verification required
```

Do not hard-code arbitrary production thresholds. Keep thresholds configurable.

---

## 10.9 Automated Validation Engine

The problem statement explicitly requires:

- business-rule validation,
- cross-database verification,
- duplicate detection.

Create a separate validation layer.

Possible validation categories:

### Format Rules
- required fields,
- valid dates,
- numeric area,
- allowed area units,
- survey/khasra/khata formats.

### Administrative Consistency
- village belongs to expected tehsil,
- tehsil belongs to expected district,
- district belongs to expected state.

### Cross-Database Validation
- compare selected extracted values with connected or mock government master data,
- verify known location codes,
- compare registration information where an integration is available.

### Duplicate Detection
Potential signals:

- same survey number,
- same khata/khasra combination,
- same registration number,
- same document hash,
- fuzzy landowner + location matching.

All validation findings should be stored and visible to the user.

---

## 10.10 Human-Assisted Verification Workflow

The official PS explicitly requires human-assisted verification for low-confidence records.

Create a verification queue.

A verification screen should display:

```text
┌────────────────────────────┬────────────────────────────┐
│ Original Document          │ AI Extracted Information   │
│                            │                            │
│ PDF/Image Viewer           │ Owner Details              │
│ Zoom / Page Navigation     │ Survey Number              │
│ Highlight Source Evidence  │ Khasra Number              │
│                            │ Khata Number                │
│                            │ Area                        │
│                            │ Village / Tehsil / District │
│                            │ Mutation / Registration     │
└────────────────────────────┴────────────────────────────┘
```

Verifier capabilities:

- inspect original document,
- inspect OCR text,
- see confidence values,
- see validation warnings,
- edit extracted values,
- approve individual fields,
- approve record,
- reject record,
- add comments,
- return a case for correction.

All user changes must be audited.

---

## 10.11 AI Learning from Human Corrections

The PS explicitly requires an AI-driven learning mechanism that improves extraction accuracy over time.

For the prototype:

- store original AI prediction,
- store human-corrected value,
- store document type,
- store language,
- store confidence,
- optionally store source evidence,
- create an evaluation/training dataset from verified corrections.

Do not automatically retrain a model in production without review.

Instead, implement a feedback dataset and evaluation pipeline that can later support:

- prompt improvement,
- OCR tuning,
- fine-tuning,
- model comparison,
- rule refinement.

---

# 11. Government and GIS Integration Requirements

The problem statement requires integration capability with:

- existing Land Records Management Systems (LRMS),
- DILRMP databases,
- GIS platforms,
- cadastral maps,
- other government databases,
- government applications,
- digital governance platforms.

Because actual APIs or schemas are not supplied in this PS, build an **integration-ready adapter layer** and clearly mark demo integrations as mock.

Recommended interface design:

```text
Integration Layer
├── LRMSAdapter
├── DILRMPAdapter
├── GISAdapter
├── CadastralMapAdapter
├── GovernmentDatabaseAdapter
└── MockIntegrationAdapters
```

Never claim real production connectivity unless genuine authorized endpoints and specifications are supplied.

---

# 12. GIS and Cadastral Map Module

The platform should support the PS requirement to integrate with GIS platforms and cadastral maps.

Prototype capabilities may include:

- display land/parcel location on an interactive map,
- state/district/tehsil/village layers where available,
- parcel/cadastral overlays,
- search by administrative area,
- link structured land records to geographic entities,
- show coordinates where source data exists,
- compare record metadata with GIS parcel metadata,
- flag spatial/data inconsistencies.

Recommended open-source stack:

- PostgreSQL + PostGIS,
- GeoJSON,
- Leaflet or MapLibre,
- GeoServer where required.

These are implementation recommendations, not mandated technologies in the PS.

---

# 13. Dashboard Requirements

The PS explicitly asks for interactive dashboards displaying:

- number of documents processed,
- extraction accuracy,
- validation status,
- pending verification cases,
- error statistics,
- state-wise digitization progress,
- district-wise digitization progress.

Build dashboards around these required KPIs.

Additional useful metrics may include:

- documents uploaded today,
- processing success/failure,
- average confidence,
- low-confidence field counts,
- average verification time,
- document-language distribution,
- document-type distribution.

Additional metrics should be clearly treated as enhancements.

---

# 14. Audit Tracking

The problem statement explicitly requires audit tracking and audit trails.

Record important system and user actions.

Recommended audit model:

```text
audit_id
timestamp
user_id
action
entity_type
entity_id
old_value
new_value
reason_or_comment
request_metadata
```

Audit at minimum:

- login-related security events,
- document upload,
- document deletion or archival if permitted,
- OCR execution,
- extraction execution,
- validation execution,
- field correction,
- approval,
- rejection,
- integration/export operation,
- role or permission changes.

Audit entries should not be silently editable by normal users.

---

# 15. Record and Model Traceability

Because AI is involved in government data processing, track:

- original document,
- OCR result,
- AI extraction result,
- model/provider used,
- prompt/schema version,
- confidence,
- validation results,
- human corrections,
- final approved record,
- audit history.

Recommended AI run structure:

```text
model_run_id
document_id
pipeline_stage
provider
model_name
model_version
prompt_version
started_at
completed_at
status
confidence
error_message
```

This is an implementation enhancement supporting auditability.

---

# 16. APIs

The PS explicitly requires APIs for integration with government applications and digital governance platforms.

Build REST APIs for core modules.

Suggested API groups:

```text
/api/v1/auth
/api/v1/users
/api/v1/documents
/api/v1/processing
/api/v1/extractions
/api/v1/validations
/api/v1/verifications
/api/v1/land-records
/api/v1/search
/api/v1/gis
/api/v1/dashboard
/api/v1/audit
/api/v1/integrations
/api/v1/admin
```

Example endpoints:

```text
POST /api/v1/documents/upload
GET  /api/v1/documents
GET  /api/v1/documents/{id}

POST /api/v1/documents/{id}/process

GET  /api/v1/verifications
GET  /api/v1/verifications/{id}
POST /api/v1/verifications/{id}/approve
POST /api/v1/verifications/{id}/reject

GET  /api/v1/land-records
GET  /api/v1/land-records/{id}

GET  /api/v1/dashboard/summary
GET  /api/v1/audit
```

Use versioned APIs.

---

# 17. Search and Record Retrieval

Although not separately listed as a bullet in the expected solution, structured digital records should be practically retrievable.

Implement authorized search/filtering using relevant fields such as:

- document ID,
- survey number,
- khasra number,
- khata number,
- owner name,
- village,
- tehsil,
- district,
- state,
- registration number,
- validation status,
- verification status,
- document type,
- date range.

This supports the PS goal of usable standardized digital records.

---

# 18. Suggested User Roles

The PS only mandates role-based access control. The following role design is recommended for the prototype.

## Administrator
- user management,
- roles/permissions,
- master data,
- configuration,
- validation rules,
- integrations,
- audit access.

## Document Operator
- upload documents,
- view processing,
- review extraction,
- submit verification.

## Verification Officer
- review uncertain cases,
- correct fields,
- approve/reject.

## Supervisor
- dashboards,
- monitoring,
- quality metrics,
- pending-case monitoring.

## GIS/Data Officer
- GIS/cadastral linkage,
- location data review.

Keep RBAC configurable.

---

# 19. Security Requirements

Sensitive land-record information must be protected.

Implement:

- authentication,
- role-based authorization,
- secure password hashing,
- secure API authentication,
- server-side access checks,
- secure file validation,
- file-size limits,
- request validation,
- SQL injection protection through safe ORM/query practices,
- XSS protection,
- CSRF protection where applicable,
- secure HTTP headers,
- secrets through environment variables,
- no committed API keys,
- audit logging,
- least-privilege permissions.

Use HTTPS in deployment.

Do not rely on frontend-only permission hiding.

---

# 20. Recommended Technical Architecture

The PS does not mandate a particular software stack.

A suitable prototype stack is:

## Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- component library if useful

## Backend
- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

## Database
- PostgreSQL
- PostGIS for GIS/spatial data

## AI / Document Processing
- replaceable OCR provider
- Computer Vision preprocessing
- replaceable LLM/document intelligence provider
- rule-based validation engine

## Background Processing
- Redis + Celery or another task queue when processing becomes heavy
- a simpler job abstraction may be used for an SIH prototype

## Storage
- local storage for minimal local demo
- preferably S3-compatible object-storage abstraction such as MinIO for a fuller prototype

## GIS
- Leaflet or MapLibre
- GeoJSON
- PostGIS
- GeoServer if needed

The code must keep these providers modular.

---

# 21. High-Level System Architecture

```text
                         ┌───────────────────────┐
                         │ Authorized Govt User  │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      Web Frontend     │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      Backend API      │
                         └───────────┬───────────┘
                                     │
           ┌─────────────────────────┼──────────────────────────┐
           │                         │                          │
           ▼                         ▼                          ▼
┌────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ Document Service   │   │ Auth / RBAC Service │   │ Audit Service       │
└──────────┬─────────┘   └─────────────────────┘   └─────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Processing Pipeline                     │
│                                                             │
│ Preprocessing → OCR → Classification → Extraction           │
│ → Normalization → Validation → Confidence → Verification    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ PostgreSQL/PostGIS │
                    └─────────┬──────────┘
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                 ▼
          LRMS /           GIS /           Government
          DILRMP           Cadastral        Applications
          Adapters         Adapters         / Databases
```

---

# 22. Processing State Machine

Recommended statuses:

```text
UPLOADED
QUEUED
PREPROCESSING
OCR_PROCESSING
OCR_COMPLETED
EXTRACTION_PROCESSING
EXTRACTION_COMPLETED
VALIDATION_PROCESSING
VERIFICATION_REQUIRED
VERIFIED
APPROVED
REJECTED
PROCESSING_FAILED
INTEGRATION_PENDING
INTEGRATED
```

Keep status history rather than only the latest status.

---

# 23. Database Entities

Design a normalized schema containing at least:

```text
users
roles
permissions
user_roles
role_permissions

documents
document_pages
document_metadata
document_types
document_status_history

ocr_runs
ocr_blocks

ai_model_runs
extraction_results
extracted_fields

validation_rules
validation_results
duplicate_matches

verification_tasks
verification_actions
field_corrections

land_records
landowners
mutation_records
registration_records

states
districts
tehsils
villages

gis_parcels
record_parcel_links

integrations
integration_runs

audit_logs
```

Exact normalization can be adjusted while preserving these concepts.

Use:

- primary keys,
- foreign keys,
- timestamps,
- useful indexes,
- soft-delete/archive strategies where appropriate,
- migration scripts.

---

# 24. Frontend Pages

Create at minimum:

```text
/login
/dashboard

/documents
/documents/upload
/documents/:documentId

/verification
/verification/:taskId

/records
/records/:recordId

/map

/audit

/admin/users
/admin/roles
/admin/document-types
/admin/integrations
/admin/settings
```

---

# 25. Required Document Detail Experience

A document details page should show:

- original file preview,
- metadata,
- current processing status,
- OCR text,
- detected document language,
- document classification,
- structured extracted fields,
- confidence per field,
- validation errors/warnings,
- duplicate-detection result,
- verification history,
- audit history,
- related land record,
- GIS/cadastral linkage,
- integration status.

---

# 26. Human Verification UX

Prioritize this module because it directly addresses the PS requirement to minimize manual intervention while retaining human assistance where required.

Useful features:

- source document on left,
- extracted fields on right,
- confidence indicator,
- uncertain fields surfaced first,
- keyboard-friendly editing,
- validation warnings,
- approve/reject actions,
- verifier comments,
- previous correction history.

Optional innovation:
- clicking an extracted field highlights its source region in the document.

---

# 27. Duplicate Detection Design

Implement duplicate detection using multiple signals rather than one exact equality check.

Potential signals:

- binary/document hash,
- perceptual page hash,
- survey number,
- khasra number,
- khata number,
- registration number,
- village/tehsil/district,
- owner name similarity,
- plot area similarity.

Return:

```json
{
  "possible_duplicate": true,
  "score": 0.87,
  "matched_record_ids": ["..."],
  "reasons": [
    "same survey number",
    "high owner-name similarity"
  ]
}
```

A human should be able to resolve uncertain duplicate cases.

---

# 28. Data Validation Design

Represent each validation result with:

```text
rule_id
field_name
status
severity
message
source
expected_value
actual_value
```

Suggested statuses:

```text
PASS
WARNING
FAIL
NOT_CHECKED
```

Suggested severity:

```text
INFO
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 29. AI Provider Abstraction

Create interfaces similar to:

```python
class OCRProvider:
    def extract(self, document):
        ...

class DocumentAIProvider:
    def classify(self, ocr_output, document):
        ...

    def extract_fields(self, ocr_output, schema):
        ...

class ValidationProvider:
    def validate(self, extracted_record):
        ...
```

Do not tightly bind business services to a vendor SDK.

---

# 30. Prompt Management

Keep AI prompts separately from business code.

Suggested structure:

```text
ai/
├── prompts/
│   ├── document_classifier.md
│   ├── land_record_extractor.md
│   ├── field_normalizer.md
│   └── validation_assistant.md
├── schemas/
└── evaluation/
```

Every prompt should specify strict output format.

For high-impact extraction, validate model output using a schema before using it.

---

# 31. AI Learning / Evaluation Dataset

Create a structured feedback format such as:

```json
{
  "document_id": "",
  "document_type": "",
  "language": "",
  "field": "",
  "ai_value": "",
  "verified_value": "",
  "ai_confidence": 0.0,
  "was_corrected": true
}
```

Use verified data to calculate:

- per-field accuracy,
- document-type accuracy,
- language-wise accuracy,
- OCR quality,
- correction frequency.

This supports the PS requirement that the system improve extraction accuracy over time.

---

# 32. Accuracy Metrics

Dashboard and evaluation code should distinguish between:

- OCR confidence,
- extraction confidence,
- field accuracy against verified ground truth,
- document-level validation success.

Do not label raw LLM confidence as proven extraction accuracy.

For demo/evaluation, calculate actual accuracy only when verified/reference truth exists.

---

# 33. Error Handling

Handle:

- unsupported file,
- corrupt document,
- OCR failure,
- AI provider timeout,
- malformed AI output,
- validation service failure,
- external database unavailable,
- duplicate-check failure,
- GIS service unavailable,
- storage failure,
- database failure.

Display user-safe messages.

Keep detailed errors in server logs.

Allow failed pipeline stages to be retried without forcing a new upload.

---

# 34. Mock Integration Strategy

Official API details are not present in the supplied PS.

Therefore create clearly named prototype adapters such as:

```text
MockLRMSAdapter
MockDILRMPAdapter
MockGovernmentDatabaseAdapter
MockCadastralAdapter
```

Each should implement the same interface expected for a real adapter.

Include sample fixtures and realistic request/response payloads.

Documentation must clearly say:

> This prototype demonstrates integration readiness. Actual production integration requires authorized official APIs, schemas, credentials and network access from the respective government systems.

---

# 35. Suggested Innovation Features

The following are optional enhancements consistent with the PS and should only be implemented after the core workflow works.

## 35.1 Confidence Heatmap
Highlight low-confidence text/regions.

## 35.2 Source Evidence Linking
Click extracted field → highlight original source region.

## 35.3 Smart Verification Queue
Prioritize records by risk, confidence and failed validation count.

## 35.4 Cross-Source Consistency Check
Compare document data with:

- master administrative data,
- LRMS mock/real adapter,
- GIS/cadastral information,
- previous records.

## 35.5 Explainable Validation
Show why a record was flagged.

Example:

```text
Survey number requires review because OCR confidence is low
and no matching parcel was returned from the current GIS dataset.
```

## 35.6 Historical Record Linking
Suggest possible links between older and newer records of the same parcel.

## 35.7 Active-Learning Dataset
Rank corrected examples that would be most useful for future model improvement.

Core functionality must come before innovations.

---

# 36. Development Repository Structure

Create or evolve toward:

```text
SIH26018/
│
├── MASTER_PROJECT_PROMPT.md
├── AGENTS.md
├── README.md
├── .env.example
├── .gitignore
│
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── TECHNICAL_SPEC.md
│   ├── AI_PIPELINE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPEC.md
│   ├── SECURITY.md
│   ├── INTEGRATIONS.md
│   ├── DEPLOYMENT.md
│   ├── DEMO_GUIDE.md
│   └── CURRENT_STATE.md
│
├── frontend/
│
├── backend/
│
├── ai/
│   ├── prompts/
│   ├── schemas/
│   └── evaluation/
│
├── sample_data/
│
├── scripts/
│
├── tests/
│
└── docker/
```

Do not create empty folders merely for appearance. Each folder should gain meaningful content when its phase is implemented.

---

# 37. Required Context Files for Future AI Models

## AGENTS.md

This must remain short.

It should instruct future AI agents to read in this order:

1. `MASTER_PROJECT_PROMPT.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/TECHNICAL_SPEC.md`
4. `docs/CURRENT_STATE.md`

Rules for future agents:

- inspect existing code before editing,
- preserve current architecture,
- do not break public API contracts unnecessarily,
- use database migrations,
- update docs when architecture changes,
- update CURRENT_STATE.md after substantial work,
- keep AI providers replaceable,
- keep OCR providers replaceable,
- keep integration adapters modular,
- never commit secrets,
- never fabricate official government API behavior,
- preserve auditability,
- validate model output before persistence.

---

# 38. PROJECT_CONTEXT.md Requirements

Include:

- Problem Statement ID and title,
- Ministry of Rural Development,
- official background,
- problems,
- expected solution,
- target workflow,
- user types,
- required modules,
- required integrations,
- required dashboard metrics,
- security/RBAC requirement,
- assumptions made by the development team,
- prototype limitations.

This should be concise enough for a new AI model to understand the project quickly.

---

# 39. REQUIREMENTS.md

Split requirements into:

## Functional Requirements
- document upload,
- multilingual OCR,
- handwriting recognition,
- structured field extraction,
- classification,
- validation,
- duplicate detection,
- confidence scoring,
- human verification,
- learning feedback,
- repository,
- metadata,
- audit,
- dashboard,
- APIs,
- integrations,
- RBAC.

## Non-Functional Requirements
- security,
- maintainability,
- modularity,
- usability,
- performance,
- reliability,
- traceability,
- scalability where practical,
- multilingual support,
- accessibility.

## Assumptions
Clearly identify assumptions not stated by the PS.

---

# 40. TECHNICAL_SPEC.md

Describe:

- selected technology stack,
- services/modules,
- frontend organization,
- backend organization,
- background job processing,
- object storage,
- OCR provider abstraction,
- AI provider abstraction,
- validation engine,
- GIS layer,
- integration layer,
- authorization,
- logging,
- testing strategy.

---

# 41. CURRENT_STATE.md

Update this after meaningful implementation work.

Use this format:

```markdown
# Current State

Last Updated: YYYY-MM-DD

## Completed
- ...

## Working
- ...

## Pending
- ...

## Known Issues
- ...

## Important Decisions
- ...

## Mocked / Not Yet Integrated
- ...

## Next Recommended Tasks
1. ...
2. ...
```

This file is essential when switching between AI models.

---

# 42. README.md

The final README should explain:

- project overview,
- PS 26018,
- feature summary,
- screenshots/demo when available,
- architecture overview,
- tech stack,
- prerequisites,
- installation,
- environment variables,
- database migration,
- frontend startup,
- backend startup,
- AI/OCR setup,
- sample users,
- sample data,
- tests,
- demo workflow,
- known limitations.

---

# 43. Environment Variables

Create `.env.example`.

Possible configuration categories:

```text
APP_ENV=
APP_SECRET=

DATABASE_URL=

JWT_SECRET=
JWT_EXPIRY=

STORAGE_PROVIDER=
STORAGE_PATH=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

OCR_PROVIDER=
OCR_API_KEY=

AI_PROVIDER=
AI_MODEL=
AI_API_KEY=

GIS_PROVIDER=

REDIS_URL=
```

Do not place real secrets in `.env.example`.

---

# 44. Implementation Order

Build in the following order.

## Phase 1 — Analyze and Document
Create/update:

- MASTER_PROJECT_PROMPT.md
- AGENTS.md
- PROJECT_CONTEXT.md
- REQUIREMENTS.md
- ARCHITECTURE.md
- TECHNICAL_SPEC.md
- DATABASE_SCHEMA.md
- API_SPEC.md
- CURRENT_STATE.md

## Phase 2 — Core Project Foundation
Implement:

- frontend application,
- backend API,
- database connection,
- migrations,
- authentication,
- RBAC,
- common error handling,
- logging.

## Phase 3 — Document Management
Implement:

- upload,
- validation,
- storage,
- metadata,
- preview,
- status.

## Phase 4 — AI Processing
Implement:

- preprocessing,
- OCR,
- handwriting/multilingual support abstraction,
- classification,
- extraction,
- normalization,
- confidence scoring.

## Phase 5 — Validation
Implement:

- business rules,
- master-data checks,
- duplicate detection,
- cross-database adapter interfaces.

## Phase 6 — Verification
Implement:

- verification queue,
- split-view UI,
- editing,
- approve/reject,
- corrections,
- audit trail.

## Phase 7 — Structured Records
Implement:

- final verified records,
- searchable record list,
- record details,
- related mutation/registration data.

## Phase 8 — GIS
Implement:

- map screen,
- sample cadastral/parcel layer,
- record-to-parcel linkage,
- GIS adapter.

## Phase 9 — Government Integration
Implement:

- LRMS adapter,
- DILRMP adapter,
- generic government database adapter,
- mock connectors,
- API export.

## Phase 10 — Dashboard
Implement required PS metrics:

- documents processed,
- extraction accuracy,
- validation status,
- pending verification,
- error statistics,
- state-wise progress,
- district-wise progress.

## Phase 11 — AI Feedback / Evaluation
Implement:

- verified corrections dataset,
- field accuracy evaluation,
- language/document-type metrics,
- model comparison hooks.

## Phase 12 — Test and Demo
Implement:

- automated tests,
- sample/mock data,
- demo workflow,
- deployment documentation.

---

# 45. MVP Priority

If SIH development time is limited, prioritize:

1. Authentication + RBAC
2. Document upload
3. Secure storage
4. OCR
5. Structured AI extraction
6. Confidence scoring
7. Validation rules
8. Human verification
9. Audit trail
10. Verified-record storage
11. Search
12. Dashboard
13. GIS demo
14. Mock government-system integration
15. AI feedback dataset

Do not spend early development time on visual polish while the primary workflow is nonfunctional.

---

# 46. Demo Scenario

The prototype should support a coherent demonstration:

```text
Government user logs in
        ↓
Uploads a scanned / historical land record
        ↓
System securely stores it
        ↓
Document preprocessing improves readability
        ↓
OCR recognizes printed/handwritten multilingual text
        ↓
AI classifies the document
        ↓
AI extracts structured land-record fields
        ↓
Confidence scores are calculated
        ↓
Validation rules check the extracted data
        ↓
Duplicate/cross-database checks run
        ↓
Low-confidence or failed fields are flagged
        ↓
Verification officer reviews source and extracted values
        ↓
Officer corrects and approves
        ↓
Final verified record is stored
        ↓
Audit trail records the actions
        ↓
Record becomes visible in search/dashboard
        ↓
GIS/cadastral data can be linked
        ↓
Integration API can expose/export verified data
```

---

# 47. Definition of Done for the SIH Prototype

The core prototype is complete when an authorized user can:

1. Log in securely.
2. Upload a scanned land-record file.
3. View the stored source document.
4. Start or automatically trigger processing.
5. Obtain OCR results.
6. Obtain structured extracted fields.
7. See confidence scores.
8. See validation results.
9. See possible duplicates when detected.
10. Review uncertain records manually.
11. Correct AI output.
12. Approve or reject a record.
13. Store a final verified record.
14. Search the verified record.
15. View audit history.
16. View required dashboard statistics.
17. Demonstrate GIS/cadastral integration.
18. Demonstrate government integration readiness through APIs/adapters.
19. Capture verified corrections for future AI improvement.

---

# 48. Implementation Rules for AI Coding Agents

When given this repository:

1. Read this file fully.
2. Read `AGENTS.md`.
3. Read `docs/PROJECT_CONTEXT.md`.
4. Read `docs/TECHNICAL_SPEC.md`.
5. Read `docs/CURRENT_STATE.md`.
6. Inspect existing files before generating replacements.
7. Reuse existing working code where appropriate.
8. Do not create conflicting architectures.
9. Do not hard-code one OCR/AI provider through the whole system.
10. Do not silently trust AI extraction.
11. Validate structured outputs before database persistence.
12. Preserve original documents and processing evidence.
13. Audit human corrections and approvals.
14. Use migrations for database changes.
15. Never commit secrets.
16. Mark mock integrations clearly.
17. Do not claim direct LRMS/DILRMP production integration without official credentials/API specs.
18. Add tests for critical workflows.
19. Update documentation alongside implementation.
20. Update `CURRENT_STATE.md` after substantial changes.

---

# 49. Strict Development Principle

The system must not behave as though AI extraction is automatically authoritative.

The intended model is:

```text
Computer Vision
      +
Multilingual OCR / Handwriting Recognition
      +
NLP / Document AI
      +
Structured Extraction
      +
Business Rules
      +
Cross-Database Checks
      +
Duplicate Detection
      +
Confidence Scoring
      +
Human Verification
      +
Audit Trail
      +
GIS / Government Integration
```

The final output should be **accurate, traceable, secure, verifiable and integration-ready digital land-record data**.

---

# 50. First Instruction to an Autonomous Coding Model

When this file is handed to a coding agent, use the following execution instruction:

> You are responsible for building the SIH26018 Intelligent Land Record Digitization and Validation System described in MASTER_PROJECT_PROMPT.md. First inspect the complete repository and existing implementation. Then create or update the project context and technical documentation, determine the smallest complete MVP architecture, and implement the system phase-by-phase. Do not invent unavailable government APIs; use clearly labeled adapter interfaces and mocks. Preserve modular OCR/AI providers, structured extraction, confidence scoring, validation, human verification, audit trails, secure RBAC, dashboards, GIS integration readiness and APIs. Keep CURRENT_STATE.md updated so another AI model can continue the project without needing the entire chat history.

---

# 51. Source-of-Truth Rule

For this repository:

1. The official SIH problem statement is the source of truth for required capabilities.
2. This master prompt translates those capabilities into implementable software modules.
3. `docs/CURRENT_STATE.md` is the source of truth for what has actually been implemented.
4. Actual code and migrations are the source of truth for technical behavior.
5. Do not describe mock or planned features as completed.
