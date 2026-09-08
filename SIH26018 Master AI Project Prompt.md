# SIH26018 — MASTER AI PROJECT PROMPT

## 1. ROLE

You are the **Lead Solution Architect, Full-Stack Engineer, AI/ML Engineer, Database Engineer, GIS Integration Engineer, UI/UX Engineer, DevOps Engineer, and Technical Documentation Engineer** for this project.

Your responsibility is to understand the complete problem statement first and then design and build a **production-oriented prototype** for SIH26018.

Do not start coding blindly.

First understand:

- the problem statement,
- government workflow,
- users,
- document types,
- required AI processing,
- verification workflow,
- GIS requirements,
- integration requirements,
- security,
- auditability,
- database structure,
- APIs,
- frontend workflow.

Then create the required files and implement the solution systematically.

---

# 2. PROJECT IDENTIFICATION

**Project / Problem Statement ID:** SIH26018

**Domain:** Land Records / Document Digitization / Artificial Intelligence / GIS / Government Technology

**Type of Solution:** AI-powered web-based document processing and land-record digitization platform.

---

# 3. PROBLEM STATEMENT

Government land-record departments handle a large number of historical and current land-related documents.

These documents may exist in:

- scanned PDF files,
- images,
- old printed documents,
- handwritten documents,
- regional-language documents,
- partially damaged documents,
- low-quality scans,
- heterogeneous government formats.

Important land information is often locked inside these documents.

Manual processing causes problems such as:

- slow digitization,
- repetitive data entry,
- human errors,
- inconsistent records,
- difficulty searching historical records,
- difficulty connecting documents with GIS/location data,
- lack of confidence measurement,
- limited traceability,
- difficulty integrating old records with modern government systems.

The required solution should provide a **user-friendly web application for uploading land-record documents and automatically processing them using AI**.

The system should support:

1. Document upload
2. Automated OCR
3. Document classification
4. Field extraction
5. Data normalization
6. AI confidence scoring
7. Automatic validation
8. Manual verification when required
9. Audit tracking
10. Searchable digital records
11. GIS/map integration
12. Integration with government systems
13. Export/API capabilities
14. Secure role-based access

The platform should support integration with:

- Land Records Management Systems — LRMS
- Digital India Land Records Modernization Programme — DILRMP
- GIS platforms
- Government databases
- Existing departmental applications

---

# 4. MAIN PROJECT OBJECTIVE

Build an intelligent platform that converts unstructured land-record documents into **structured, validated, searchable, auditable and GIS-linked digital records**.

The major flow should conceptually be:

```text
Document
   ↓
Upload
   ↓
Pre-processing
   ↓
OCR
   ↓
Document Classification
   ↓
AI Field Extraction
   ↓
Data Normalization
   ↓
Rule Validation
   ↓
Confidence Score
   ↓
 ┌──────────────────────┐
 │ Confidence Sufficient│
 └──────────┬───────────┘
            │
       Yes  │  No
            │
            ↓
      Manual Verification
            ↓
      Approved Record
            ↓
      Structured Database
            ↓
 ┌──────────┼──────────────┐
 ↓          ↓              ↓
GIS       LRMS          Government
Map       /DILRMP       Database/API
```

---

# 5. TARGET USERS

The primary users are expected to be **government officials and authorized land-record personnel**, not unrestricted public users.

Possible users include:

- Land record officers
- Revenue department officials
- Tehsil / Taluka officials
- District administration officials
- Survey officers
- Data entry operators
- Document verification officers
- GIS officers
- System administrators
- Department supervisors

A limited public-facing search/status module may be designed if required, but sensitive government information must not be publicly exposed by default.

---

# 6. CORE USER ROLES

Implement Role-Based Access Control — RBAC.

Minimum roles:

## Administrator

Can:

- manage users,
- manage departments,
- manage system configuration,
- configure document types,
- configure validation rules,
- view audit logs,
- manage integrations,
- access analytics.

## Document Operator

