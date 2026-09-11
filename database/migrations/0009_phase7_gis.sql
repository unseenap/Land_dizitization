CREATE TABLE gis_parcels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id uuid NOT NULL REFERENCES departments(id),
 village_id uuid NOT NULL,
 parcel_number text NOT NULL,
 source_name text NOT NULL,
 source_reference text NOT NULL,
 source_crs text NOT NULL,
 target_crs text NOT NULL,
 geometry jsonb CHECK(geometry IS NULL OR jsonb_typeof(geometry)='object'),
 missing_geometry_reason text CHECK(geometry IS NOT NULL OR missing_geometry_reason IS NOT NULL),
 provenance jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(provenance)='object'),
 synthetic boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(department_id,village_id,parcel_number),
 UNIQUE(id,department_id),
 FOREIGN KEY(village_id,department_id) REFERENCES villages(id,department_id)
);

ALTER TABLE land_record_versions ADD UNIQUE(id,record_id,department_id);

CREATE TABLE gis_record_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id uuid NOT NULL REFERENCES departments(id),
 parcel_id uuid NOT NULL,
 record_id uuid NOT NULL,
 record_version_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('PROPOSED','APPROVED','REJECTED')),
 proposal_reason text NOT NULL,
 review_reason text,
 proposed_by uuid NOT NULL REFERENCES users(id),
 proposed_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by uuid REFERENCES users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(parcel_id,record_id,record_version_id),
 UNIQUE(id,department_id),
 FOREIGN KEY(parcel_id,department_id) REFERENCES gis_parcels(id,department_id),
 FOREIGN KEY(record_id,department_id) REFERENCES land_records(id,department_id),
 FOREIGN KEY(record_version_id,record_id,department_id) REFERENCES land_record_versions(id,record_id,department_id),
 CHECK((status='PROPOSED') = (reviewed_by IS NULL AND reviewed_at IS NULL AND review_reason IS NULL))
);

CREATE TABLE gis_record_link_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 link_id uuid NOT NULL REFERENCES gis_record_links(id),
 from_status text,
 to_status text NOT NULL,
 action text NOT NULL,
 reason text NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER gis_parcels_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON gis_parcels
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER gis_record_links_no_delete BEFORE DELETE OR TRUNCATE ON gis_record_links
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER gis_record_link_history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON gis_record_link_history
FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX gis_parcels_scope ON gis_parcels(department_id,created_at DESC,id);
CREATE INDEX gis_parcels_village ON gis_parcels(village_id,parcel_number);
CREATE INDEX gis_record_links_scope ON gis_record_links(department_id,status,updated_at DESC,id);
CREATE INDEX gis_record_links_parcel ON gis_record_links(parcel_id,updated_at DESC);
CREATE INDEX gis_record_links_record ON gis_record_links(record_id,updated_at DESC);
CREATE INDEX gis_record_link_history_link ON gis_record_link_history(link_id,created_at);

INSERT INTO permissions(code)
VALUES ('gis.read'),('gis.link'),('gis.review') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'gis.read' FROM roles r ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'gis.link' FROM roles r WHERE r.code IN ('administrator','gis_officer') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'gis.review' FROM roles r WHERE r.code IN ('administrator','verifier') ON CONFLICT DO NOTHING;

GRANT SELECT ON gis_parcels TO land_app;
GRANT SELECT,INSERT,UPDATE ON gis_record_links TO land_app;
GRANT SELECT,INSERT ON gis_record_link_history TO land_app;
