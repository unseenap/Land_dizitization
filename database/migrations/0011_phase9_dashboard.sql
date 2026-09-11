INSERT INTO permissions(code) VALUES ('dashboard.read') ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_code,permission_code)
SELECT r.code,'dashboard.read' FROM roles r ON CONFLICT DO NOTHING;
