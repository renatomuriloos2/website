# Handoff to Fanatics IT

The MVP is built so that Fanatics IT can take full ownership at any time. The current project
owner can stay as a **temporary admin** during the transition and then step out.

## 1. Transfer the accounts

| Service | How to transfer |
| --- | --- |
| GitHub | Repository → Settings → *Transfer ownership* → Fanatics GitHub organization (or add Fanatics engineers as admins first). |
| Supabase | Organization → Team → invite Fanatics owners → make them **Owner** → remove yourself. Or Project → Settings → *Transfer project* to a Fanatics organization. |
| Vercel | Project → Settings → *Transfer* to the Fanatics team (or re-import the transferred GitHub repo in Fanatics' Vercel). Re-enter env vars if needed. |
| Resend | Add Fanatics members, or replace with Fanatics' corporate SMTP / SendGrid (`lib/notify.ts`). |
| Domain | Point a Fanatics subdomain (e.g. `qclab.fanatics.com`) in Vercel → Domains. |

## 2. After transfer — rotate everything

1. Supabase → API → **rotate the service-role key** (and JWT secret if required by policy) → update Vercel.
2. Revoke all API keys in **BI & API** and issue new ones.
3. Change the `bi_reader` password.
4. Disable any temporary admin users in **Users & access**.
5. Run `select verify_audit_chain();` and export the audit log as a baseline.

## 3. What Fanatics IT gets

- Source code (TypeScript, MIT-style internal ownership), tests and lint config.
- `supabase/schema.sql` — full DDL with RLS policies, triggers, BI views and roles.
- `lib/domain/catalog.ts` — the protocol in one file (edit + `npx tsx scripts/generate-seed.ts`).
- Security documentation (`docs/SECURITY.md`) for their review / pentest.
- Read-only BI API, `bi` SQL schema and MCP server for integrations.

## 4. Suggested roadmap

1. SSO (Okta/Azure AD) for Fanatics staff.
2. Lab integrations: import Datacolor/X-Rite spectro files (CXF/QTX) automatically into ΔE readings.
3. Native push for the store app (Firebase Cloud Messaging / APNs via `@capacitor/push-notifications`).
4. Additional languages if new supplier regions require them (dictionary in `lib/i18n/dict.ts`).
