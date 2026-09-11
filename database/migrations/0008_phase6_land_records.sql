CREATE TABLE land_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id uuid NOT NULL REFERENCES departments(id),
 document_id uuid NOT NULL UNIQUE REFERENCES documents(id),
 display_id text NOT NULL,
 current_version_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(department_id,display_id),
 UNIQUE(id,department_id)
);

ALTER TABLE documents ADD UNIQUE(id,department_id);

CREATE TABLE land_record_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 record_id uuid NOT NULL,
 department_id uuid NOT NULL REFERENCES departments(id),
 version integer NOT NULL CHECK(version > 0),
 task_id uuid NOT NULL UNIQUE REFERENCES verification_tasks(id),
 document_id uuid NOT NULL,
 village_id uuid NOT NULL,
 schema_version_id uuid NOT NULL REFERENCES document_schema_versions(id),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 survey_number text,
 khasra_number text,
 khata_number text,
 owner_name text,
 plot_area double precision CHECK(plot_area IS NULL OR plot_area > 0),
 area_unit text,
 land_classification text,
 ownership_status text,
 registration_number text,
 registration_date date,
 is_mutated boolean NOT NULL DEFAULT false,
 source_sha256 text NOT NULL,
 artifact_sha256 text NOT NULL,
 approved_by uuid NOT NULL REFERENCES users(id),
 approved_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(record_id,version),
 FOREIGN KEY(record_id,department_id) REFERENCES land_records(id,department_id),
 FOREIGN KEY(document_id,department_id) REFERENCES documents(id,department_id),
 FOREIGN KEY(village_id,department_id) REFERENCES villages(id,department_id),
 FOREIGN KEY(schema_version_id,department_id) REFERENCES document_schema_versions(id,department_id)
);

ALTER TABLE land_records
 ADD CONSTRAINT land_records_current_version_fk
 FOREIGN KEY(current_version_id) REFERENCES land_record_versions(id);

CREATE TABLE landowners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES land_record_versions(id),
 sequence integer NOT NULL CHECK(sequence > 0),
 name text NOT NULL,
 relationship text,
 ownership_share double precision CHECK(ownership_share IS NULL OR (ownership_share >= 0 AND ownership_share <= 100)),
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object'),
 UNIQUE(version_id,sequence)
);

CREATE TABLE mutation_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES land_record_versions(id),
 sequence integer NOT NULL CHECK(sequence > 0),
 mutation_number text,
 mutation_date date,
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object'),
 UNIQUE(version_id,sequence)
);

CREATE TABLE registration_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES land_record_versions(id),
 sequence integer NOT NULL CHECK(sequence > 0),
 registration_number text,
 registration_date date,
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object'),
 UNIQUE(version_id,sequence)
);

CREATE FUNCTION guard_land_record_current_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.department_id IS DISTINCT FROM OLD.department_id
    OR NEW.document_id IS DISTINCT FROM OLD.document_id OR NEW.display_id IS DISTINCT FROM OLD.display_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Land record identity is immutable';
 END IF;
 IF NEW.current_version_id IS DISTINCT FROM OLD.current_version_id THEN
   IF NOT EXISTS (
     SELECT 1 FROM land_record_versions v
     WHERE v.id=NEW.current_version_id AND v.record_id=NEW.id AND v.department_id=NEW.department_id
   ) THEN
     RAISE EXCEPTION 'Current version must belong to this land record';
   END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER land_record_identity_guard BEFORE UPDATE ON land_records
FOR EACH ROW EXECUTE FUNCTION guard_land_record_current_version();
CREATE TRIGGER land_records_no_delete BEFORE DELETE OR TRUNCATE ON land_records
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER land_record_versions_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON land_record_versions
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER landowners_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON landowners
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER mutation_records_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON mutation_records
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER registration_records_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON registration_records
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX land_records_scope ON land_records(department_id,updated_at DESC,id);
CREATE INDEX land_record_versions_record ON land_record_versions(record_id,version DESC,approved_at DESC);
CREATE INDEX land_record_versions_search ON land_record_versions(owner_name,survey_number,khasra_number,khata_number);
CREATE INDEX landowners_version ON landowners(version_id,sequence);
CREATE INDEX mutation_records_version ON mutation_records(version_id,sequence);
CREATE INDEX registration_records_version ON registration_records(version_id,sequence);

INSERT INTO permissions(code) VALUES ('records.read') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'records.read' FROM roles r ON CONFLICT DO NOTHING;

GRANT SELECT,INSERT,UPDATE ON land_records TO land_app;
GRANT SELECT,INSERT ON land_record_versions,landowners,mutation_records,registration_records TO land_app;
