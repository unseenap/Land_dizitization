CREATE TABLE extraction_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL UNIQUE REFERENCES processing_jobs(id),
 artifact_id uuid NOT NULL UNIQUE REFERENCES processing_artifacts(id),
 document_id uuid NOT NULL REFERENCES documents(id),
 department_id uuid NOT NULL REFERENCES departments(id),
 schema_version_id uuid NOT NULL REFERENCES document_schema_versions(id),
 document_revision integer NOT NULL CHECK(document_revision > 0),
 status text NOT NULL CHECK(status IN ('VALIDATED','BLOCKED')),
 blocker_count integer NOT NULL DEFAULT 0 CHECK(blocker_count >= 0),
 duplicate_count integer NOT NULL DEFAULT 0 CHECK(duplicate_count >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE extraction_fields (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES extraction_runs(id),
 field_key text NOT NULL CHECK(field_key ~ '^[a-z][a-z0-9_]{0,49}$'),
 label text NOT NULL,
 field_type text NOT NULL CHECK(field_type IN ('text','number','date','boolean')),
 required boolean NOT NULL,
 critical boolean NOT NULL,
 source_value jsonb NOT NULL,
 normalized_value jsonb,
 confidence double precision CHECK(confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
 missing_reason text,
 evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(evidence)='array'),
 UNIQUE(run_id,field_key)
);

CREATE TABLE validation_findings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES extraction_runs(id),
 field_key text,
 code text NOT NULL,
 status text NOT NULL CHECK(status IN ('PASS','WARNING','FAIL','NOT_CHECKED')),
 severity text NOT NULL CHECK(severity IN ('INFO','WARNING','BLOCKING')),
 message text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object'),
 source text NOT NULL,
 UNIQUE(run_id,field_key,code)
);

CREATE TABLE duplicate_candidates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES extraction_runs(id),
 document_id uuid NOT NULL REFERENCES documents(id),
 candidate_document_id uuid NOT NULL REFERENCES documents(id),
 score double precision NOT NULL CHECK(score >= 0 AND score <= 1),
 signals jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(signals)='array'),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RESOLVED_NOT_DUPLICATE','RESOLVED_DUPLICATE')),
 resolution_reason text,
 resolved_by uuid REFERENCES users(id),
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(run_id,candidate_document_id),
 CHECK(document_id <> candidate_document_id)
);

CREATE INDEX extraction_runs_document ON extraction_runs(document_id,created_at DESC);
CREATE INDEX extraction_fields_run ON extraction_fields(run_id,field_key);
CREATE INDEX validation_findings_run ON validation_findings(run_id,severity,code);
CREATE INDEX duplicate_candidates_document ON duplicate_candidates(document_id,created_at DESC);
CREATE INDEX duplicate_candidates_candidate ON duplicate_candidates(candidate_document_id,created_at DESC);

CREATE TRIGGER extraction_runs_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON extraction_runs FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER extraction_fields_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON extraction_fields FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER validation_findings_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON validation_findings FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

INSERT INTO permissions(code) VALUES ('duplicates.resolve') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_code,permission_code)
 SELECT code,'duplicates.resolve' FROM roles WHERE code IN ('administrator','verifier') ON CONFLICT DO NOTHING;

GRANT SELECT,INSERT ON extraction_runs TO land_app;
GRANT SELECT,INSERT ON extraction_fields TO land_app;
GRANT SELECT,INSERT ON validation_findings TO land_app;
GRANT SELECT,INSERT,UPDATE ON duplicate_candidates TO land_app;
