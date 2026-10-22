# Security architecture

Security is enforced in **three independent layers**, so a bug in one layer does not expose data:

1. **Database (authoritative)** — PostgreSQL Row Level Security on every table and storage bucket.
2. **Server** — every server action re-checks the session, role and supplier scope, and validates input with zod.
3. **Edge / browser** — middleware session + MFA enforcement, strict security headers.

## Identity & access

| Control | Implementation |
| --- | --- |
| Authentication | Supabase Auth (bcrypt-hashed passwords, JWT sessions in HttpOnly cookies, PKCE). Public sign-up disabled — only admins create accounts. |
| Multi-factor | TOTP mandatory for every account (`MFA_REQUIRED=true`); middleware blocks every page until the session is AAL2. |
| Password policy | ≥ 12 chars, upper/lower/number/symbol, rejects common words and the user's e-mail (`lib/password.ts`); temporary passwords are random (16 chars, CSPRNG) and must be changed at first sign-in. |
| Brute force | Supabase Auth rate limits + app limiter (10 attempts / 15 min per IP, 5 per e-mail). |
| Roles | `admin` (Fanatics QC admin), `reviewer` (Fanatics technician), `supplier` (mill user, bound to exactly one supplier). |
| Least privilege | Suppliers can create fabrics/lots/results/evidence **only for their own company**; they can never change a status or decision. Only admins manage users, suppliers, requirements, API keys and the audit log. |
| Deprovisioning | Disabling a user sets `active=false` (RLS denies everything) **and** bans the auth account so refresh tokens stop working. |

## Data isolation (multi-tenant)

- `supplier_id` on child rows (results, evidence, events) is **set by database triggers** from the lot — clients cannot spoof it.
- Lots created by suppliers are forced to `status = submitted` with no decision fields (trigger `lots_before_insert`).
- Storage paths must start with the supplier id; the storage policy and a trigger both check it.
- Requests for another supplier's records return **404** (no information about existence).
- Verified with an automated RLS test (`supabase/tests/`): supplier A cannot read, insert or upload into supplier B; cannot approve its own lot; the audit log cannot be modified even by the `postgres` role.

## Files & evidence

- Private buckets (`evidence`, `logos`); files are served with **signed URLs valid for 10 minutes**.
- Upload validation by **magic bytes** (JPEG/PNG/WEBP/PDF), CSV text check and spectro extensions; max 10 MB; SVG uploads refused (XSS vector).
- Every file gets a **SHA-256 fingerprint** stored in the database (chain of custody for lab evidence).

## Audit trail

- `audit_log` records every insert/update/delete on business tables (who, when, changed columns old → new). Secrets (`key_hash`) are stripped.
- **Append-only**: an `UPDATE/DELETE` trigger raises an error, and no RLS policy allows writes.
- **Tamper-evident**: each row stores `row_hash = sha256(prev_hash | row)`; `select verify_audit_chain();` (admin) returns the first broken id or `null` if intact.
- Lot-level timeline (`lot_events`) for the business history; CSV export for auditors.

## Application security (OWASP Top 10 / ASVS L2 highlights)

| Risk | Mitigation |
| --- | --- |
| A01 Broken access control | RLS + server checks + middleware; IDs are UUIDs; 404 on foreign records. |
| A02 Crypto failures | TLS only (HSTS preload), secrets only in server env vars, API keys stored as SHA-256 hashes, shown once. |
| A03 Injection | Parameterised queries (PostgREST), zod validation, React escaping, CSV formula-injection neutralised. |
| A04 Insecure design | Decision engine is pure & unit-tested; separation of duties (suppliers submit, Fanatics decides). |
| A05 Misconfiguration | CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, `poweredByHeader: false`, robots noindex. |
| A07 Auth failures | MFA, rate limits, session refresh in middleware, ban on disable. |
| A08 Integrity | Hash-chained audit log, evidence fingerprints, lockfile, protected `main` branch. |
| A09 Logging | Audit log + Supabase Auth logs + Vercel runtime logs. |
| A10 SSRF | The server never fetches user-supplied URLs. |

## Secrets

| Secret | Where it lives |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (server only). Used for: creating/disabling accounts, sending notifications to other users, API-key verification, BI snapshot. |
| `RESEND_API_KEY` | Vercel env. |
| API keys (`fxqc_…`) | Only the SHA-256 hash in the database. |
| `bi_reader` password | Set by the DBA; read-only on schema `bi`. |

Rotate the service-role key and API keys at least yearly and immediately when a person with access leaves.

## Recommended for production at Fanatics

- SSO (Okta / Azure AD SAML) for Fanatics staff — Supabase supports SAML on the Pro plan.
- Supabase Pro: Point-in-Time Recovery, daily backups retained 7+ days, network restrictions for direct DB access.
- Vercel Firewall / WAF rules (rate-limit `/login`, geo rules if needed).
- Annual third-party penetration test; Dependabot alerts on the GitHub repository.
- Data retention: keep lots and evidence 7 years (typical QA record retention), then archive.

## Incident response (summary)

1. **Contain** — disable the affected users (Users & access), revoke API keys, rotate the service-role key in Supabase and update Vercel.
2. **Assess** — run `select verify_audit_chain();`, export the audit log, review Supabase Auth logs and Vercel logs.
3. **Eradicate & recover** — patch, redeploy (Vercel instant rollback available), restore from backup / PITR if data was altered.
4. **Notify** — Fanatics security team within the contractual window; document timeline and root cause.

## Security testing performed on this MVP

- Unit tests: decision engine, ΔE conversion, password policy, CSV injection (`npm test`).
- RLS isolation test on PostgreSQL 16 (`supabase/tests/`).
- End-to-end test (Playwright): supplier isolation (404 on another supplier's lot, 403 on audit export, redirect from admin pages), decision flow, notifications, API key auth (valid → 200, invalid → 401).
