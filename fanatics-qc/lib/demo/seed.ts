// Deterministic sample data for demo mode: 6 suppliers, 16 fabrics, ~50 lots
// over the last 9 months with realistic lab readings. Lot statuses are derived
// from the decision engine so dashboards, dossiers and the board are coherent.

import { BASE_TESTS, DECORATION_MAP, LADDER_TEMPS, TEST_MAP, ladderKey } from "@/lib/domain/catalog";
import { evaluateLotColors } from "@/lib/domain/engine";
import type {
  AppNotification,
  AppUser,
  AuditEntry,
  DecorationCode,
  Evidence,
  Fabric,
  FiberType,
  GarmentType,
  Lot,
  LotEvent,
  LotStatus,
  Readings,
  Supplier,
  TestResult,
} from "@/lib/domain/types";
import { specimenSvg, swatchSvg } from "./art";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoDb {
  suppliers: Supplier[];
  fabrics: Fabric[];
  lots: Lot[];
  results: TestResult[];
  evidence: Evidence[];
  events: LotEvent[];
  users: AppUser[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  requirements: { fiber: FiberType; testId: string; key: string; min: number | null; max: number | null }[];
  apiKeys: { id: string; name: string; prefix: string; hash: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }[];
  files: Map<string, string>;
}

// Fanatics mills used in the demo. Contact data are placeholders (".demo"
// domains) and every test result is SYNTHETIC — generated for the prototype,
// not real performance of these companies. Locations marked "TBC" must be
// confirmed by Fanatics. Logos live in /public/brand/suppliers/<code>.svg and
// can be replaced by the official artwork (or uploaded in Suppliers → Edit).
const SUPPLIERS: Omit<Supplier, "id" | "createdAt" | "logoUrl">[] = [
  { name: "Pride Performance Fabrics", code: "PRIDE", country: "TBC", city: "TBC", contactName: "Quality team", contactEmail: "quality@pride.demo", phone: "", status: "active", tier: "strategic" },
  { name: "Texpasa", code: "TEXPASA", country: "USA", city: "Charlotte, NC", contactName: "Quality team", contactEmail: "quality@texpasa.demo", phone: "", status: "active", tier: "strategic" },
  { name: "Zumitex", code: "ZUMITEX", country: "TBC", city: "TBC", contactName: "Quality team", contactEmail: "quality@zumitex.demo", phone: "", status: "active", tier: "approved" },
  { name: "Tegra", code: "TEGRA", country: "Honduras", city: "San Pedro Sula", contactName: "Quality team", contactEmail: "quality@tegra.demo", phone: "", status: "active", tier: "strategic" },
];
// Supplier quality: higher → better grades, later migration onset.
const QUALITY = [0.72, 0.8, 0.6, 0.76];

type FabricSeed = [number, string, string, FiberType, string, string, number, string, string, string, string];
const FABRICS: FabricSeed[] = [
  [0, "PPF-DK210", "Authentic Double-Knit", "polyester", "100% Polyester", "Double knit", 210, "Team Navy", "#14213D", "Disperse", "Moisture-wicking"],
  [1, "TXP-MI145", "Replica Mesh Interlock", "recycled_polyester", "100% Recycled Polyester", "Mesh interlock", 145, "Scarlet", "#C8102E", "Disperse", "Wicking + anti-odor"],
  [2, "ZMX-CV160", "CVC Fan Tee Jersey", "polycotton", "60% Cotton / 40% Polyester", "Single jersey", 160, "Black", "#111111", "Reactive / Disperse", "Enzyme wash"],
  [3, "TGR-PS230", "Compression Poly/Span", "poly_spandex", "88% Polyester / 12% Spandex", "Interlock", 230, "Royal Blue", "#1D4ED8", "Disperse", "Silicone soft"],
  [0, "PPF-CD150", "CDP Heather Performance", "cationic_polyester", "100% Cationic Polyester", "Single jersey", 150, "Heather Grey", "#8A8F98", "Cationic", "Wicking"],
  [1, "TXP-WH140", "Sublimation White Mesh", "polyester", "100% Polyester", "Mesh", 140, "Optic White", "#F4F4F2", "Optical brightener", "Heat-set 205 °C"],
  [2, "ZMX-PQ200", "Polo Piqué Performance", "polyester", "100% Polyester", "Piqué", 200, "Forest Green", "#1F5134", "Disperse", "Wicking"],
  [3, "TGR-TB145", "Tri-blend Vintage Tee", "triblend", "50% Poly / 25% Cotton / 25% Rayon", "Single jersey", 145, "Heather Maroon", "#6B2737", "Disperse / Reactive", "Garment-soft"],
  [0, "PPF-FL300", "Fan Fleece 80/20", "polycotton", "80% Cotton / 20% Polyester", "Fleece", 300, "Charcoal", "#36393F", "Reactive / Disperse", "Brushed"],
  [1, "TXP-PJ180", "Pima Ring-Spun Jersey", "cotton", "100% Pima Cotton", "Single jersey", 180, "Bright Orange", "#F26522", "Reactive", "Bio-polished"],
  [2, "ZMX-CJ200", "Combed Cotton Heavy Tee", "cotton", "100% Combed Cotton", "Single jersey", 200, "Black", "#0F0F10", "Reactive", "Softener"],
  [3, "TGR-DK220", "Authentic Jersey Body", "polyester", "100% Polyester", "Double knit", 220, "Cardinal Red", "#9B1B30", "Disperse", "Wicking"],
  [0, "PPF-NY190", "Training Nylon/Span", "nylon", "85% Nylon / 15% Spandex", "Interlock", 190, "Gold", "#C99700", "Acid", "Cool-touch"],
  [1, "TXP-MS130", "Practice Mesh", "polyester", "100% Polyester", "Mesh", 130, "Kelly Green", "#00843D", "Disperse", "None"],
  [2, "ZMX-RP160", "rPET Replica Body", "recycled_polyester", "100% Recycled Polyester", "Interlock", 160, "Midnight Navy", "#0B1F3A", "Disperse", "Wicking"],
  [3, "TGR-CD170", "CDP Two-tone Jersey", "cationic_polyester", "65% CDP / 35% Polyester", "Single jersey", 170, "Purple Heather", "#4B2E83", "Cationic / Disperse", "Wicking"],
];

// Team colorways a lot is tested in (the fabric's own shade is always first).
const TEAM_COLORS: [string, string, string][] = [
  ["Optic White", "#F4F4F2", "11-0601 TCX"],
  ["Team Red", "#C8102E", "19-1664 TCX"],
  ["Royal", "#1D4ED8", "19-3952 TCX"],
  ["Navy", "#14213D", "19-4024 TCX"],
  ["Black", "#111111", "19-0303 TCX"],
  ["Kelly Green", "#00843D", "17-6153 TCX"],
  ["Gold", "#C99700", "15-0953 TCX"],
  ["Purple", "#4B2E83", "19-3640 TCX"],
  ["Orange", "#F26522", "16-1462 TCX"],
  ["Silver Grey", "#A2AAAD", "14-4102 TCX"],
];

/** Tests whose result depends on the shade — recorded once per color. */
const COLOR_TESTS = new Set(["cf_laundering", "cf_crock", "cf_perspiration", "cf_water", "cf_light", "dye_migration", "sublimation_fastness", "color_blocking", "shade", "hot_pressing", "storage_transfer"]);

const PROGRAMS = ["NFL Replica Jersey", "NBA Swingman", "MLB Authentic", "NHL Breakaway", "MLS Replica", "NCAA Fan Tee", "F1 Team Tee", "Premier League Training", "WNBA Rebel", "Fanatics Branded Fleece"];

const METHODS_BY_FIBER: Record<FiberType, DecorationCode[][]> = {
  polyester: [["tackle_twill", "screen_plastisol", "heat_label"], ["sublimation", "heat_label"], ["htv", "heat_transfer"], ["spot_sublimation", "dtf"], ["tackle_twill", "embroidery", "patch"]],
  recycled_polyester: [["heat_transfer", "htv", "heat_label"], ["screen_plastisol", "patch"], ["dtf", "silicone_3d"]],
  cationic_polyester: [["screen_plastisol", "heat_label"], ["sublimation"], ["dtf", "htv"]],
  poly_spandex: [["screen_silicone", "heat_label"], ["silicone_3d", "dtf"], ["sublimation"]],
  nylon: [["screen_silicone", "htv"], ["pad_print", "embroidery"]],
  polycotton: [["screen_plastisol", "heat_label"], ["dtg", "dtf"], ["embroidery", "screen_plastisol"]],
  triblend: [["screen_waterbased", "pad_print"], ["dtg", "heat_transfer"]],
  cotton: [["screen_waterbased", "dtg"], ["screen_plastisol", "embroidery"], ["dtf", "pad_print"]],
};

/** Base temperature where dye migration starts, per fiber (°C). */
function migrationOnset(fiber: FiberType, hex: string, q: number, rnd: () => number): number {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  const darkPenalty = (1 - lum) * 25;
  const base: Record<FiberType, number> = {
    polyester: 178, recycled_polyester: 174, poly_spandex: 172, cationic_polyester: 196, nylon: 186, polycotton: 188, triblend: 190, cotton: 230,
  };
  return base[fiber] - darkPenalty + (q - 0.6) * 40 + (rnd() - 0.5) * 24;
}

const half = (x: number) => Math.max(1, Math.min(5, Math.round(x * 2) / 2));

function genReadings(testId: string, fiber: FiberType, hex: string, q: number, onset: number, rnd: () => number): Readings {
  const t = TEST_MAP[testId];
  const r: Readings = {};
  if (t.kind === "ladder") {
    for (const temp of t.ladderTemps ?? LADDER_TEMPS) {
      const local = testId === "sublimation_fastness" ? onset + 22 : onset;
      const g = temp < local ? (rnd() < 0.6 ? 5 : 4.5) : 4 - (temp - local) / 14 - rnd() * 0.4;
      r[ladderKey(temp)] = half(g);
    }
    return r;
  }
  if (t.kind === "numeric") {
    for (const s of t.readings) {
      switch (s.key) {
        case "length":
        case "width": {
          const lim = fiber === "cotton" ? 5 : fiber === "polycotton" || fiber === "triblend" ? 4 : 3;
          r[s.key] = -Math.round((lim * (0.3 + (1 - q) * 0.55) + rnd() * 0.9) * 10) / 10;
          break;
        }
        case "skew": r[s.key] = Math.round((1.2 + (1 - q) * 3 + rnd() * 1.2) * 10) / 10; break;
        case "burst": r[s.key] = Math.round(380 + q * 260 + rnd() * 80); break;
        case "de_cmc": r[s.key] = Math.round((0.2 + (1 - q) * 0.75 + rnd() * 0.3) * 100) / 100; break;
        case "ph_min": case "ph_max": r[s.key] = Math.round((5.4 + rnd() * 1.4) * 10) / 10; break;
        case "hcho": r[s.key] = Math.round(rnd() * 22); break;
        case "pb": r[s.key] = Math.round(rnd() * 30); break;
        case "peel": r[s.key] = Math.round((7 + q * 9 + rnd() * 3) * 10) / 10; break;
        default: r[s.key] = Math.round(rnd() * 10);
      }
    }
    return r;
  }
  for (const s of t.readings) {
    let g = 3.7 + q * 1.35 + (rnd() - 0.5) * 1.0;
    if (s.key === "wet") g -= fiber === "cotton" || fiber === "polycotton" ? 0.9 : 0.5;
    if (s.key.startsWith("st_nylon") || s.key === "st_acetate") g -= 0.3;
    r[s.key] = half(g);
  }
  return r;
}

function iso(d: Date) {
  return d.toISOString();
}
function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

export function buildDemoDb(): DemoDb {
  const rnd = mulberry32(20261022);
  const now = new Date();
  const start = addDays(now, -270);

  const suppliers: Supplier[] = SUPPLIERS.map((s, i) => ({
    ...s,
    id: `sup_${s.code.toLowerCase()}`,
    logoUrl: `/brand/suppliers/${s.code.toLowerCase()}.svg`,
    createdAt: iso(addDays(start, -30 + i * 6)),
  }));

  const fabrics: Fabric[] = FABRICS.map(([si, code, name, fiber, comp, cons, gsm, color, hex, dye, finish], i) => ({
    id: `fab_${code.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    supplierId: suppliers[si].id,
    code,
    name,
    fiber,
    composition: comp,
    construction: cons,
    weightGsm: gsm,
    color,
    colorHex: hex,
    dyeClass: dye,
    finish,
    photoUrl: swatchSvg(hex, cons),
    notes: "",
    createdAt: iso(addDays(start, -20 + i * 3)),
  }));

  const users: AppUser[] = [
    { id: "u_admin", email: "digna.herrera@fanatics.demo", fullName: "Digna Julia Herrera", role: "admin", supplierId: null, active: true, mfaEnabled: true, mustChangePassword: false, lastSignInAt: iso(addDays(now, -0.1)), createdAt: iso(start) },
    { id: "u_reviewer", email: "gabriel@fanatics.demo", fullName: "Gabriel", role: "reviewer", supplierId: null, active: true, mfaEnabled: true, mustChangePassword: false, lastSignInAt: iso(addDays(now, -1.2)), createdAt: iso(start) },
    ...suppliers.map((s, i) => ({
      id: `u_${s.code.toLowerCase()}`,
      email: s.contactEmail,
      fullName: s.contactName,
      role: "supplier" as const,
      supplierId: s.id,
      active: s.status !== "inactive",
      mfaEnabled: i < 3,
      mustChangePassword: false,
      lastSignInAt: iso(addDays(now, -(i + 1) * 0.9)),
      createdAt: iso(addDays(start, i * 5)),
    })),
  ];

  const lots: Lot[] = [];
  const results: TestResult[] = [];
  const evidence: Evidence[] = [];
  const events: LotEvent[] = [];
  const files = new Map<string, string>();
  let seq = 101;
  let rid = 1;

  const makeLot = (fabric: Fabric, createdAt: Date, retestOf: Lot | null): Lot => {
    const si = suppliers.findIndex((s) => s.id === fabric.supplierId);
    const q = Math.min(1, Math.max(0, QUALITY[si] + (rnd() - 0.5) * 0.3 + (retestOf ? 0.25 : 0)));
    const options = METHODS_BY_FIBER[fabric.fiber];
    const methods = retestOf ? retestOf.methods : options[Math.floor(rnd() * options.length)];
    const supplierUser = users.find((u) => u.supplierId === fabric.supplierId)!;
    const ageDays = (now.getTime() - createdAt.getTime()) / 86400000;
    const id = `lot_${seq}`;
    const lot: Lot = {
      id,
      ref: `QC-${createdAt.getFullYear()}-${String(seq).padStart(4, "0")}`,
      supplierId: fabric.supplierId,
      fabricId: fabric.id,
      lotNumber: `${fabric.code.split("-")[0]}${String(24000 + Math.floor(rnd() * 900))}`,
      poNumber: `PO-${String(4500000 + Math.floor(rnd() * 99999))}`,
      program: retestOf ? retestOf.program : PROGRAMS[Math.floor(rnd() * PROGRAMS.length)],
      garmentType: (["jersey", "jersey", "tee", "tee", "hoodie", "polo"] as GarmentType[])[Math.floor(rnd() * 6)],
      quantityM: Math.round(800 + rnd() * 9000),
      methods,
      colors: retestOf
        ? retestOf.colors
        : [
            { id: "c1", name: fabric.color, hex: fabric.colorHex, code: "" },
            ...TEAM_COLORS.filter((c) => c[1] !== fabric.colorHex)
              .sort(() => rnd() - 0.5)
              .slice(0, 1 + Math.floor(rnd() * 3))
              .map(([name, hex, code], k) => ({ id: `c${k + 2}`, name, hex, code })),
          ],
      status: "submitted",
      isRetest: Boolean(retestOf),
      parentLotId: retestOf?.id ?? null,
      labName: rnd() < 0.5 ? "Fanatics QC Lab" : rnd() < 0.5 ? "Intertek" : "Bureau Veritas CPS",
      submittedAt: iso(addDays(createdAt, 0.2)),
      decidedAt: null,
      decidedBy: null,
      decisionNotes: "",
      overrides: {},
      createdBy: supplierUser.id,
      createdAt: iso(createdAt),
      updatedAt: iso(createdAt),
    };
    seq++;

    events.push({ id: `ev_${id}_c`, lotId: id, at: lot.createdAt, actor: supplierUser.fullName, type: "created", from: null, to: "draft", message: "" });
    events.push({ id: `ev_${id}_s`, lotId: id, at: lot.submittedAt!, actor: supplierUser.fullName, type: "submitted", from: "draft", to: "submitted", message: "" });

    // Tests to run: base + those required by the requested methods.
    const testIds = new Set<string>(BASE_TESTS.map((t) => t.id));
    methods.forEach((m) => DECORATION_MAP[m].tests.forEach((t) => testIds.add(t.testId)));
    // Lots still in the pipeline only have part of their results.
    const ids = Array.from(testIds);
    const share = ageDays < 4 ? 0.25 : ageDays < 10 ? 0.7 : 1;
    const chosen = ids.filter((_, i) => i < Math.ceil(ids.length * share));
    const onsets = new Map(lot.colors.map((c) => [c.id, migrationOnset(fabric.fiber, c.hex, q, rnd)]));
    chosen.forEach((testId, i) => {
      const testedAt = addDays(createdAt, 1 + i * 0.35);
      const spectro = TEST_MAP[testId].spectroCapable && rnd() < 0.25;
      const targets = COLOR_TESTS.has(testId) ? lot.colors : [null];
      targets.forEach((color) => {
        const hex = color?.hex ?? fabric.colorHex;
        const readings = genReadings(testId, fabric.fiber, hex, q, onsets.get(color?.id ?? "c1")!, rnd);
        const res: TestResult = {
          id: `res_${rid++}`,
          lotId: id,
          testId,
          colorId: color?.id ?? null,
          readings,
          assessment: TEST_MAP[testId].kind === "numeric" ? "instrument" : spectro ? "spectrophotometer" : TEST_MAP[testId].category === "decoration" ? "visual" : "gray_scale",
          deltaE: {},
          labName: lot.labName,
          testedAt: iso(testedAt),
          notes: "",
          createdBy: supplierUser.id,
          createdAt: iso(testedAt),
        };
        results.push(res);
        if (testId === "dye_migration") {
          for (const temp of color?.id === "c1" ? [150, 170, 190] : [170]) {
            const g = readings[ladderKey(temp)] ?? 5;
            const url = specimenSvg(hex, g, `${lot.ref} · ${color?.name ?? ""} · ${temp} °C · grade ${g}`);
            evidence.push({ id: `evd_${id}_${color?.id}_${temp}`, lotId: id, resultId: res.id, kind: "photo", name: `migration_${color?.name ?? ""}_${temp}C.svg`.replace(/\s+/g, "-"), mime: "image/svg+xml", size: url.length, sha256: "demo", url, uploadedBy: supplierUser.fullName, createdAt: iso(testedAt) });
          }
        }
      });
    });
    evidence.push({ id: `evd_${id}_rep`, lotId: id, resultId: null, kind: "report", name: `${lot.ref}_lab_report.pdf`, mime: "application/pdf", size: 482113, sha256: "demo", url: "", uploadedBy: supplierUser.fullName, createdAt: iso(addDays(createdAt, 2)) });

    const lotResults = results.filter((r) => r.lotId === id);
    const evalr = evaluateLotColors(fabric.fiber, lot, lotResults).overall;
    const reviewer = rnd() < 0.6 ? users[0] : users[1];

    let status: LotStatus;
    if (ageDays < 2) status = "submitted";
    else if (ageDays < 10 || evalr.suggested === "in_review") status = rnd() < 0.15 ? "on_hold" : "in_review";
    else status = evalr.suggested;

    if (status !== "submitted") {
      events.push({ id: `ev_${id}_r`, lotId: id, at: iso(addDays(createdAt, 1)), actor: reviewer.fullName, type: "status", from: "submitted", to: "in_review", message: "" });
    }
    if (status === "on_hold") {
      events.push({ id: `ev_${id}_h`, lotId: id, at: iso(addDays(createdAt, 3)), actor: reviewer.fullName, type: "status", from: "in_review", to: "on_hold", message: "Waiting for approved team-color standard from licensor." });
    }
    if (["approved", "approved_concession", "rejected", "retest"].includes(status)) {
      const decidedAt = addDays(createdAt, 3 + rnd() * 6);
      lot.decidedAt = iso(decidedAt);
      lot.decidedBy = reviewer.fullName;
      const conds = evalr.requested.flatMap((m) => m.conditions);
      lot.decisionNotes =
        status === "approved"
          ? "All required tests meet the Fanatics minimums. Released for decoration."
          : status === "approved_concession"
            ? `Released with conditions: ${Array.from(new Set(conds)).join(", ") || "concession"}${evalr.maxSafeTempC ? ` · max ${evalr.maxSafeTempC} °C` : ""}.`
            : status === "retest"
              ? "Near-miss on a critical test. Re-submit a new specimen from the same dye lot."
              : "Fails critical requirements. Lot not released for decoration.";
      events.push({ id: `ev_${id}_d`, lotId: id, at: lot.decidedAt, actor: reviewer.fullName, type: "decision", from: "in_review", to: status, message: lot.decisionNotes });
    }
    lot.status = status;
    lot.updatedAt = lot.decidedAt ?? lot.submittedAt!;
    return lot;
  };

  // ~46 primary lots spread over 9 months, newest first being in the pipeline.
  for (let i = 0; i < 46; i++) {
    const daysAgo = 268 - i * 5.95 - rnd() * 2;
    const createdAt = addDays(now, -Math.max(0.3, daysAgo));
    const fabric = fabrics[Math.floor(rnd() * fabrics.length)];
    const lot = makeLot(fabric, createdAt, null);
    lots.push(lot);
    if ((lot.status === "retest" || lot.status === "rejected") && daysAgo > 18 && rnd() < 0.8) {
      lots.push(makeLot(fabric, addDays(createdAt, 9), lot));
    }
  }

  // A fresh batch so the board has work in every pipeline column.
  for (let k = 0; k < 8; k++) {
    const fabric = fabrics[Math.floor(rnd() * fabrics.length)];
    lots.push(makeLot(fabric, addDays(now, -(0.15 + k * 1.4)), null));
  }

  // Notifications for the admin
  const notifications: AppNotification[] = lots
    .slice(-8)
    .reverse()
    .map((l, i) => ({
      id: `ntf_${i}`,
      userId: "u_admin",
      title: l.status === "submitted" ? `New lot submitted · ${l.ref}` : `Lot ${l.ref} · ${l.status.replace("_", " ")}`,
      body: `${suppliers.find((s) => s.id === l.supplierId)!.name} — ${fabrics.find((f) => f.id === l.fabricId)!.name}`,
      href: `/lots/${l.id}`,
      readAt: i > 3 ? l.updatedAt : null,
      createdAt: l.updatedAt,
    }));

  const audit: AuditEntry[] = events
    .slice(-60)
    .reverse()
    .map((e, i) => ({
      id: `aud_${i}`,
      at: e.at,
      actor: e.actor,
      action: e.type === "decision" ? "lot.decide" : e.type === "status" ? "lot.status" : e.type === "submitted" ? "lot.submit" : "lot.create",
      entity: "lot",
      entityId: lots.find((l) => l.id === e.lotId)?.ref ?? e.lotId,
      details: e.to ? `→ ${e.to}` : "",
    }));

  return {
    suppliers,
    fabrics,
    lots,
    results,
    evidence,
    events,
    users,
    notifications,
    audit,
    requirements: [],
    apiKeys: [],
    files,
  };
}
