# Step-by-step setup — new, isolated accounts and go-live

Goal: the Fanatics MVP lives in its **own accounts**, fully separate from any personal or other
client accounts (GitHub, Supabase, Vercel). You create a new "account kit" under a new e-mail,
deploy, present it to Fanatics, and later **transfer ownership** to Fanatics IT
(see [HANDOFF.md](HANDOFF.md)).

Estimated time: 45–60 min. Every service starts on a free plan.

---

## 0. See the prototype first (no accounts needed)

```bash
cd fanatics-qc
npm install
npm run dev
```

Open http://localhost:3000 → one-click demo logins (Digna Julia Herrera – QC admin, Gabriel –
Fanatics technician, mill users). All results are **synthetic**.

---

## 1. Project e-mail

1. Create a dedicated e-mail, e.g. `fanatics.qclab@gmail.com` (better: an address on your
   company domain, e.g. `qclab@yourcompany.com`).
2. Turn on **2-step verification** for it.
3. Store the password in a password manager (1Password, Bitwarden). **Every** account below is
   created with this e-mail so nothing mixes with your own accounts.

> Tip: use a **separate Chrome profile** for this e-mail so you never sign in to your personal
> accounts by mistake.

## 2. GitHub (new account + repository)

1. Sign up at https://github.com/signup with the new e-mail (e.g. user `fanatics-qclab`).
2. Enable 2FA: Settings → Password and authentication → Two-factor authentication.
3. The code lives in the private repository `fanatics-qc-lab`. To work on it locally: `git clone https://github.com/<owner>/fanatics-qc-lab.git`.
4. Add collaborators only as needed (Settings → Collaborators).
5. Protect `main`: Settings → Branches → Add rule → "Require a pull request before merging".

## 3. Supabase (database, auth, files)

1. Sign in at https://supabase.com **with the new GitHub account** (or the new e-mail).
2. Create a new **Organization**: `Fanatics QC Lab`.
3. **New project**: `fanatics-qc-lab`, strong database password (save it), region
   **East US (North Virginia)**.
4. **SQL Editor** → paste and run, in this order:
   1. `supabase/schema.sql` — tables, row-level security, audit trail, storage, BI views.
   2. `supabase/seed.sql` — protocol (23 test methods, 16 decoration methods, fiber requirements).
   3. `supabase/suppliers.sql` — the mills: Pride Performance Fabrics, Texpasa, Zumitex, Tegra.
5. **Authentication → Sign In / Providers → Email**: keep Email on and **turn off "Allow new users
   to sign up"** (only admins create accounts).
6. **Authentication → Multi-Factor**: enable **TOTP (App Authenticator)**.
7. **Authentication → Attack Protection / Passwords**: minimum length **12**, require upper/lower
   case, digits and symbols; enable **Leaked password protection** if your plan allows it.
8. **Authentication → URL Configuration**: Site URL = your Vercel URL (step 5 — come back
   afterwards) and add `https://YOUR-DOMAIN/**` to Redirect URLs.
9. **First administrator**: Authentication → Users → *Add user* → *Create new user* (Digna Julia
   Herrera's e-mail, or yours as temporary admin; tick *Auto Confirm User*). Then edit the e-mail
   in `supabase/first-admin.sql` and run it in the SQL Editor.
10. **Project Settings → API**: copy `Project URL`, `anon public key` and `service_role key`
    (the last one is secret — never in code, never in a `NEXT_PUBLIC_` variable).

## 4. Resend (notification e-mails) — optional, recommended

1. https://resend.com → sign up with the new e-mail.
2. **Domains → Add domain** (e.g. `qclab.yourcompany.com`) and add the DNS records shown.
   Until the domain is verified, Resend only delivers to the account owner.
3. **API Keys → Create** (*Sending access*). Save the key.

## 5. Vercel (hosting)

1. https://vercel.com/signup → **Continue with GitHub** using the **new** GitHub account.
2. **Add New → Project → Import** `fanatics-qc-lab` (Next.js is detected automatically).
3. **Environment Variables** (Production and Preview):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**sensitive**) |
   | `NEXT_PUBLIC_APP_URL` | `https://fanatics-qc-lab.vercel.app` (or your domain) |
   | `RESEND_API_KEY` | Resend key |
   | `RESEND_FROM_EMAIL` | `qc-lab@your-verified-domain` |
   | `MFA_REQUIRED` | `true` |

   To publish **only the demo** (no database) for the presentation, create a second Vercel
   project from the same repository with just `DEMO_MODE=true`.
4. **Deploy**, then go back to step 3.8 and set the final URL in Supabase.
5. Enable 2FA on Vercel: Account Settings → Authentication.
6. (Optional) **Settings → Domains**: e.g. `qclab.yourcompany.com` or a Fanatics subdomain.
7. (Recommended) **Settings → Deployment Protection**: keep *Vercel Authentication* on preview deployments.

## 6. First sign-in and initial data

1. Sign in at `/login` with the admin. The app forces **2FA enrolment** (scan the QR code with
   Google Authenticator / Microsoft Authenticator).
2. **Suppliers** → open each mill → **Edit** → upload the official **logo** and fill country/city.
3. **Users & access** → create:
   - **Gabriel** — role *Fanatics technician* (test methods / technical review);
   - one user per mill e-mail, role *Supplier*, linked to the right mill.
   The temporary password is shown **once**: send it through a different channel than e-mail
   (Teams/WhatsApp). On first sign-in the user changes it and enrols 2FA.
4. **Protocols → Requirements matrix**: review the minimums per fiber with the Fanatics team.
5. **BI & API**: create a key for Power BI (see [POWER_BI.md](POWER_BI.md)).

## 7. Final checklist

- [ ] 2FA on every new account (e-mail, GitHub, Supabase, Vercel, Resend).
- [ ] `service_role key` only in Vercel (never in GitHub).
- [ ] Public sign-ups disabled in Supabase.
- [ ] TOTP enabled and `MFA_REQUIRED=true`.
- [ ] Mill logos and data checked ("TBC" fields filled).
- [ ] Backups: Supabase runs daily backups; on Pro enable *Point-in-Time Recovery*.
- [ ] `bi_reader` password set if Power BI connects directly to Postgres.

## 8. Push notifications (optional, 3 min)

1. On any computer with Node: `npx web-push generate-vapid-keys` (or ask your Claude to generate them).
2. Vercel → Settings → Environment Variables: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public key),
   `VAPID_PRIVATE_KEY` (private key, sensitive), `VAPID_SUBJECT` = `mailto:your@email` → Redeploy.
3. Each user: **Settings → Mobile app & push notifications → Enable on this device**.
   On iPhone, first install the app (Share → Add to Home Screen).