Can:

- upload documents,
- view processing status,
- correct OCR/extracted fields,
- submit records for verification.

## Verification Officer

Can:

- view low-confidence records,
- compare original document and extracted information,
- edit extracted values,
- approve records,
- reject records,
- return documents for correction.

## GIS Officer

Can:

- review location information,
- connect records with geographical boundaries,
- validate coordinates,
- review parcel locations.

## Supervisor

Can:

- review dashboards,
- monitor processing statistics,
- inspect approval/rejection rates,
- view performance reports.

---

# 7. DOCUMENT TYPES

The architecture must support configurable document types.

Examples may include:

- Land ownership records
- Record of Rights — RoR
- Khata / Khatauni
- Jamabandi
- Mutation records
- Survey records
- Property registration documents
- Sale deeds
- Village land records
- Parcel records
- Cadastral records
- Tax-related land records
- Historical land documents
- Government land certificates

Do not hard-code the entire application around only one document type.

Create configurable document schemas.

---

# 8. DOCUMENT UPLOAD MODULE

Create a document upload interface.

Support:

- PDF
- JPEG
- JPG
- PNG
- TIFF where practical

Features:

- Drag-and-drop upload
- Multiple file upload
- Document preview
- File validation
- File size validation
- Upload progress
- Document metadata
- User-defined document type where required
- Automatic document-type detection
- Batch upload
- Unique document ID generation
- Upload timestamp
- Uploader information
- Department/district information

---

# 9. DOCUMENT PRE-PROCESSING

Before OCR, provide a preprocessing layer.

Potential preprocessing tasks:

- Image rotation correction
- De-skewing
- Noise removal
- Contrast enhancement
- Binarization
- Border removal
- Perspective correction
- Resolution enhancement
- Page splitting
- Orientation detection

Keep preprocessing modular.

---

# 10. OCR MODULE

Create an OCR abstraction layer so OCR engines can be switched.

Possible technologies may include:

- PaddleOCR
- Tesseract
- EasyOCR
- Cloud OCR services
- Vision-language models

Do not tightly couple the application to one OCR engine.

Create something conceptually similar to:

```text
OCRProvider
│
├── PaddleOCRProvider
├── TesseractProvider
└── FutureCloudOCRProvider
```

OCR output should include where available:

- extracted text,
- page number,
- bounding box,
- confidence,
- language,
- line/block structure.

---

# 11. MULTILINGUAL SUPPORT

Indian land documents may contain:

- English,
- Hindi,
- state/regional languages,
- mixed-language content.

The system architecture should support multilingual OCR and multilingual field mapping.

Where possible:

- detect document language,
- preserve original text,
- store normalized/transliterated values separately,
- avoid destroying original-language data.

---

# 12. DOCUMENT CLASSIFICATION

After OCR or through image-based AI, classify the document.

Example output:

```json
{
  "document_type": "Record of Rights",
  "confidence": 0.94
}
```

Classification should identify the appropriate extraction schema.

---

# 13. AI FIELD EXTRACTION MODULE

Use an LLM, multimodal model, document AI model, or hybrid extraction pipeline.

The AI should convert document content into structured JSON.

Possible standard fields:

```json
{
  "document_type": "",
  "state": "",
  "district": "",
  "tehsil": "",
  "village": "",
  "owner_name": "",
  "father_or_spouse_name": "",
  "survey_number": "",
  "plot_number": "",
  "khata_number": "",
  "khasra_number": "",
  "area": {
    "value": null,
    "unit": ""
  },
  "land_type": "",
  "ownership_type": "",
  "registration_number": "",
  "registration_date": "",
  "mutation_number": "",
  "coordinates": {
    "latitude": null,
    "longitude": null
  }
}
```

Exact fields must be configurable according to document type.

---

# 14. STRUCTURED AI OUTPUT

Never depend on free-form AI responses for database insertion.

Use strict structured outputs.

Example:

