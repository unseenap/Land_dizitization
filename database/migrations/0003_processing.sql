ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK(status IN ('UPLOADED','QUEUED','MODEL_PROCESSING','MODEL_COMPLETED','PROCESSING_FAILED'));

CREATE TABLE processing_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 document_id uuid NOT NULL REFERENCES documents(id),
 department_id uuid NOT NULL REFERENCES departments(id),
 document_revision integer NOT NULL CHECK(document_revision > 0),
 input_sha256 text NOT NULL CHECK(input_sha256 ~ '^[a-f0-9]{64}$'),
 schema_version_id uuid REFERENCES document_schema_versions(id),
 status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','SUBMITTING','SUBMITTED','RUNNING','SUCCEEDED','FAILED','CANCELLED','RESULT_REJECTED')),
 stage text NOT NULL DEFAULT 'QUEUED',
 request_id uuid NOT NULL,
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 tasks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(tasks)='array'),
 language_hints jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(language_hints)='array'),
 requested_model_version text,
 remote_job_id text,
 contract_version text,
 provider text,
 model_name text,
 model_version text,
 prompt_version text,
 attempt integer NOT NULL DEFAULT 0 CHECK(attempt >= 0),
 max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 10),
 next_attempt_at timestamptz,
 started_at timestamptz,
 completed_at timestamptz,
 error_code text,
 error_message text,
 retryable boolean,
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(document_id,document_revision)
);

CREATE TABLE processing_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES processing_jobs(id),
 operation text NOT NULL CHECK(operation IN ('submit','poll','result','reconcile')),
 attempt integer NOT NULL CHECK(attempt > 0),
 status text NOT NULL,
 remote_job_id text,
 request_id uuid,
 payload_hash text,
 error_code text,
 error_message text,
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);

CREATE TABLE processing_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES processing_jobs(id),
 event_type text NOT NULL CHECK(event_type IN ('PROCESSING_SUBMIT','PROCESSING_POLL')),
 available_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz,
 published_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(job_id,event_type)
);

CREATE TABLE processing_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES processing_jobs(id),
 kind text NOT NULL CHECK(kind IN ('model_result','model_error','capabilities')),
 accepted boolean NOT NULL,
 rejection_code text,
 payload jsonb NOT NULL,
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE processing_job_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES processing_jobs(id),
 from_status text,
 to_status text NOT NULL,
 stage text NOT NULL,
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX processing_jobs_scope ON processing_jobs(department_id,created_at DESC,id);
CREATE INDEX processing_jobs_document ON processing_jobs(document_id,document_revision);
CREATE INDEX processing_jobs_ready ON processing_jobs(status,next_attempt_at);
CREATE INDEX processing_outbox_ready ON processing_outbox(available_at,id) WHERE published_at IS NULL;
CREATE INDEX processing_attempts_job ON processing_attempts(job_id,started_at);
CREATE INDEX processing_artifacts_job ON processing_artifacts(job_id,created_at);
CREATE INDEX processing_history_job ON processing_job_history(job_id,created_at);

CREATE TRIGGER processing_artifacts_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON processing_artifacts FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER processing_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON processing_job_history FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

INSERT INTO permissions(code) VALUES ('processing.read'),('processing.submit') ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT,UPDATE ON processing_jobs TO land_app;
GRANT SELECT,INSERT ON processing_attempts TO land_app;
GRANT SELECT,INSERT,UPDATE ON processing_outbox TO land_app;
GRANT SELECT,INSERT ON processing_artifacts TO land_app;
GRANT SELECT,INSERT ON processing_job_history TO land_app;
GRANT UPDATE ON documents TO land_app;
