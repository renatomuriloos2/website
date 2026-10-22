# CLAUDE.md — Fanatics Decoration QC Lab

Guidance for Claude (and any engineer) working in this repository.

## What this is

A fabric **decoration-readiness portal** for Fanatics QC and its mills. Suppliers submit
fabric lots (per color) with lab results and evidence; a decision engine applies the Fanatics
protocol (AATCC / ISO / ASTM + Fanatics heat ladder) and returns, per decoration method
(screen print, sublimation, spot sublimation, heat transfer, HTV, tackle twill, DTF, DTG,
embroidery, pad print, labels, patches, silicone, foil), a verdict, a **max safe decoration
temperature** and mandatory conditions. Fanatics staff review and decide on a Kanban board.

- Owner / QC administrator: **Digna Julia Herrera**. Fanatics technician (test methods): **Gabriel**.
- Mills: Pride Performance Fabrics, Texpasa, Zumitex, Tegra.
- UI languages: **English (default) and Spanish only.** Every user-facing string goes in
  `lib/i18n/dict.ts` in both `en` and `es` (the `Dict` type enforces the same keys). Do not add other languages.

## Stack

Next.js 14 App Router + Server Actions · TypeScript (strict) · Tailwind · Recharts ·
Supabase (Postgres, Auth with TOTP MFA, private Storage) · Resend (e-mail) · Vercel.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000 (demo mode if Supabase env vars are missing)
npm run typecheck
npm run lint
npm test             # node:test via tsx — engine, garment trials, CAPA, CSV, password policy
npm run build
npx tsx scripts/generate-seed.ts   # REQUIRED after editing lib/domain/catalog.ts → rewrites supabase/seed.sql
```

Before every commit: `npm run typecheck && npm run lint && npm test && npm run build`.

## Two runtime modes

- **Demo mode** (no `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, or `DEMO_MODE=true`): in-memory
  synthetic data from `lib/demo/seed.ts`, one-click logins via the `fx_demo_uid` cookie. Data
  resets on cold start. The public demo link runs this way.
- **Supabase mode**: real auth (MFA mandatory when `MFA_REQUIRED=true`), RLS, storage.
- **Mode toggle**: when Supabase is configured, the login screen offers *Sign in* (real) or *Explore demo*
  (cookie `fx_mode=demo`, in-memory data, never touches the database); a banner offers *Exit demo*.
  Disable with `DEMO_SWITCH=false`. Logic: `lib/env.ts` (`isDemo`, `canSwitchMode`) and `middleware.ts`.

Both implement the same `Repo` interface (`lib/data/repo.ts`): `lib/data/demo.ts` and
`lib/data/supabase.ts`. **Any new data operation must be added to the interface and to both
implementations.** Pages call `getRepo()` and never talk to Supabase directly.

## Layout

```
app/(app)/…          authenticated pages (dashboard, board, lots, fabrics, suppliers, protocols, users, audit, integrations, settings)
app/dossier/[id]     printable A4 dossier (outside the app shell)
app/api/v1/[dataset] read-only BI API (Bearer fxqc_… API keys, JSON/CSV)
app/api/export       session-scoped CSV exports
components/          UI kit (ui.tsx), Dossier blocks, Charts, forms, Kanban
lib/domain/          catalog.ts (protocol = single source of truth) · engine.ts (pure decision engine) · types.ts
lib/data/            Repo interface + demo + supabase implementations
lib/actions/         server actions — always zod-validate and call requireUser()
lib/analytics.ts     KPIs (RFT, approval rate, cycle time, Pareto, readiness matrix)
lib/bi.ts            flat datasets for Power BI / MCP
lib/sample.ts        "Load / Remove sample data" (admin)
supabase/            schema.sql (tables, RLS, triggers, audit chain, storage, bi schema) · seed.sql · suppliers.sql · first-admin.sql · tests/
mcp/                 read-only MCP server wrapping /api/v1
docs/                SETUP(_ES), SECURITY, PROTOCOLS, POWER_BI, MCP, HANDOFF
```