```json
{
  "document_id": "DOC-000001",
  "document_type": "Jamabandi",
  "language": "Hindi",
  "fields": {
    "owner_name": {
      "value": "Example Name",
      "confidence": 0.97,
      "source_page": 1
    },
    "survey_number": {
      "value": "123/4",
      "confidence": 0.93,
      "source_page": 1
    }
  },
  "overall_confidence": 0.95
}
```

Store confidence per field wherever possible.

---

# 15. CONFIDENCE SCORING

Create confidence scoring for:

- OCR
- document classification
- individual extracted fields
- complete document

Example logic:

```text
OCR confidence
+
Extraction confidence
+
Validation success
+
Cross-database verification
=
Final confidence score
```

Suggested status categories:

```text
90–100% → Auto-validatable
70–89%  → Recommended manual review
Below 70% → Mandatory verification
```

Thresholds must be configurable.

---

# 16. VALIDATION ENGINE

Create a rule-based validation engine.

Possible validations:

- Required field validation
- Date-format validation
- Area validation
- Survey-number pattern validation
- District-village consistency
- Duplicate document detection
- Owner name similarity
- Parcel consistency
- Coordinate validation
- Registration number validation
- Government master-data lookup

Example rule:

```text
IF district = Jaipur
AND village does not belong to Jaipur district master data
THEN mark field as inconsistent.
```

Keep validation rules configurable.

---

# 17. MANUAL VERIFICATION MODULE

This is a critical module.

Create a verification screen with a split layout:

```text
┌─────────────────────────┬─────────────────────────┐
│ Original Document       │ Extracted Information   │
│                         │                         │
│ PDF / Image Viewer      │ Owner Name              │
│                         │ Survey Number            │
│ Highlight selected area │ Village                  │
│                         │ Area                     │
│                         │ ...                      │
└─────────────────────────┴─────────────────────────┘
```

Verifier should be able to:

- inspect source document,
- zoom document,
- edit extracted fields,
- view confidence,
- view validation warnings,
- approve,
- reject,
- request correction,
- add notes.

All changes must be audit logged.

---

# 18. HUMAN-IN-THE-LOOP AI

The platform must not blindly trust AI.

Use:

```text
AI Extraction
     ↓
Confidence + Validation
     ↓
Human Verification if required
     ↓
Verified Ground Truth
```

Corrected records may be stored as labelled training/evaluation data for future improvement.

---

# 19. GIS INTEGRATION

Design a GIS module.

Potential functionality:

- Show land parcels on map
- Display district boundaries
- Display tehsil boundaries
- Display village boundaries
- Search by location
- Search by survey number
- Link documents with map parcels
- Display coordinates
- Display parcel metadata
- Overlay cadastral maps
- Compare record information with GIS geometry

Possible technologies:

- Leaflet
- OpenLayers
- MapLibre
- GeoServer
- PostGIS

Prefer open-source technologies where practical for SIH prototype.

---

# 20. LRMS INTEGRATION

LRMS means Land Records Management System.

The new platform should not necessarily replace LRMS.

Instead, design it so validated structured records can be exchanged with existing LRMS systems.

Possible integration:

```text
SIH AI Platform
      ↕
Integration/API Layer
      ↕
Existing LRMS
```

Provide:

- REST API
- authentication
- JSON/XML adapters if required
- import/export support
- configurable field mapping

---

# 21. DILRMP INTEGRATION

DILRMP refers to the Digital India Land Records Modernization Programme.

The proposed system should complement land-record modernization by assisting with:

- digitization,
- structured extraction,
- standardization,
- searchable records,
- GIS linkage,
- interoperability,
- record quality improvement.

Do not claim direct production integration unless APIs are officially available.

Instead, create an **integration-ready architecture**.

---

# 22. GOVERNMENT DATABASE INTEGRATION

Create an adapter architecture.

Concept:

```text
IntegrationService

├── LRMSAdapter
├── GISAdapter
├── VillageMasterAdapter
├── DistrictMasterAdapter
├── RegistrationDatabaseAdapter
└── FutureGovernmentAdapter
```

