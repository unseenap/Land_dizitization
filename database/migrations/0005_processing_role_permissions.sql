INSERT INTO role_permissions(role_code,permission_code) SELECT code,'processing.read' FROM roles ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_code,permission_code) SELECT code,'processing.submit' FROM roles WHERE code IN ('administrator','operator') ON CONFLICT DO NOTHING;
