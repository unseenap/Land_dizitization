CREATE TABLE integrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id uuid NOT NULL REFERENCES departments(id),
 adapter text NOT NULL CHECK(adapter IN ('LRMS','DILRMP','GOVERNMENT_DATABASE')),
 name text NOT NULL,
 mode text NOT NULL CHECK(mode IN ('MOCK','LIVE')),
 contract_version text NOT NULL,
 mapping_version integer NOT NULL CHECK(mapping_version > 0),
 mapping jsonb NOT NULL CHECK(jsonb_typeof(mapping)='object'),
 active boolean NOT NULL DEFAULT true,
 notes text,
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(department_id,adapter,name),
 UNIQUE(id,department_id)
);

CREATE TABLE integration_export_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 integration_id uuid NOT NULL,
 department_id uuid NOT NULL REFERENCES departments(id),
 record_id uuid NOT NULL,
 record_version_id uuid NOT NULL,
 idempotency_key uuid NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','DELIVERING','DELIVERED','FAILED')),
 payload_sha256 text CHECK(payload_sha256 IS NULL OR payload_sha256 ~ '^[a-f0-9]{64}$'),
 destination_reference text,
 acknowledgement jsonb CHECK(acknowledgement IS NULL OR jsonb_typeof(acknowledgement)='object'),
 attempt integer NOT NULL DEFAULT 0 CHECK(attempt >= 0),
 max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 10),
 next_attempt_at timestamptz,
 error_code text,
 error_message text,
 retryable boolean,
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 acknowledged_at timestamptz,
 UNIQUE(integration_id,record_version_id),
 UNIQUE(id,department_id),
 FOREIGN KEY(integration_id,department_id) REFERENCES integrations(id,department_id),
 FOREIGN KEY(record_id,department_id) REFERENCES land_records(id,department_id),
 FOREIGN KEY(record_version_id,record_id,department_id) REFERENCES land_record_versions(id,record_id,department_id),
 CHECK((status='DELIVERED') = (acknowledgement IS NOT NULL AND acknowledged_at IS NOT NULL))
);

CREATE TABLE integration_export_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES integration_export_runs(id),
 attempt integer NOT NULL CHECK(attempt > 0),
 operation text NOT NULL CHECK(operation IN ('deliver','reconcile')),
 status text NOT NULL,
 request_sha256 text CHECK(request_sha256 IS NULL OR request_sha256 ~ '^[a-f0-9]{64}$'),
 response jsonb,
 error_code text,
 error_message text,
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE(run_id,operation,attempt)
);

CREATE TABLE integration_export_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES integration_export_runs(id),
 from_status text,
 to_status text NOT NULL,
 reason text NOT NULL,
 actor_id uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integration_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES integration_export_runs(id),
 event_type text NOT NULL CHECK(event_type='INTEGRATION_DELIVER'),
 available_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz,
 published_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 last_error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(run_id,event_type)
);

CREATE TRIGGER integrations_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON integrations
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER integration_export_attempts_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON integration_export_attempts
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER integration_export_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON integration_export_history
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER integration_export_runs_no_delete BEFORE DELETE OR TRUNCATE ON integration_export_runs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX integrations_scope ON integrations(department_id,created_at DESC,id);
CREATE INDEX integration_export_runs_scope ON integration_export_runs(department_id,created_at DESC,id);
CREATE INDEX integration_export_runs_integration ON integration_export_runs(integration_id,created_at DESC);
CREATE INDEX integration_export_runs_record ON integration_export_runs(record_id,record_version_id);
CREATE INDEX integration_export_attempts_run ON integration_export_attempts(run_id,started_at);
CREATE INDEX integration_export_history_run ON integration_export_history(run_id,created_at);
CREATE INDEX integration_outbox_ready ON integration_outbox(available_at,id) WHERE published_at IS NULL;

INSERT INTO permissions(code)
VALUES ('integrations.read'),('integrations.manage'),('integrations.export') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,p FROM roles r CROSS JOIN (VALUES ('integrations.read'),('integrations.manage'),('integrations.export')) AS x(p)
WHERE r.code='administrator' ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'integrations.read' FROM roles r WHERE r.code='supervisor' ON CONFLICT DO NOTHING;

GRANT SELECT,INSERT ON integrations TO land_app;
GRANT SELECT,INSERT,UPDATE ON integration_export_runs TO land_app;
GRANT SELECT,INSERT ON integration_export_attempts,integration_export_history TO land_app;
GRANT SELECT,INSERT,UPDATE ON integration_outbox TO land_app;