Use mock adapters in prototype where official APIs are unavailable.

---

# 23. SEARCH MODULE

Allow authorized users to search records using:

- document ID,
- owner name,
- survey number,
- khasra number,
- khata number,
- registration number,
- village,
- tehsil,
- district,
- document type,
- processing status,
- date range.

Support filtering and pagination.

---

# 24. DOCUMENT STATUS WORKFLOW

Suggested workflow:

```text
UPLOADED

PROCESSING

OCR_COMPLETED

AI_EXTRACTION_COMPLETED

VALIDATION_PENDING

VERIFICATION_REQUIRED

VERIFIED

APPROVED

REJECTED

INTEGRATED
```

Create status history.

---

# 25. AUDIT TRAIL

Government applications require traceability.

Every important action should be logged.

Store:

```text
audit_id
user_id
action
entity
entity_id
old_value
new_value
timestamp
IP/device metadata where appropriate
reason/comment
```

Example actions:

- document uploaded,
- OCR executed,
- AI extraction executed,
- field edited,
- record approved,
- record rejected,
- API export performed.

---

# 26. VERSION HISTORY

Do not overwrite verified government data silently.

Maintain record versions.

Example:

```text
Record Version 1
AI extracted

Record Version 2
Operator corrected

Record Version 3
Verifier approved
```

---

# 27. DASHBOARD

Create an administrative dashboard showing useful metrics.

Examples:

- Total uploaded documents
- Documents processed
- Verification pending
- Approved records
- Rejected records
- Average AI confidence
- OCR accuracy indicators
- Documents by district
- Documents by type
- Processing time
- Manual intervention percentage
- Extraction errors by field

---

# 28. SECURITY REQUIREMENTS

Apply standard government-system security principles.

Minimum:

- Authentication
- Role-Based Access Control
- Password hashing
- Secure session/JWT handling
- Input validation
- File validation
- Rate limiting where applicable
- SQL injection prevention
- XSS prevention
- CSRF protection where applicable
- Secure HTTP headers
- Secrets through environment variables
- No secrets committed to source control
- Audit logs
- Access logging
- API authentication
- Principle of least privilege

---

# 29. DATA PRIVACY

Land records may contain personally identifiable information.

Therefore:

- restrict access based on role,
- avoid exposing sensitive data publicly,
- store only required data,
- secure file storage,
- protect API endpoints,
- keep logs appropriately,
- mask sensitive fields where needed.

---

# 30. RECOMMENDED TECH STACK

The exact stack may be adjusted based on implementation constraints.

Recommended baseline:

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
```

Optional:

```text
shadcn/ui
React Query
Zod
```

## Backend

```text
Python
FastAPI
Pydantic
SQLAlchemy
Alembic
```

## Database

```text
PostgreSQL
PostGIS
```

## Queue / Background Processing

Possible:

```text
Celery
Redis
```

For simple prototype, asynchronous background tasks may be used.

## AI

Architecture must allow switching between providers.

Potential components:

```text
OCR engine
+
LLM / Vision Model
+
Rule Validation Engine
```

## GIS

```text
Leaflet / MapLibre
PostGIS
GeoJSON
```

## Object Storage

Possible:

```text
Local storage for demo
MinIO for scalable prototype
S3-compatible storage abstraction
```

---

# 31. HIGH-LEVEL ARCHITECTURE

Use an architecture concept similar to:

```text
                         ┌───────────────────────┐
                         │     Government User   │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      React Web App    │
                         └───────────┬───────────┘
                                     │ REST API
                                     ▼
                         ┌───────────────────────┐
                         │    FastAPI Backend    │
                         └───────────┬───────────┘
                                     │
            ┌────────────────────────┼───────────────────────┐
            │                        │                       │
            ▼                        ▼                       ▼
   ┌─────────────────┐     ┌─────────────────┐      ┌────────────────┐
   │ Document Service│     │   Auth Service  │      │ Audit Service  │
   └────────┬────────┘     └─────────────────┘      └────────────────┘
            │
            ▼
   ┌───────────────────────────┐
   │ AI Processing Pipeline    │
   │                           │
   │ Preprocess                │
   │ ↓                         │
   │ OCR                       │
   │ ↓                         │
   │ Classification            │
   │ ↓                         │
   │ AI Extraction             │
   │ ↓                         │
   │ Validation                │
   │ ↓                         │
   │ Confidence                │
   └────────────┬──────────────┘
                │
                ▼
         ┌───────────────┐
         │ PostgreSQL +  │
         │ PostGIS       │
         └───────┬───────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼

      GIS       LRMS      Government
                          Databases
