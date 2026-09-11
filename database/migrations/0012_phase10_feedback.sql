CREATE TABLE feedback_examples (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES verification_approvals(task_id),
 run_id uuid NOT NULL REFERENCES extraction_runs(id),
 document_id uuid NOT NULL REFERENCES documents(id),
 department_id uuid NOT NULL REFERENCES departments(id),
 schema_version_id uuid NOT NULL REFERENCES document_schema_versions(id),
 document_type text NOT NULL,
 language text NOT NULL,
 field_key text NOT NULL,
 field_type text NOT NULL,
 source_value jsonb NOT NULL,
 prediction jsonb,
 truth jsonb,
 truth_available boolean NOT NULL,
 confidence double precision CHECK(confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
 was_corrected boolean NOT NULL,
 evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(evidence)='array'),
 model_provider text NOT NULL,
 model_name text NOT NULL,
 model_version text NOT NULL,
 prompt_version text NOT NULL,
 contract_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(task_id,field_key),
 CHECK((truth_available AND truth IS NOT NULL) OR (NOT truth_available AND truth IS NULL))
);

CREATE TABLE feedback_datasets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id uuid NOT NULL REFERENCES departments(id),
 version integer NOT NULL CHECK(version > 0),
 name text NOT NULL,
 from_date date NOT NULL,
 to_date date NOT NULL,
 status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW','APPROVED','REJECTED')),
 review_reason text,
 created_by uuid NOT NULL REFERENCES users(id),
 reviewed_by uuid REFERENCES users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(department_id,version),
 UNIQUE(department_id,name),
 CHECK(from_date <= to_date)
);

CREATE TABLE feedback_dataset_items (
 dataset_id uuid NOT NULL REFERENCES feedback_datasets(id),
 example_id uuid NOT NULL REFERENCES feedback_examples(id),
 included_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(dataset_id,example_id)
);

CREATE TABLE evaluation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dataset_id uuid NOT NULL REFERENCES feedback_datasets(id),
 department_id uuid NOT NULL REFERENCES departments(id),
 model_version text NOT NULL,
 metrics jsonb NOT NULL CHECK(jsonb_typeof(metrics)='object'),
 evaluated_fields integer NOT NULL CHECK(evaluated_fields >= 0),
 correct_fields integer NOT NULL CHECK(correct_fields >= 0),
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(dataset_id,model_version)
);

CREATE TABLE feedback_export_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dataset_id uuid NOT NULL UNIQUE REFERENCES feedback_datasets(id),
 department_id uuid NOT NULL REFERENCES departments(id),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 payload_sha256 text NOT NULL,
 exported_by uuid NOT NULL REFERENCES users(id),
 exported_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION guard_feedback_dataset_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.department_id IS DISTINCT FROM OLD.department_id
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.from_date IS DISTINCT FROM OLD.from_date
    OR NEW.to_date IS DISTINCT FROM OLD.to_date
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
   RAISE EXCEPTION 'Feedback dataset identity cannot change';
 END IF;
 IF OLD.status <> 'PENDING_REVIEW' AND NEW IS DISTINCT FROM OLD THEN
   RAISE EXCEPTION 'Reviewed feedback datasets are immutable';
 END IF;
 IF NEW.status = 'PENDING_REVIEW' AND (NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL) THEN
   RAISE EXCEPTION 'Pending feedback datasets cannot have review attribution';
 END IF;
 IF NEW.status <> 'PENDING_REVIEW' AND (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL OR NEW.review_reason IS NULL) THEN
   RAISE EXCEPTION 'Reviewed feedback datasets require attribution and reason';
 END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER feedback_dataset_review_guard BEFORE UPDATE ON feedback_datasets
FOR EACH ROW EXECUTE FUNCTION guard_feedback_dataset_review();
CREATE TRIGGER feedback_examples_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON feedback_examples
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER feedback_dataset_items_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON feedback_dataset_items
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER evaluation_runs_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON evaluation_runs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER feedback_export_runs_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON feedback_export_runs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER feedback_datasets_no_delete BEFORE DELETE OR TRUNCATE ON feedback_datasets
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX feedback_examples_scope ON feedback_examples(department_id,created_at DESC,id);
CREATE INDEX feedback_examples_document ON feedback_examples(document_id,field_key);
CREATE INDEX feedback_examples_model ON feedback_examples(department_id,model_version);
CREATE INDEX feedback_datasets_scope ON feedback_datasets(department_id,created_at DESC,id);
CREATE INDEX evaluation_runs_scope ON evaluation_runs(department_id,created_at DESC,id);
CREATE INDEX evaluation_runs_dataset ON evaluation_runs(dataset_id,model_version);

INSERT INTO permissions(code)
VALUES ('feedback.read'),('feedback.manage'),('feedback.export') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'feedback.read' FROM roles r ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p FROM roles r CROSS JOIN (VALUES ('feedback.manage'),('feedback.export')) AS x(p)
WHERE r.code IN ('administrator','supervisor') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'feedback.export' FROM roles r WHERE r.code='verifier' ON CONFLICT DO NOTHING;

GRANT SELECT,INSERT ON feedback_examples TO land_app;
GRANT SELECT,INSERT,UPDATE ON feedback_datasets TO land_app;
GRANT SELECT,INSERT ON feedback_dataset_items,evaluation_runs,feedback_export_runs TO land_app;
