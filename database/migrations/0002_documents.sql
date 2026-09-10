CREATE TABLE states (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), code text NOT NULL, name text NOT NULL, UNIQUE(department_id,code), UNIQUE(id,department_id));
CREATE TABLE districts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), state_id uuid NOT NULL, jurisdiction_id uuid UNIQUE NOT NULL, code text NOT NULL, name text NOT NULL,
 FOREIGN KEY(state_id,department_id) REFERENCES states(id,department_id), FOREIGN KEY(jurisdiction_id,department_id) REFERENCES jurisdictions(id,department_id), UNIQUE(department_id,code), UNIQUE(id,department_id));
CREATE TABLE tehsils (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), district_id uuid NOT NULL, code text NOT NULL, name text NOT NULL,
 FOREIGN KEY(district_id,department_id) REFERENCES districts(id,department_id), UNIQUE(district_id,code), UNIQUE(id,department_id));
CREATE TABLE villages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), tehsil_id uuid NOT NULL, code text NOT NULL, name text NOT NULL,
 FOREIGN KEY(tehsil_id,department_id) REFERENCES tehsils(id,department_id), UNIQUE(tehsil_id,code), UNIQUE(id,department_id));
CREATE TABLE document_types (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), code text NOT NULL, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(department_id,code), UNIQUE(id,department_id));
CREATE TABLE document_schema_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type_id uuid NOT NULL, department_id uuid NOT NULL, version integer NOT NULL CHECK(version>0), fields jsonb NOT NULL CHECK(jsonb_typeof(fields)='array'), json_schema jsonb NOT NULL, reason text NOT NULL, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(type_id,department_id) REFERENCES document_types(id,department_id), UNIQUE(type_id,version), UNIQUE(id,department_id));
CREATE TABLE documents (id uuid PRIMARY KEY, display_id text NOT NULL UNIQUE, department_id uuid NOT NULL REFERENCES departments(id), village_id uuid NOT NULL, schema_version_id uuid, uploader_id uuid NOT NULL REFERENCES users(id), original_name text NOT NULL,
 mime_type text NOT NULL, byte_size integer NOT NULL CHECK(byte_size>0), sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), page_count integer NOT NULL CHECK(page_count>0), object_key text UNIQUE NOT NULL, preview_key text,
 title text NOT NULL, language text NOT NULL DEFAULT '', reference text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', revision integer NOT NULL DEFAULT 1 CHECK(revision>0), status text NOT NULL DEFAULT 'UPLOADED' CHECK(status IN ('UPLOADED')),
 upload_key uuid NOT NULL, request_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(village_id,department_id) REFERENCES villages(id,department_id), FOREIGN KEY(schema_version_id,department_id) REFERENCES document_schema_versions(id,department_id), UNIQUE(uploader_id,upload_key));
CREATE TABLE document_pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id), page_number integer NOT NULL CHECK(page_number>0), width double precision NOT NULL CHECK(width>0), height double precision NOT NULL CHECK(height>0), UNIQUE(document_id,page_number));
CREATE TABLE document_metadata (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id), revision integer NOT NULL, values jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id,revision));
CREATE TABLE document_status_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id), from_status text, to_status text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE upload_limits (user_id uuid PRIMARY KEY REFERENCES users(id), attempts integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE FUNCTION immutable_document_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.id,NEW.department_id,NEW.village_id,NEW.schema_version_id,NEW.uploader_id,NEW.original_name,NEW.mime_type,NEW.byte_size,NEW.sha256,NEW.object_key,NEW.preview_key,NEW.page_count,NEW.upload_key,NEW.request_hash,NEW.display_id,NEW.created_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.department_id,OLD.village_id,OLD.schema_version_id,OLD.uploader_id,OLD.original_name,OLD.mime_type,OLD.byte_size,OLD.sha256,OLD.object_key,OLD.preview_key,OLD.page_count,OLD.upload_key,OLD.request_hash,OLD.display_id,OLD.created_at)
 THEN RAISE EXCEPTION 'Document source and identity are immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER document_source_immutable BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION immutable_document_source();
CREATE TRIGGER schema_versions_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON document_schema_versions FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER document_metadata_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON document_metadata FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER document_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON document_status_history FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE INDEX documents_scope_created ON documents(department_id,village_id,created_at DESC,id);
CREATE INDEX documents_hash ON documents(department_id,sha256);
CREATE INDEX documents_schema ON documents(schema_version_id);
CREATE INDEX documents_uploader ON documents(uploader_id);
CREATE INDEX villages_parent ON villages(tehsil_id);
CREATE INDEX tehsils_parent ON tehsils(district_id);
CREATE INDEX districts_parent ON districts(state_id);
CREATE INDEX document_history_parent ON document_status_history(document_id,created_at);
INSERT INTO permissions(code) VALUES ('documents.read'),('documents.upload'),('master-data.manage'),('document-types.manage') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_code,permission_code) SELECT r.code,'documents.read' FROM roles r ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_code,permission_code) SELECT code,'documents.upload' FROM roles WHERE code='operator' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_code,permission_code) SELECT code,p FROM roles CROSS JOIN (VALUES ('master-data.manage'),('document-types.manage')) AS x(p) WHERE code='administrator' ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT ON states,districts,tehsils,villages,document_types,document_schema_versions,document_pages,document_metadata,document_status_history TO land_app;
GRANT SELECT,INSERT,UPDATE ON documents TO land_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON upload_limits TO land_app;
