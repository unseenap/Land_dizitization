CREATE TABLE departments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL);
CREATE TABLE jurisdictions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), code text NOT NULL, name text NOT NULL, UNIQUE(department_id,code), UNIQUE(id,department_id));
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid NOT NULL REFERENCES departments(id), email text UNIQUE NOT NULL CHECK(email = lower(email)), name text NOT NULL, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true, revision integer NOT NULL DEFAULT 1 CHECK(revision > 0), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE roles (code text PRIMARY KEY, name text NOT NULL);
CREATE TABLE permissions (code text PRIMARY KEY);
CREATE TABLE user_roles (user_id uuid NOT NULL REFERENCES users(id), role_code text NOT NULL REFERENCES roles(code), PRIMARY KEY(user_id,role_code));
CREATE TABLE role_permissions (role_code text NOT NULL REFERENCES roles(code), permission_code text NOT NULL REFERENCES permissions(code), PRIMARY KEY(role_code,permission_code));
CREATE TABLE user_scopes (user_id uuid NOT NULL REFERENCES users(id), jurisdiction_id uuid NOT NULL REFERENCES jurisdictions(id), PRIMARY KEY(user_id,jurisdiction_id));
CREATE FUNCTION guard_user_scope() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM users u JOIN jurisdictions j ON j.department_id=u.department_id WHERE u.id=NEW.user_id AND j.id=NEW.jurisdiction_id) THEN RAISE EXCEPTION 'Scope must belong to user department'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER user_scope_department BEFORE INSERT OR UPDATE ON user_scopes FOR EACH ROW EXECUTE FUNCTION guard_user_scope();
CREATE TABLE sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE login_limits (key text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), department_id uuid REFERENCES departments(id), actor_id uuid REFERENCES users(id), action text NOT NULL, entity_id uuid, details jsonb NOT NULL DEFAULT '{}', request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit events are append-only'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE INDEX users_department ON users(department_id,created_at);
CREATE INDEX jurisdictions_department ON jurisdictions(department_id);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX scopes_jurisdiction ON user_scopes(jurisdiction_id);
CREATE INDEX audit_department_time ON audit_logs(department_id,created_at DESC,id);
CREATE INDEX audit_actor ON audit_logs(actor_id);
CREATE INDEX login_limits_expiry ON login_limits(expires_at);

-- Runtime role must be provisioned separately; migrations use the owner credential.
GRANT USAGE ON SCHEMA public TO land_app;
GRANT SELECT ON departments,jurisdictions,roles,permissions,role_permissions TO land_app;
GRANT SELECT,INSERT,UPDATE ON users TO land_app;
GRANT SELECT,INSERT,DELETE ON user_roles,user_scopes TO land_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON sessions,login_limits TO land_app;
GRANT SELECT,INSERT ON audit_logs TO land_app;
