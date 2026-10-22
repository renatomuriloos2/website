# Power BI / Excel

Two read-only options. Both are independent of the web UI permissions and never allow writes.

## Option A — REST API (recommended, works from anywhere)

1. In the app: **BI & API → Generate key** (admin only). Copy the `fxqc_…` key (shown once).
2. Power BI Desktop → **Get data → Web → Advanced**:
   - URL parts: `https://YOUR-APP/api/v1/lots?format=csv`
   - HTTP request header: `Authorization` = `Bearer fxqc_…`
3. Repeat for the other datasets and relate them by `lot_ref` / `supplier_code`:

| Dataset | Grain |
| --- | --- |
| `/api/v1/kpis` | one row snapshot |
| `/api/v1/suppliers` | one row per supplier (scorecard: RFT %, approvals, cycle time) |
| `/api/v1/lots` | one row per lot (+ `verdict_<method>` columns) |
| `/api/v1/colors` | one row per lot × color (max safe temp, verdict per method) |
| `/api/v1/results` | one row per reading (value, min, max, pass) |
| `/api/v1/protocol` | test methods and default minimums |

Use `?format=json` for Power Query JSON parsing. Schedule refresh in Power BI Service with the
same header (store the key in the data-source credentials). Rate limit: 120 requests/min per IP.

## Option B — Direct PostgreSQL (schema `bi`)

1. Supabase SQL Editor: `alter role bi_reader with password 'a-long-random-password';`
2. Supabase → Project Settings → Database → connection info (use the **Session pooler**
   host; user is `bi_reader.<project-ref>`).
3. Power BI → **Get data → PostgreSQL database** → server `host:5432`, database `postgres`.
4. Select the views: `bi.lots`, `bi.test_readings`, `bi.supplier_scorecard`, `bi.suppliers`, `bi.fabrics`.

`bi_reader` can only `SELECT` from schema `bi` (no base tables, no PII beyond supplier names).

## Suggested report pages

1. **Executive** — KPI cards (RFT, approval rate, concessions, cycle time), monthly outcome stacked bars.
2. **Supplier scorecard** — table + RFT trend per supplier; drill-through to lots.
3. **Decoration readiness** — matrix supplier × method (% approved/conditional).
4. **Failure analysis** — Pareto of failing tests (`bi.test_readings where pass = false`) by fiber and color.
5. **Temperature** — distribution of max safe temperature by fiber / color.
