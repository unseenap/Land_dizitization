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