## Domain rules (do not break)

- Grades are 1–5 in half steps (5 = no change/staining). Spectro ΔE converts to grade via `deltaEToGrade` (AATCC EP7/EP12).
- Heat ladder `dye_migration` → `maxSafeTempC` = highest continuous passing temperature.
- Per method: pass at process temp → OK; pass only ≥ low-cure temp → conditional (`max_temp`, `low_cure_ink`…);
  staining ≥ min−1 below that → conditional with the method's `bleedFixes`; else fail (critical → rejected).
- Lots have `colors[]`; shade-dependent results carry `colorId`; `colorId = null` applies to all colors.
  `evaluateLotColors` evaluates each color and the **lot takes the worst color**. Use it (not `evaluateLot`) for lots.
- Minimums per fiber come from `requirements` (DB) overriding catalog defaults (`specFor`).
- Staff (admin/reviewer) decide; suppliers only submit. Overrides per method are allowed for staff and audited.

## Phase 2 features

- **Garment wash trials** (`garment_trials`, `GarmentTrial`): before/after photos are evidence rows
  (`kind = garment_before | garment_after`). `evaluateGarmentTrial` + `applyTrials` inside
  `evaluateLotColors(…, trials)` downgrade the method verdict. Always pass the lot's trials.
- **CAPA** (`capas`, `lib/domain/capa.ts`): pure state machine `capaTransition` used by both repos.
  Automation lives in `lib/capa-flow.ts` (server-only, NOT a "use server" file): open on rejected/retest,
  link retest lot, close when the retest is approved. DB trigger `capa_supplier_guard` limits what suppliers can change.
- **Push**: `public/sw.js` (push + offline page), `lib/push.ts` (VAPID via `web-push`), subscriptions in
  `push_subscriptions` (RLS: own rows). `notify()` sends in-app + push + e-mail.
- **Mobile**: PWA manifest + icons in `public/`; Capacitor wrapper in `mobile/`.

## Security rules (non-negotiable)

- RLS stays enabled on every table; supplier isolation is enforced in SQL (`can_see_supplier`, triggers that
  derive `supplier_id`). Server code must also call `assertSupplierScope` / `assertStaff` / `assertAdmin`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (`lib/supabase/admin.ts`); never import it in client code,
  never prefix with `NEXT_PUBLIC_`, never commit `.env*` files.
- `audit_log` is append-only and hash-chained — never add update/delete paths.
- Uploads go through `lib/upload.ts` (magic-byte check, 10 MB, SHA-256). No SVG uploads.
- Keep the CSP/HSTS headers in `next.config.mjs`. Return 404 (not 403) for other suppliers' records.
- Any schema change: edit `supabase/schema.sql` idempotently (`if not exists`, `drop policy if exists`)
  and validate it on a scratch Postgres before applying to the live project.

## Current deployment

- GitHub: `djherreralopez95-cmyk/fanatics-qc-lab` (main).
- Vercel: `https://fanatics-qc-lab.vercel.app`. With the Supabase env vars it runs the real system and still
  offers the demo through the login toggle.
- Supabase project ref: `sncoqimwajlzxqikcghj` (owner: Digna's account). Setup steps: `docs/SETUP.md` §3.

## Next steps (backlog)

1. Apply `supabase/schema.sql`, `seed.sql`, `suppliers.sql` to the Supabase project; enable TOTP MFA;
   disable public sign-ups; create the first admin (`first-admin.sql`).
2. Second Vercel project with the Supabase env vars (see `.env.example`); set Supabase Site URL / redirect URLs.
3. Upload official mill logos (Suppliers → Edit) and fill the "TBC" locations.
4. Validate default minimums with Fanatics QC (Protocols → Requirements matrix).
5. Resend domain for e-mail notifications; Power BI connection (`docs/POWER_BI.md`).
