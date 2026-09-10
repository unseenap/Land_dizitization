ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK(status IN (
  'UPLOADED','QUEUED','MODEL_PROCESSING','MODEL_COMPLETED','PROCESSING_FAILED',
  'VERIFICATION_PENDING','RETURNED_FOR_EDIT','VERIFICATION_APPROVED','VERIFICATION_REJECTED'
));

CREATE TABLE verification_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL UNIQUE REFERENCES extraction_runs(id),
 document_id uuid NOT NULL REFERENCES documents(id),
 department_id uuid NOT NULL REFERENCES departments(id),
 schema_version_id uuid NOT NULL REFERENCES document_schema_versions(id),
 document_revision integer NOT NULL CHECK(document_revision > 0),
 status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN (
   'PENDING_REVIEW','RETURNED_FOR_EDIT','CORRECTED','PENDING_APPROVAL','APPROVED','REJECTED'
 )),
 returned_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_field_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES verification_tasks(id),
 field_key text NOT NULL,
 decision text NOT NULL CHECK(decision IN ('ACCEPT_MODEL','ACCEPT_CORRECTION')),
 value jsonb,
 reason text NOT NULL,
 decided_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_field_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES verification_tasks(id),
 field_key text NOT NULL,
 value jsonb NOT NULL,
 reason text NOT NULL,
 corrected_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 task_id uuid NOT NULL REFERENCES verification_tasks(id),
 from_status text,
 to_status text NOT NULL,
 action text NOT NULL,
 reason text NOT NULL,
 actor_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_approvals (
 task_id uuid PRIMARY KEY REFERENCES verification_tasks(id),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 reason text NOT NULL,
 approved_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION guard_verification_task_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'APPROVED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Approved verification tasks are immutable';
  END IF;
  IF NEW.run_id IS DISTINCT FROM OLD.run_id OR NEW.document_id IS DISTINCT FROM OLD.document_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.schema_version_id IS DISTINCT FROM OLD.schema_version_id
     OR NEW.document_revision IS DISTINCT FROM OLD.document_revision THEN
    RAISE EXCEPTION 'Verification task identity cannot change';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER verification_task_identity_guard BEFORE UPDATE ON verification_tasks
FOR EACH ROW EXECUTE FUNCTION guard_verification_task_identity();
CREATE TRIGGER verification_decisions_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON verification_field_decisions FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER verification_corrections_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON verification_field_corrections FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER verification_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON verification_history FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER verification_approvals_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON verification_approvals FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX verification_tasks_document ON verification_tasks(document_id,created_at DESC);
CREATE INDEX verification_decisions_latest ON verification_field_decisions(task_id,field_key,created_at DESC);
CREATE INDEX verification_corrections_latest ON verification_field_corrections(task_id,field_key,created_at DESC);
CREATE INDEX verification_history_task ON verification_history(task_id,created_at);

INSERT INTO permissions(code)
VALUES ('verification.read'),('verification.review'),('verification.correct')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p.code
FROM roles r CROSS JOIN (VALUES ('verification.read')) AS p(code)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p.code
FROM roles r CROSS JOIN (VALUES ('verification.review'),('verification.correct')) AS p(code)
WHERE r.code = 'administrator'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'verification.review' FROM roles r WHERE r.code='verifier'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'verification.correct' FROM roles r WHERE r.code='operator'
ON CONFLICT DO NOTHING;

GRANT SELECT,UPDATE ON verification_tasks TO land_app;
GRANT SELECT,INSERT ON verification_field_decisions TO land_app;
GRANT SELECT,INSERT ON verification_field_corrections TO land_app;
GRANT SELECT,INSERT ON verification_history TO land_app;
GRANT SELECT,INSERT ON verification_approvals TO land_app;
