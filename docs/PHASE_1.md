# Phase 1 — Foundation handoff

## Working features

One Next.js application serves sign-in, a protected overview, department-scoped user management and audit history. PostgreSQL is the persistent store. All business service entrypoints resolve the session and enforce permissions; hiding a navigation link is not the security boundary.

User creation accepts name, email, initial password (12–128 characters), one predefined role and one or more assigned jurisdictions. Administrators can manage only users whose entire jurisdiction set is within their own. They cannot edit their own access. Access changes require the current revision and revoke the target user's sessions.

Audit changes are append-only to the runtime role and are committed with the corresponding account change. Readers with every department jurisdiction may see department audit events; narrower readers see their own events. Model/document functionality is not simulated on the overview page.

## Start here

Follow [DEPLOYMENT.md](DEPLOYMENT.md). After setup, run npm run dev and open http://127.0.0.1:3000.

| Account | Purpose |
|---|---|
| admin@demo.land | Full department A administration |
| north.admin@demo.land | Narrower jurisdiction administration |
| operator@demo.land | Operator account; no user management or audit access |
| verifier@demo.land | Verification role identity; record workflow comes later |
| gis@demo.land | GIS role identity; map workflow comes later |
| supervisor@demo.land | Department audit and overview |
| external.admin@demo.land | Separate department B isolation check |

Passwords are randomly generated and saved only in .local-data/demo-accounts.json. This ignored local file must not be committed or shared publicly. Initial passwords for newly created users are supplied by their administrator; password-reset UX is not part of Phase 1.

## Implemented APIs

| Method | Route | Behavior |
|---|---|---|
| POST | /api/v1/auth/login | Origin-checked credentials; secure session cookie and csrfToken |
| POST | /api/v1/auth/logout | CSRF-checked session revocation |
| GET | /api/v1/auth/me | Safe user DTO and session-bound csrfToken |
| GET / POST | /api/v1/users | Scoped list / create |
| GET / PATCH | /api/v1/users/{id} | Scoped detail / revision-checked access change |
| GET | /api/v1/audit | Permission/scoped event list |
| GET | /api/v1/master-data/jurisdictions | Current user's assigned areas |
| GET | /api/v1/health/live | Process liveness |
| GET | /api/v1/health/ready | Database readiness |

List APIs return items, page, page_size=25 and total. Creation fields: name, email, password, role, scopeIds. Update fields: expectedRevision, active, role, scopeIds. Mutations require matching Origin and X-CSRF-Token; requests use JSON with a 16 KiB maximum. Unknown input keys are rejected. Error bodies contain a safe code/message and request ID. Sensitive API responses use private, no-store.

## Validation evidence

- Ten PostgreSQL integration tests: repeatable migrations, runtime restrictions, hashed credentials/tokens, invalid login, role denial, cross-department and jurisdiction isolation, duplicate create/concurrent update, session revocation, atomic audit rollback, scoped audit, CSRF/Origin/body limits and throttling/logout.
- Three browser scenarios: complete account workflow; API/cache/CSRF boundaries; mobile sign-in without horizontal overflow.
- Production Next.js build, TypeScript and ESLint passed; desktop/mobile screenshots inspected.
- Client-output secret scan passed across 15 JavaScript files. Run npm run security:client after building.

Integration tests create an isolated temporary database and remove it afterward. Browser tests use synthetic local accounts and leave deactivated test users with their audit trail.

## Deliberate boundaries

No model calls, document upload, durable processing worker, PostGIS, record approval, government export or extraction metrics exist yet. Jurisdictions are flat synthetic areas; full master-data hierarchy follows in Phase 2. Roles are seeded definitions; assigning them is implemented, editing permission definitions is not. Production recovery, MFA/SSO, full CSP, backup verification and retention policies require additional work.
