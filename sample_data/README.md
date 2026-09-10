# Synthetic dataset policy

Planned fixtures: fictional departments/jurisdictions, role-separated demo users, at least two land-document types, supported multilingual and handwriting scans, duplicate/error cases and synthetic cadastral parcels.

Mark model mocks and government/GIS fixtures clearly. Keep expected truth separate from model input. Preserve dataset/model/schema versions for evaluation. Generate local demo credentials during seeding; never commit real private records, model keys or reusable passwords.

scripts/seed.ts creates synthetic departments, jurisdictions, seven role-separated accounts, administrative hierarchy and two initial document types (record of rights and mutation). Generated passwords live only in ignored .local-data/demo-accounts.json. `npm run fixtures` generates a clearly labelled fictional two-page PDF and PNG in .local-data/fixtures. These are upload/preview fixtures, not OCR evaluation data. No real records, handwritten/multilingual evaluation datasets, parcels or model results are included.
