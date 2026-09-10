# Security and privacy design

Phase 1 implements scrypt password hashing (N=32768, r=8, p=1), random opaque sessions stored as SHA-256 hashes, HttpOnly/SameSite cookies, HTTPS-dependent Secure cookies, strict Origin and session-bound CSRF checks, role/scope service checks, bounded JSON bodies and account/global sign-in throttling. User access changes revoke sessions. SQL grants and a trigger protect audit history. Integration/browser tests cover the implemented boundaries; no security certification is claimed.

Phase 2 adds bounded multipart input, extension/MIME/signature and parser validation, private generated storage keys, PDF active-content rejection, reencoded image previews, scoped authenticated file reads, upload rate limits, idempotency and immutable document history. File-access audit must succeed before bytes are returned. Failed upload database transactions remove their newly written files.

Production gaps include SSO/MFA, password reset/rotation workflow, managed secret injection, a reviewed full CSP, proxy/network rate limits, antivirus/quarantine, OS-level parser isolation, crash-orphan reconciliation, retention/cleanup jobs and infrastructure encryption/backup verification. Worker-thread heap/time limits are not a complete native-memory or malware sandbox. Model safeguards below remain future work. Keep MIGRATION_DATABASE_URL out of the web runtime environment and provision the runtime account separately.

## Next.js trust boundaries

Authenticate users through a maintained session/authentication implementation; hash passwords with an appropriate maintained KDF. Store hashed opaque session tokens, enforce expiry/revocation and rotate credentials. Cookies are HttpOnly, Secure with HTTPS and SameSite; mutations verify CSRF/origin as applicable.

Route visibility is not authorization. Module services enforce role and department/jurisdiction access for HTTP routes, Server Components, background work and exports. Sensitive responses use private/no-store policies and must not leak through shared rendering caches. Pass safe DTOs to Client Components; never serialize database rows with hashes, secrets or unnecessary PII.

Mark server entrypoints server-only and separate client contract exports. Keep DATABASE_URL, MODEL_API_KEY, session secrets and storage credentials out of NEXT_PUBLIC variables. Restrict allowed origins and rate-limit login/uploads/model requests/export.

## File and model safety

Validate extension, file signatures, size, decoded page/pixel limits and corruption; use generated object keys and private storage. Quarantine/scan potentially malicious uploads according to deployment policy before unsafe parsing. Production scanning behavior requires verification. Prevent traversal, unsafe embedded content and active HTML previews.

The model API is called only from the server/worker over authenticated HTTPS. Read-only signed file URLs are short-lived and redacted from logs. Allowlist model/storage destinations and block arbitrary URL fetches/SSRF. Model output is untrusted: validate version, identity, input hash, fields, types, evidence and output size. Documents cannot override instructions or cause tool execution.

The model has no application DB credential or approval authority. Real data transfer requires an approved processing arrangement and retention policy. Independently deployed does not mean publicly accessible without authentication.

## Record integrity and audit

Use parameterized SQL and safe ORM operations, escaped rendering and validated inputs. Separate operator and approver. Require revision checks and transactional immutable approval/audit. Log login/security events, uploads, processing, validation, duplicate resolution, field decisions/corrections, approval, GIS links, exports and role/settings changes.

Restrict audit reading and mutation privileges. Old/new values and evaluation datasets contain sensitive information; minimize and protect them. Encrypt transport and configure storage/backups at rest; use least-privilege runtime DB roles. Avoid secrets/full document text in ordinary logs.

## Required security checks

Cross-scope direct IDs, signed-file issuance, search/count leakage, frontend bundle secrets, stale approval, CSRF, SQL injection, stored XSS, malicious files, forged/oversized model results, arbitrary result URLs, duplicate export and revoked user sessions. Verify private-cache behavior under two users in different scopes.

Production decisions still required: SSO/MFA policy, authorized jurisdictions, model processor/hosting, retention/deletion/legal holds, recovery objectives and incident ownership. No legal or production-readiness claim is made by this design.