```

---

# 32. DATABASE DESIGN

Create a normalized relational schema.

Minimum entities:

```text
users
roles
permissions
departments

documents
document_pages
document_types
document_status_history

ocr_results
extraction_results
extracted_fields

validation_rules
validation_results

verification_tasks
verification_changes

land_records
land_parcels

locations
states
districts
tehsils
villages

integrations
integration_logs

audit_logs

model_runs
model_versions
```

Use foreign keys and indexing appropriately.

---

# 33. MODEL RUN TRACKING

Store information about every AI execution.

Example:

```text
model_run_id
document_id
provider
model_name
model_version
prompt_version
input_hash
started_at
completed_at
status
token_usage
processing_time
confidence
error
```

This makes AI decisions traceable.

---

# 34. PROMPT VERSIONING

AI prompts should not be embedded randomly throughout the source code.

Create:

```text
ai/prompts/
```

Examples:

```text
document_classifier.md
land_record_extractor.md
field_validator.md
normalizer.md
```

Version important prompts.

---

# 35. AI PROVIDER ABSTRACTION

Create an interface such as:

```python
class AIProvider:
    def classify_document(...):
        ...

    def extract_fields(...):
        ...

    def validate_fields(...):
        ...
```

Different AI providers should be replaceable without rewriting the whole system.

---

# 36. API STRUCTURE

Design REST APIs logically.

Example routes:

```text
/auth
/users
/documents
/document-types
/processing
/verification
/records
/search
/gis
/integrations
/audit
/dashboard
/admin
```

Possible endpoints:

```text
POST   /documents/upload
GET    /documents
GET    /documents/{id}

POST   /documents/{id}/process

GET    /verification/tasks
GET    /verification/{id}
POST   /verification/{id}/approve
POST   /verification/{id}/reject

GET    /records
GET    /records/{id}

GET    /gis/parcels
GET    /dashboard/summary
```

---

# 37. FRONTEND PAGES

At minimum design:

```text
/login

/dashboard

/documents
/documents/upload
/documents/:id

/verification
/verification/:id

/records
/records/:id

/map

/audit

/settings
/users
/integrations
```

---

# 38. UI DESIGN PRINCIPLES

The UI should be:

- simple,
- professional,
- government-friendly,
- accessible,
- responsive,
- low-clutter,
- easy for non-technical users.

Prioritize workflow clarity over decorative design.

---

# 39. DOCUMENT DETAIL PAGE

Show:

- original document,
- processing status,
- OCR result,
- extracted values,
- confidence,
- validation errors,
- verification history,
- audit history,
- GIS linkage,
- integration status.

---

# 40. ERROR HANDLING

Provide meaningful error handling for:

- invalid file,
- OCR failure,
- AI provider failure,
- malformed AI output,
- unavailable external API,
- validation failure,
- database failure,
- file-storage failure.

Do not expose internal stack traces to normal users.

---

# 41. RETRY STRATEGY

Processing stages should be restartable independently.

Example:

```text
Document uploaded
      ↓
OCR failed

Retry OCR

instead of

