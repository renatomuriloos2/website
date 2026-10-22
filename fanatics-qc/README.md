# Fanatics Decoration QC Lab

**Fabric decoration-readiness portal** for Fanatics and its mills. Suppliers upload lab
results and evidence for each fabric lot (per color); the decision engine applies the Fanatics
protocol (AATCC · ISO · ASTM + Fanatics heat ladder) and tells QC whether the lot can run
through each decoration process (screen print, sublimation, spot sublimation, heat transfer,
HTV, tackle twill, DTF, DTG, embroidery, pad print, labels, patches, silicone, foil), at what
**maximum temperature** and under which **mandatory conditions** (low-cure ink, bleed blocker,
poly white, blocker adhesive…). Fanatics QC reviews, decides and tracks everything on a
Kanban board, dashboards, printable dossiers and a BI API for Power BI.

> English UI with Spanish toggle (EN/ES). Mobile-friendly and installable on a phone (PWA).

## Try it in 1 minute (demo mode — no accounts needed)

```bash
cd fanatics-qc
npm install
npm run dev          # http://localhost:3000
```

With no Supabase variables configured, the app runs in **demo mode**: one-click logins
(QC administrator, Fanatics technician, supplier users) and **synthetic** sample data for
4 mills — the results are generated for the prototype and are *not* real supplier performance.

## Features

| Area | What it does |
| --- | --- |
| **Protocol library** | 23 test methods (AATCC 61/8/15/107/16.3/135/179/133/163/81/112, ISO 105-P01, ASTM D3512/D3939/D3786/D3359/D2594/D903, CPSIA, Fanatics heat ladder FX-DM-01, color-blocking FX-CB-03…), 16 decoration methods, 8 fiber families, editable minimums per fiber. |
| **Decision engine** | Pass/fail per reading, **Max Safe Decoration Temperature** from the dye-migration ladder, verdict per decoration method (approved / conditional / not approved) with mandatory conditions, engine-suggested lot status. ΔE (spectrophotometer) → gray-scale grade conversion (AATCC EP7/EP12). |
| **Per-color testing** | Each lot lists its colorways; color-sensitive tests are recorded per color; the lot takes the **worst color**. Color × method matrix in the dossier. |
| **Lots & dossiers** | Submission form, results entry, evidence upload (photos from the phone camera, PDF reports, spectro files — SHA-256 fingerprinted), timeline, printable A4/PDF dossier with placements sheet. |
| **Lot board (Scrum/Kanban)** | Submitted → In review → Retest → On hold → Approved / Approved w/ concession / Rejected. Drag & drop. |
| **Dashboards** | Right First Time, approval rate, concessions, cycle time, monthly outcomes, supplier scorecard, top failing tests (Pareto), decoration readiness matrix, fiber mix. |
| **Suppliers & fabrics** | Mill database with logos, fabric library with photos and lot history. |
| **Users & access** | Admin creates staff and supplier accounts; suppliers only see their own company (enforced by Postgres RLS). |
| **Notifications** | In-app + e-mail (Resend): new submission → Fanatics QC; decision / retest → supplier. |
| **Security** | Mandatory 2FA (TOTP), password policy, RLS, private storage with signed URLs, hash-chained immutable audit log, CSP/HSTS headers, rate limiting, upload validation. See [`docs/SECURITY.md`](docs/SECURITY.md). |
| **Sample data** | Admin → Settings → *Load sample data* (or from the empty dashboard): 4 mills, 16 fabrics, ~60 lots with per-color results, decisions and retests to explore the full potential. Flagged as sample and removable in one click. |
| **BI & integrations** | Read-only REST API (JSON/CSV) with API keys, `bi` SQL schema + `bi_reader` role for Power BI, read-only **MCP server** for AI agents. |

## Stack

Next.js 14 (App Router, Server Actions) · TypeScript · Tailwind · Recharts · Supabase
(Postgres + Auth + Storage) · Resend · Vercel. Everything is portable: Supabase is plain
Postgres and the app is a standard Node app (Vercel, Azure App Service, AWS, Docker).

## Project layout

```
app/                 Next.js routes (dashboard, board, lots, dossier, fabrics, suppliers, protocols, users, audit, api/v1…)
components/          UI (dossier blocks, charts, forms, Kanban)
lib/domain/          catalog.ts (protocol) · engine.ts (decision engine) · types.ts
lib/data/            repository interface + demo (in-memory) and Supabase implementations
lib/actions/         server actions (validated with zod)
supabase/            schema.sql (tables, RLS, audit, storage, BI views) · seed.sql (protocol) · suppliers.sql · first-admin.sql · tests/
mcp/                 read-only MCP server
docs/                setup, security, protocol, Power BI, MCP, handoff
tests/               unit tests (engine, CSV, password policy)
```

## Commands

```bash
npm run dev        # development
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # unit tests
npx tsx scripts/generate-seed.ts   # regenerate supabase/seed.sql after editing lib/domain/catalog.ts
```

## Documentation

- **[docs/SETUP.md](docs/SETUP.md)** (EN) · **[docs/SETUP_ES.md](docs/SETUP_ES.md)** (ES) — step-by-step: new isolated accounts (e-mail, GitHub, Supabase, Vercel, Resend) and go-live.
- [docs/SECURITY.md](docs/SECURITY.md) — security architecture, controls, audit, incident response.
- [docs/PROTOCOLS.md](docs/PROTOCOLS.md) — the QC protocol and the decision rules.
- [docs/POWER_BI.md](docs/POWER_BI.md) — connecting Power BI / Excel.
- [docs/MCP.md](docs/MCP.md) — using the MCP server with Claude or other agents.
- [docs/HANDOFF.md](docs/HANDOFF.md) — transferring ownership to Fanatics IT.
