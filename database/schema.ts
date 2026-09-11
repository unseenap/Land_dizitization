import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  primaryKey,
  jsonb,
  doublePrecision,
  type AnyPgColumn,
  date,
} from "drizzle-orm/pg-core";

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
});
export const jurisdictions = pgTable("jurisdictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
});
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const roles = pgTable("roles", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});
export const permissions = pgTable("permissions", {
  code: text("code").primaryKey(),
});
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleCode: text("role_code")
      .notNull()
      .references(() => roles.code),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleCode] })],
);
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleCode: text("role_code")
      .notNull()
      .references(() => roles.code),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code),
  },
  (table) => [primaryKey({ columns: [table.roleCode, table.permissionCode] })],
);
export const userScopes = pgTable(
  "user_scopes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    jurisdictionId: uuid("jurisdiction_id")
      .notNull()
      .references(() => jurisdictions.id),
  },
  (table) => [primaryKey({ columns: [table.userId, table.jurisdictionId] })],
);
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").references(() => departments.id),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details").notNull().default({}),
  requestId: uuid("request_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Runtime table mappings. Reviewed SQL migrations own composite department
// constraints, indexes, grants, checks and immutable-history triggers.
const areaColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
});
export const states = pgTable("states", areaColumns());
export const districts = pgTable("districts", {
  ...areaColumns(),
  stateId: uuid("state_id")
    .notNull()
    .references(() => states.id),
  jurisdictionId: uuid("jurisdiction_id")
    .notNull()
    .unique()
    .references(() => jurisdictions.id),
});
export const tehsils = pgTable("tehsils", {
  ...areaColumns(),
  districtId: uuid("district_id")
    .notNull()
    .references(() => districts.id),
});
export const villages = pgTable("villages", {
  ...areaColumns(),
  tehsilId: uuid("tehsil_id")
    .notNull()
    .references(() => tehsils.id),
});
export const documentTypes = pgTable("document_types", {
  ...areaColumns(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const documentSchemaVersions = pgTable("document_schema_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  typeId: uuid("type_id")
    .notNull()
    .references(() => documentTypes.id),
  departmentId: uuid("department_id").notNull(),
  version: integer("version").notNull(),
  fields: jsonb("fields").notNull(),
  jsonSchema: jsonb("json_schema").notNull(),
  reason: text("reason").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  villageId: uuid("village_id")
    .notNull()
    .references(() => villages.id),
  schemaVersionId: uuid("schema_version_id").references(
    () => documentSchemaVersions.id,
  ),
  uploaderId: uuid("uploader_id")
    .notNull()
    .references(() => users.id),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  pageCount: integer("page_count").notNull(),
  objectKey: text("object_key").notNull().unique(),
  previewKey: text("preview_key"),
  title: text("title").notNull(),
  language: text("language").notNull().default(""),
  reference: text("reference").notNull().default(""),
  notes: text("notes").notNull().default(""),
  revision: integer("revision").notNull().default(1),
  status: text("status").notNull().default("UPLOADED"),
  uploadKey: uuid("upload_key").notNull(),
  requestHash: text("request_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const documentPages = pgTable("document_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id),
  pageNumber: integer("page_number").notNull(),
  width: doublePrecision("width").notNull(),
  height: doublePrecision("height").notNull(),
});
const historyColumns = () => ({
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const documentMetadata = pgTable("document_metadata", {
  ...historyColumns(),
  revision: integer("revision").notNull(),
  values: jsonb("values").notNull(),
});
export const documentStatusHistory = pgTable("document_status_history", {
  ...historyColumns(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
});
export const uploadLimits = pgTable("upload_limits", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  attempts: integer("attempts").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => departments.id),
  documentRevision: integer("document_revision").notNull(),
  inputSha256: text("input_sha256").notNull(),
  schemaVersionId: uuid("schema_version_id").references(
    () => documentSchemaVersions.id,
  ),
  status: text("status").notNull().default("QUEUED"),
  stage: text("stage").notNull().default("QUEUED"),
  requestId: uuid("request_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  tasks: jsonb("tasks").notNull().default([]),
  languageHints: jsonb("language_hints").notNull().default([]),
  requestedModelVersion: text("requested_model_version"),
  remoteJobId: text("remote_job_id"),
  contractVersion: text("contract_version"),
  provider: text("provider"),
  modelName: text("model_name"),
  modelVersion: text("model_version"),
  promptVersion: text("prompt_version"),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryable: boolean("retryable"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const processingAttempts = pgTable("processing_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => processingJobs.id),
  operation: text("operation").notNull(),
  attempt: integer("attempt").notNull(),
  status: text("status").notNull(),
  remoteJobId: text("remote_job_id"),
  requestId: uuid("request_id"),
  payloadHash: text("payload_hash"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const processingOutbox = pgTable("processing_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => processingJobs.id),
  eventType: text("event_type").notNull(),
  availableAt: timestamp("available_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const processingArtifacts = pgTable("processing_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => processingJobs.id),
  kind: text("kind").notNull(),
  accepted: boolean("accepted").notNull(),
  rejectionCode: text("rejection_code"),
  payload: jsonb("payload").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const processingJobHistory = pgTable("processing_job_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => processingJobs.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  stage: text("stage").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const extractionRuns = pgTable("extraction_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => processingJobs.id),
  artifactId: uuid("artifact_id").notNull().references(() => processingArtifacts.id),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  schemaVersionId: uuid("schema_version_id").notNull().references(() => documentSchemaVersions.id),
  documentRevision: integer("document_revision").notNull(),
  status: text("status").notNull(),
  blockerCount: integer("blocker_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const extractionFields = pgTable("extraction_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => extractionRuns.id),
  fieldKey: text("field_key").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").notNull(),
  required: boolean("required").notNull(),
  critical: boolean("critical").notNull(),
  sourceValue: jsonb("source_value").notNull(),
  normalizedValue: jsonb("normalized_value"),
  confidence: doublePrecision("confidence"),
  missingReason: text("missing_reason"),
  evidence: jsonb("evidence").notNull().default([]),
});

export const validationFindings = pgTable("validation_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => extractionRuns.id),
  fieldKey: text("field_key"),
  code: text("code").notNull(),
  status: text("status").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  details: jsonb("details").notNull().default({}),
  source: text("source").notNull(),
});

export const duplicateCandidates = pgTable("duplicate_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => extractionRuns.id),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  candidateDocumentId: uuid("candidate_document_id").notNull().references(() => documents.id),
  score: doublePrecision("score").notNull(),
  signals: jsonb("signals").notNull().default([]),
  status: text("status").notNull().default("PENDING"),
  resolutionReason: text("resolution_reason"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationTasks = pgTable("verification_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => extractionRuns.id),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  schemaVersionId: uuid("schema_version_id").notNull().references(() => documentSchemaVersions.id),
  documentRevision: integer("document_revision").notNull(),
  status: text("status").notNull().default("PENDING_REVIEW"),
  returnedReason: text("returned_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationFieldDecisions = pgTable("verification_field_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => verificationTasks.id),
  fieldKey: text("field_key").notNull(),
  decision: text("decision").notNull(),
  value: jsonb("value"),
  reason: text("reason").notNull(),
  decidedBy: uuid("decided_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationFieldCorrections = pgTable("verification_field_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => verificationTasks.id),
  fieldKey: text("field_key").notNull(),
  value: jsonb("value").notNull(),
  reason: text("reason").notNull(),
  correctedBy: uuid("corrected_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationHistory = pgTable("verification_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => verificationTasks.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationApprovals = pgTable("verification_approvals", {
  taskId: uuid("task_id").primaryKey().references(() => verificationTasks.id),
  snapshot: jsonb("snapshot").notNull(),
  reason: text("reason").notNull(),
  approvedBy: uuid("approved_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landRecords = pgTable("land_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  displayId: text("display_id").notNull(),
  currentVersionId: uuid("current_version_id").references(
    (): AnyPgColumn => landRecordVersions.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landRecordVersions = pgTable("land_record_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id").notNull().references(() => landRecords.id),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  version: integer("version").notNull(),
  taskId: uuid("task_id").notNull().references(() => verificationTasks.id),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  villageId: uuid("village_id").notNull().references(() => villages.id),
  schemaVersionId: uuid("schema_version_id").notNull().references(() => documentSchemaVersions.id),
  snapshot: jsonb("snapshot").notNull(),
  surveyNumber: text("survey_number"),
  khasraNumber: text("khasra_number"),
  khataNumber: text("khata_number"),
  ownerName: text("owner_name"),
  plotArea: doublePrecision("plot_area"),
  areaUnit: text("area_unit"),
  landClassification: text("land_classification"),
  ownershipStatus: text("ownership_status"),
  registrationNumber: text("registration_number"),
  registrationDate: date("registration_date"),
  isMutated: boolean("is_mutated").notNull().default(false),
  sourceSha256: text("source_sha256").notNull(),
  artifactSha256: text("artifact_sha256").notNull(),
  approvedBy: uuid("approved_by").notNull().references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landowners = pgTable("landowners", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => landRecordVersions.id),
  sequence: integer("sequence").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship"),
  ownershipShare: doublePrecision("ownership_share"),
  details: jsonb("details").notNull().default({}),
});

export const mutationRecords = pgTable("mutation_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => landRecordVersions.id),
  sequence: integer("sequence").notNull(),
  mutationNumber: text("mutation_number"),
  mutationDate: date("mutation_date"),
  details: jsonb("details").notNull().default({}),
});

export const registrationRecords = pgTable("registration_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => landRecordVersions.id),
  sequence: integer("sequence").notNull(),
  registrationNumber: text("registration_number"),
  registrationDate: date("registration_date"),
  details: jsonb("details").notNull().default({}),
});

export const gisParcels = pgTable("gis_parcels", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  villageId: uuid("village_id").notNull().references(() => villages.id),
  parcelNumber: text("parcel_number").notNull(),
  sourceName: text("source_name").notNull(),
  sourceReference: text("source_reference").notNull(),
  sourceCrs: text("source_crs").notNull(),
  targetCrs: text("target_crs").notNull(),
  geometry: jsonb("geometry"),
  missingGeometryReason: text("missing_geometry_reason"),
  provenance: jsonb("provenance").notNull().default({}),
  synthetic: boolean("synthetic").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gisRecordLinks = pgTable("gis_record_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  parcelId: uuid("parcel_id").notNull().references(() => gisParcels.id),
  recordId: uuid("record_id").notNull().references(() => landRecords.id),
  recordVersionId: uuid("record_version_id").notNull().references(() => landRecordVersions.id),
  status: text("status").notNull(),
  proposalReason: text("proposal_reason").notNull(),
  reviewReason: text("review_reason"),
  proposedBy: uuid("proposed_by").notNull().references(() => users.id),
  proposedAt: timestamp("proposed_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gisRecordLinkHistory = pgTable("gis_record_link_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  linkId: uuid("link_id").notNull().references(() => gisRecordLinks.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  actorId: uuid("actor_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  adapter: text("adapter").notNull(),
  name: text("name").notNull(),
  mode: text("mode").notNull(),
  contractVersion: text("contract_version").notNull(),
  mappingVersion: integer("mapping_version").notNull(),
  mapping: jsonb("mapping").notNull(),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const integrationExportRuns = pgTable("integration_export_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  integrationId: uuid("integration_id").notNull().references(() => integrations.id),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  recordId: uuid("record_id").notNull().references(() => landRecords.id),
  recordVersionId: uuid("record_version_id").notNull().references(() => landRecordVersions.id),
  idempotencyKey: uuid("idempotency_key").notNull().unique(),
  status: text("status").notNull().default("QUEUED"),
  payloadSha256: text("payload_sha256"),
  destinationReference: text("destination_reference"),
  acknowledgement: jsonb("acknowledgement"),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryable: boolean("retryable"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
});

export const integrationExportAttempts = pgTable("integration_export_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => integrationExportRuns.id),
  attempt: integer("attempt").notNull(),
  operation: text("operation").notNull(),
  status: text("status").notNull(),
  requestSha256: text("request_sha256"),
  response: jsonb("response"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const integrationExportHistory = pgTable("integration_export_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => integrationExportRuns.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason").notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const integrationOutbox = pgTable("integration_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => integrationExportRuns.id),
  eventType: text("event_type").notNull(),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