Upload entire document again
```

---

# 42. PROCESSING PIPELINE DESIGN

Use a pipeline concept:

```text
Upload
↓
Preprocess
↓
OCR
↓
Language Detection
↓
Classification
↓
Schema Selection
↓
Extraction
↓
Normalization
↓
Validation
↓
Confidence Evaluation
↓
Manual Verification if necessary
↓
Final Record
↓
Integration
```

Each stage should record its status.

---

# 43. INNOVATIVE FEATURES TO CONSIDER

Implement core functionality first.

Possible innovation modules:

## AI Confidence Heatmap

Highlight document sections based on extraction confidence.

```text
High confidence → safe
Medium confidence → review suggested
Low confidence → mandatory attention
```

## Source Evidence Linking

Clicking an extracted field should highlight where it was found on the original document.

## Intelligent Error Detection

Detect suspicious inconsistencies such as:

```text
Document area: 2.4 hectares
GIS parcel area: 4.8 hectares
```

Flag discrepancy.

## Duplicate Record Detection

Use fuzzy matching and metadata comparisons.

## Human Correction Learning Dataset

Store corrections as labelled examples.

## AI-Assisted Verification

Instead of only saying:

```text
Confidence: 62%
```

explain:

```text
Review required because survey number is partially unreadable and does not match expected village pattern.
```

## Historical Document Linking

Find possible relationships between old and newer versions of a land parcel record.

## GIS Record Consistency Checking

Compare:

```text
document attributes
vs
structured LRMS data
vs
GIS parcel attributes
```

## Document Search Assistant

Allow natural-language search such as:

```text
Show verified mutation records from Jaipur district uploaded this month.
```

Natural-language search must still respect authorization.

---

# 44. DEMO REQUIREMENTS

The SIH prototype should be demonstrable even when official government APIs are unavailable.

Create mock/sample:

- districts,
- villages,
- users,
- land records,
- documents,
- GIS parcels,
- government API responses.

Clearly mark mocked integrations in documentation.

---

# 45. SAMPLE DATASET SUPPORT

Create:

```text
sample_data/
```

Include example metadata and optional placeholder documents.

Never commit confidential real-world government data unless explicitly authorized.

---

# 46. TESTING

Create tests for critical functions.

Minimum:

## Backend

- authentication
- permissions
- document upload
- extraction schemas
- validators
- confidence calculation
- verification workflow
- API behavior

## AI

Test extraction against fixed sample input and expected structured fields.

## Frontend

Test key flows where practical:

```text
login
upload
verification
record search
```

---

# 47. DOCUMENTATION TO GENERATE

You must create documentation for future AI models and developers.

Create:

```text
README.md
AGENTS.md

