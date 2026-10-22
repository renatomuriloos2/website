# Fanatics fabric decoration-readiness protocol

The protocol lives in `lib/domain/catalog.ts` (single source of truth) and is mirrored into
the database by `supabase/seed.sql`. Minimums per fiber can be tuned by admins in
**Protocols → Requirements matrix**; every change is audited.

> The default values are industry-typical starting points (retail / licensed-apparel
> buyers). Fanatics QC should validate them against its own vendor manual before go-live.

## 1. What a supplier submits per lot

- Fabric (article, fiber family, composition, construction, weight, dye class, finish, photo).
- Lot / dye-lot number, PO, program/league, garment type, testing lab.
- **Colors tested** — every colorway of the lot (name, shade, Pantone/standard).
- **Decoration methods** the lot must qualify for.
- Results per test (and per color for shade-dependent tests) + evidence: specimen photos,
  gray-scale assessments, lab PDF, spectrophotometer exports.

## 2. Rating

- Gray scales **1–5 in half steps** (5 = no change / no staining) — AATCC EP1 (color change)
  and EP2 (staining); multifiber DW (acetate, cotton, nylon, polyester, acrylic, wool).
- **Spectrophotometer**: enter ΔE; the grade is computed with the AATCC EP7/EP12 nominal ΔE
  table (Protocols → Rating scales).
- Numeric tests (shrinkage %, peel N/25 mm, burst kPa, pH, ppm) compare against min/max.

## 3. Test methods

| Category | Code | Test |
| --- | --- | --- |
| Heat & migration | **FX-DM-01** | Dye-migration heat ladder 130–210 °C, white low-bleed print, 24 h at 60 °C post-conditioning |
| | ISO 105-P01 | Dry heat / sublimation fastness 180–210 °C |
| | AATCC 133 | Hot pressing (dry/damp/wet) |
| | AATCC 163 | Dye transfer in storage (hot-stacking simulation) |
| Colorfastness | AATCC 61-2A | Laundering, accelerated (multifiber) |
| | AATCC 8 | Crocking dry/wet |
| | AATCC 15 | Perspiration |
| | AATCC 107 | Water |
| | AATCC 16.3 | Light, 20 AFU |
| | **FX-CB-03** | **Color-blocking bleed** — each color sewn to the adjacent lighter color / white trim, laundered, staining rated |
| Decoration performance | ASTM D3359-B | Print adhesion (cross-hatch) |
| | FX-WD-25 | Decoration wash durability, 25 cycles |
| | ASTM D2594-P | Print stretch & recovery |
| | ASTM D903-T | Peel strength of heat-applied decoration |
| | FX-PM-02 | Press marks / glazing / scorch |
| Physical | AATCC 135 · 179 · ASTM D3512 · D3939 · D3786 | Shrinkage, skew, pilling, snagging, burst |
| Shade | AATCC EP6 / 173 | ΔE CMC (2:1) vs approved standard |
| Chemical | AATCC 81 · 112 · CPSIA | pH, formaldehyde, lead in inks |

## 4. Decision rules (engine)

1. **Per reading**: pass if `value ≥ min` and/or `|value| ≤ max` (fiber-specific).
2. **Max Safe Decoration Temperature** = highest ladder temperature that still rates ≥ min,
   continuously from the lowest step.
3. **Per decoration method** (only if the fiber is compatible, else *not applicable*):
   - Ladder passes at the process temperature → OK.
   - Passes only at a lower temperature ≥ the method's low-cure temperature → **Conditional**:
     *max temp X °C* + low-cure ink/adhesive (+ no hot stacking).
   - Bleeds below the low-cure temperature but staining ≥ min − 1 → **Conditional** with the
     method's bleed fixes: grey/black **bleed blocker**, **low-bleed poly white**,
     **dye-blocking adhesive**, pretreatment, light shades only.
   - Otherwise the test fails: critical test → **Not approved**; non-critical → **Conditional (concession)**.
4. **Per color**: each color is evaluated with its own results plus the lot-level results;
   the lot takes the **worst color** (lowest max temperature, union of conditions).
5. **Lot suggestion**: critical base failure or any requested method not approved →
   *retest* (near miss ≤ 0.5 grade) or *rejected*; pending tests → *in review*; any
   conditional/concession → *approved with concession*; otherwise *approved*.
6. Fanatics staff can **override** any method verdict (with conditions, max temperature, notes);
   overrides are shown on the dossier and audited.

## 5. Temperature classes (shown in Protocols → Rating scales)

| Class | Max safe temp | Meaning |
| --- | --- | --- |
| A | ≥ 200 °C | Fit for full sublimation and every heat process |
| B | 170–190 °C | Standard plastisol / twill; spot sublimation restricted |
| C | 140–160 °C | Low-cure inks and adhesives + blocker only |
| D | < 140 °C | Not fit for heat decoration — embroidery / pad print |

## 6. KPIs

- **Right First Time (RFT)** = lots approved without concession on their first submission
  (not a retest) ÷ lots decided (approved, concession, rejected, retest).
- **Approval rate** = (approved + approved with concession) ÷ decided.
- **Cycle time** = decision date − submission date (days).

## 7. References used to build the protocol

Used as technical reference only (not as a visual model):

- MADE Laboratory (Fort Worth, TX) testing program with SanMar's Decorator Solutions team: fabric response to inks, pretreatments and curing; screen printing (plastisol, water-based, discharge), **heat tolerance**, DTG and embroidery testing; results feed the decoration recommendations published on product pages (e.g. SanMar *Decoration Spec Sheets* PC330 / DM108: low-cure poly inks, grey/black bleed blockers, avoid hot stacking, cooling stations, placement dimensions).
- Decorator industry practice for in-house dye-migration screening (press test at 160 °C / 320 °F, 30 s, plasticizer + white Pellon, AATCC Gray Scale for Staining) → test **FX-DM-00** and the interpretation table in Protocols → Rating scales.
- Fanatics product tiers (Authentic Pro, Premium, Breakaway, Swingman, Replica) and their decoration (sewn-down multi-layer tackle twill, heat-pressed crests, heat-applied twill, screen print, heat-sealed jock tag) → Protocols → Decoration methods.
- AATCC, ISO 105 and ASTM test methods listed in section 3; CPSIA for lead in coatings.