docs/
├── PROJECT_CONTEXT.md
├── TECHNICAL_SPEC.md
├── CURRENT_STATE.md
├── ARCHITECTURE.md
├── AI_PIPELINE.md
├── DATABASE_SCHEMA.md
├── API_SPEC.md
├── SECURITY.md
├── INTEGRATIONS.md
├── DEPLOYMENT.md
└── DEMO_GUIDE.md
```

---

# 48. PURPOSE OF AGENTS.md

`AGENTS.md` must tell future AI coding agents:

```text
1. Read PROJECT_CONTEXT.md.
2. Read TECHNICAL_SPEC.md.
3. Read CURRENT_STATE.md.
4. Inspect the existing code before modifying it.
5. Follow existing architecture.
6. Do not break API contracts.
7. Do not modify database schemas without migrations.
8. Update documentation when architecture changes.
9. Update CURRENT_STATE.md after major implementation.
10. Never commit secrets.
11. Preserve auditability.
12. Validate AI outputs before database persistence.
```

---

# 49. README REQUIREMENTS

README should explain:

- what the project is,
- problem being solved,
- major features,
- architecture,
- technology stack,
- local setup,
- environment configuration,
- running frontend,
- running backend,
- database migration,
- sample users,
- running tests,
- demo workflow.

---

# 50. ENVIRONMENT CONFIGURATION

Create:

```text
.env.example
```

Example categories:

```text
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
AI_PROVIDER=
AI_API_KEY=
OCR_PROVIDER=
STORAGE_PROVIDER=
```

Never place actual API keys in repository files.

---

# 51. DIRECTORY STRUCTURE

Prefer a monorepo structure similar to:

```text
SIH26018/
│
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
│
├── docs/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── integrations/
│   │   └── ai/
│   └── tests/
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
└── docker/
```

Adjust structure intelligently if the implementation benefits from a cleaner organization.

---

# 52. DEVELOPMENT APPROACH

Do not attempt to randomly create everything at once.

Follow this sequence.

## Phase 1 — Understand and Design

Create:

```text
PROJECT_CONTEXT.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_SPEC.md
```

## Phase 2 — Project Foundation

Create:

```text
frontend
backend
database
authentication
environment configuration
Docker configuration if appropriate
```

## Phase 3 — Document Management

Implement:

```text
upload
storage
preview
metadata
status tracking
```

## Phase 4 — AI Pipeline

Implement:

```text
preprocessing
OCR
classification
field extraction
normalization
confidence
validation
```

## Phase 5 — Verification

Implement:

```text
verification queue
split-screen viewer
editing
approval
rejection
audit logging
```

## Phase 6 — Land Record Management

Implement:

```text
structured records
search
filtering
versioning
```

## Phase 7 — GIS

Implement:

```text
map
parcel visualization
location search
record-to-parcel linkage
```

## Phase 8 — Integration Layer

Implement:

```text
LRMS adapter
DILRMP-ready mapping
government API adapters
mock integrations
```

## Phase 9 — Dashboard

Implement:

```text
statistics
processing metrics
verification metrics
AI quality metrics
```

## Phase 10 — Testing and Documentation

Create:

```text
tests
demo data
deployment docs
demo guide
```

---

# 53. MVP PRIORITY

If development time is limited, prioritize:

```text
1. Login + RBAC
2. Document upload
3. OCR
4. AI extraction
5. Structured JSON
6. Confidence scoring
7. Manual verification
8. Database persistence
9. Search
10. GIS map
11. Audit trail
12. Dashboard
13. Mock government integration
```

Do not sacrifice the main workflow for optional features.

---

# 54. DEMO WORKFLOW

The final prototype should demonstrate:

```text
Officer logs in
      ↓
Uploads scanned land document
      ↓
System processes document
      ↓
OCR extracts text
      ↓
AI identifies document type
      ↓
AI extracts structured land details
      ↓
Confidence scores are calculated
      ↓
Validation identifies possible errors
      ↓
Low-confidence field goes to verifier
      ↓
Verifier compares source document and AI value
      ↓
Verifier corrects / approves
      ↓
Record becomes verified
      ↓
Record appears in searchable database
      ↓
Record is linked with GIS
      ↓
Integration API can export verified record
      ↓
Audit log records complete history
```

---

# 55. IMPORTANT ARCHITECTURAL RULES

Follow these rules throughout development:

1. AI providers must be replaceable.
2. OCR providers must be replaceable.
3. Government integrations must use adapters.
4. AI responses must use structured schemas.
5. Validate AI data before final persistence.
6. Preserve original document.
7. Preserve original OCR output.
8. Preserve extraction history.
9. Maintain audit logs.
10. Maintain record versions.
11. Do not silently overwrite approved data.
12. Use configurable confidence thresholds.
13. Do not trust external APIs blindly.
14. Do not expose sensitive records publicly.
15. Build around APIs and modular services.
16. Do not embed secrets in source files.
17. Maintain database migrations.
18. Write readable, maintainable code.
19. Keep the solution demo-friendly.
20. Keep official government integration assumptions clearly documented.

---

# 56. AI DEVELOPMENT RULES

Whenever you work on the repository:

Before coding:

```text
READ:
AGENTS.md
docs/PROJECT_CONTEXT.md
docs/TECHNICAL_SPEC.md
docs/CURRENT_STATE.md
```

Then inspect existing relevant code.

Before adding a feature:

- check whether similar functionality already exists,
- follow existing naming conventions,
- reuse common components,
- reuse shared types,
- preserve API compatibility.

After completing meaningful work:

Update:

```text
docs/CURRENT_STATE.md
```

Include:

```text
Completed
Currently working
Pending
Known issues
Important decisions
```

---

# 57. NO PLACEHOLDER-ONLY IMPLEMENTATION

Do not create a frontend that only looks complete but has no functional backend.

Similarly, do not create backend APIs without wiring essential frontend flows.

For primary MVP features, build the full path:

```text
Frontend
↓
API
↓
Business Logic
↓
Database
↓
Response
↓
Frontend state
```

For AI features:

```text
Document
↓
Processing Service
↓
OCR
↓
AI Provider
↓
Schema Validation
↓
Database
↓
Verification UI
```

---

# 58. MOCKING POLICY

Official government systems may not provide public APIs.

Therefore it is acceptable to create:

```text
MockLRMSAdapter
MockGISDataProvider
MockVillageMasterService
```

But:

- clearly label them,
- maintain realistic request/response structures,
- design interfaces so real integrations can replace them later.

---

# 59. EXPLAIN DECISIONS

For major technical decisions, document:

```text
Decision
Reason
Alternatives considered
Tradeoffs
```

Example:

```text
Decision:
Use PostgreSQL + PostGIS.

Reason:
The project requires both structured land data and GIS queries.

Alternative:
Separate MongoDB and GIS storage.

Tradeoff:
PostgreSQL requires schema design but simplifies transactional and GIS queries.
```

---

# 60. EXPECTED FINAL RESULT

The repository should ultimately represent a working prototype of:

> An AI-powered, human-verified, GIS-enabled, auditable web platform for converting unstructured government land-record documents into validated structured digital records that can integrate with land-record and government systems.

---

# 61. FIRST TASK FOR THE AI AGENT

After reading this prompt:

DO NOT immediately implement random code.

Perform the following:

### Step 1

Inspect the complete repository if one already exists.

### Step 2

Create or update:

```text
AGENTS.md
README.md

docs/PROJECT_CONTEXT.md
docs/TECHNICAL_SPEC.md
docs/CURRENT_STATE.md
docs/ARCHITECTURE.md
docs/AI_PIPELINE.md
docs/DATABASE_SCHEMA.md
docs/API_SPEC.md
docs/SECURITY.md
docs/INTEGRATIONS.md
docs/DEPLOYMENT.md
docs/DEMO_GUIDE.md
```

### Step 3

Create the project structure.

### Step 4

Implement the MVP in the priority order described above.

### Step 5

Test complete end-to-end workflow.

### Step 6

Update documentation to match the actual implementation.

---

# 62. DEFINITION OF DONE

The MVP is considered successfully implemented when an authorized user can:

1. Log in.
2. Upload a land-record document.
3. View the uploaded file.
4. Trigger or automatically start document processing.
5. Obtain OCR output.
6. Obtain structured AI extraction.
7. See confidence scores.
8. See validation warnings.
9. Manually verify questionable fields.
10. Approve the final record.
11. Search the verified record later.
12. View location / parcel information on GIS.
13. See a full audit trail.
14. Export or send the verified record through an integration API.
15. View processing statistics on a dashboard.

All important implementation and architecture decisions must be documented.

---

# 63. FINAL DEVELOPMENT PRINCIPLE

The most important principle for this system is:

```text
AI SHOULD ASSIST GOVERNMENT OFFICIALS,
NOT SILENTLY REPLACE VERIFICATION.
```

The platform should therefore combine:

```text
OCR
+
AI
+
Validation Rules
+
Government Master Data
+
GIS
+
Human Verification
+
Audit Trail
```

to produce trustworthy digital land records.

Build the solution around **accuracy, traceability, interoperability, modularity, security and usability**.