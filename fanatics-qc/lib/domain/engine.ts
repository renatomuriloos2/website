// Decision engine: turns raw lab readings into pass/fail per test, a Max Safe
// Decoration Temperature from the heat ladder, a verdict + mandatory conditions
// per decoration method, and a suggested lot status. Pure functions — used by
// the UI, the dossier, the API and the unit tests.

import {
  BASE_TESTS,
  DECORATION_MAP,
  DECORATIONS,
  TEST_MAP,
  ladderKey,
  type DecorationDef,
  type TestMethodDef,
} from "./catalog";
import type {
  ConditionCode,
  DecorationCode,
  FiberType,
  GarmentTrial,
  LotColor,
  LotStatus,
  MethodOverride,
  Readings,
  RequirementRow,
  TestResult,
  Verdict,
} from "./types";

// ─── Gray scale ↔ instrumental ΔE (AATCC EP1/EP2 nominal CIELAB values) ─────

const CHANGE_SCALE: [number, number][] = [
  [5, 0], [4.5, 0.8], [4, 1.7], [3.5, 2.5], [3, 3.4], [2.5, 4.8], [2, 6.8], [1.5, 9.6], [1, 13.6],
];
const STAINING_SCALE: [number, number][] = [
  [5, 0], [4.5, 2.3], [4, 4.5], [3.5, 6.8], [3, 9.0], [2.5, 12.8], [2, 18.1], [1.5, 25.6], [1, 36.2],
];

/** Converts a measured ΔE into the equivalent gray-scale grade (AATCC EP7 / EP12 approach). */
export function deltaEToGrade(deltaE: number, scale: "change" | "staining" = "change"): number {
  const table = scale === "staining" ? STAINING_SCALE : CHANGE_SCALE;
  if (deltaE <= 0) return 5;
  for (let i = 0; i < table.length - 1; i++) {
    const [g, de] = table[i];
    const [, nextDe] = table[i + 1];
    if (deltaE < (de + nextDe) / 2) return g;
  }
  return 1;
}

// ─── Requirements ───────────────────────────────────────────────────────────

export type RequirementIndex = Map<string, { min: number | null; max: number | null }>;

export function indexRequirements(rows: RequirementRow[]): RequirementIndex {
  return new Map(rows.map((r) => [`${r.fiber}|${r.testId}|${r.key}`, { min: r.min, max: r.max }]));
}

export function specFor(test: TestMethodDef, fiber: FiberType, key: string, reqs?: RequirementIndex) {
  const custom = reqs?.get(`${fiber}|${test.id}|${key}`);
  const base = test.readings.find((r) => r.key === key);
  const over = test.fiberOverrides?.[fiber]?.[key];
  return {
    min: custom ? custom.min : over?.min ?? base?.min ?? null,
    max: custom ? custom.max : over?.max ?? base?.max ?? null,
    abs: base?.abs ?? false,
  };
}

// ─── Single test evaluation ─────────────────────────────────────────────────

export interface ReadingOutcome {
  key: string;
  value: number | null;
  min: number | null;
  max: number | null;
  pass: boolean | null;
}

export interface TestOutcome {
  testId: string;
  status: "pass" | "fail" | "pending";
  readings: ReadingOutcome[];
  /** Lowest grade among graded readings (for KPIs). */
  worst: number | null;
  /** Ladder tests only: highest temperature that rates ≥ minimum, continuously from the lowest. */
  maxSafeTempC?: number | null;
  /** Ladder tests only: highest temperature tested. */
  maxTestedC?: number | null;
}

export function evaluateTest(test: TestMethodDef, fiber: FiberType, readings: Readings, reqs?: RequirementIndex): TestOutcome {
  const outs: ReadingOutcome[] = test.readings.map((r) => {
    const value = readings[r.key];
    const s = specFor(test, fiber, r.key, reqs);
    if (value === null || value === undefined || Number.isNaN(value)) {
      return { key: r.key, value: null, min: s.min, max: s.max, pass: null };
    }
    const v = s.abs ? Math.abs(value) : value;
    const pass = (s.min === null || v >= s.min) && (s.max === null || v <= s.max);
    return { key: r.key, value, min: s.min, max: s.max, pass };
  });

  const recorded = outs.filter((o) => o.pass !== null);
  const worst = test.kind === "numeric" || recorded.length === 0 ? null : Math.min(...recorded.map((o) => o.value as number));

  if (test.kind === "ladder") {
    const temps = test.ladderTemps ?? [];
    let maxSafe: number | null = null;
    let maxTested: number | null = null;
    let broken = false;
    for (const t of temps) {
      const o = outs.find((x) => x.key === ladderKey(t));
      if (!o || o.pass === null) continue;
      maxTested = t;
      if (!broken && o.pass) maxSafe = t;
      else broken = true;
    }
    const status = recorded.length === 0 ? "pending" : maxSafe === null ? "fail" : "pass";
    return { testId: test.id, status, readings: outs, worst, maxSafeTempC: maxSafe, maxTestedC: maxTested };
  }

  if (recorded.length === 0) return { testId: test.id, status: "pending", readings: outs, worst };
  if (recorded.some((o) => !o.pass)) return { testId: test.id, status: "fail", readings: outs, worst };
  if (recorded.length < outs.length) return { testId: test.id, status: "pending", readings: outs, worst };
  return { testId: test.id, status: "pass", readings: outs, worst };
}

/** Grade read at the ladder temperature closest to (and not above) `temp`. */
function gradeAt(outcome: TestOutcome, temp: number): number | null {
  const below = outcome.readings
    .map((r) => ({ t: Number(r.key.slice(1)), v: r.value }))
    .filter((r) => r.v !== null && r.t <= temp)
    .sort((a, b) => b.t - a.t);
  return below[0]?.v ?? null;
}

// ─── Decoration method evaluation ───────────────────────────────────────────

export interface MethodOutcome {
  code: DecorationCode;
  verdict: Verdict;
  conditions: ConditionCode[];
  maxTempC: number | null;
  reasons: string[];
  failedTests: string[];
  pendingTests: string[];
  overridden: boolean;
}

function latestByTest(results: TestResult[]): Map<string, TestResult> {
  const map = new Map<string, TestResult>();
  for (const r of [...results].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) map.set(r.testId, r);
  return map;
}

export function evaluateMethod(
  method: DecorationDef,
  fiber: FiberType,
  results: TestResult[],
  reqs?: RequirementIndex,
  override?: MethodOverride
): MethodOutcome {
  if (override && override.verdict) {
    return {
      code: method.code,
      verdict: override.verdict,
      conditions: override.conditions,
      maxTempC: override.maxTempC,
      reasons: override.notes ? [override.notes] : [],
      failedTests: [],
      pendingTests: [],
      overridden: true,
    };
  }

  const base: MethodOutcome = {
    code: method.code,
    verdict: "approved",
    conditions: [],
    maxTempC: method.processTempC,
    reasons: [],
    failedTests: [],
    pendingTests: [],
    overridden: false,
  };

  if (!method.fibers.includes(fiber)) {
    return { ...base, verdict: "not_applicable", maxTempC: null, reasons: ["fiber_incompatible"] };
  }

  const latest = latestByTest(results);
  const conditions = new Set<ConditionCode>();
  let rejected = false;
  let conditional = false;

  for (const mt of method.tests) {
    const test = TEST_MAP[mt.testId];
    const r = latest.get(mt.testId);
    if (!test) continue;
    if (!r) {
      base.pendingTests.push(mt.testId);
      continue;
    }
    const out = evaluateTest(test, fiber, r.readings, reqs);

    if (test.kind === "ladder" && method.processTempC !== null) {
      const maxSafe = out.maxSafeTempC ?? null;
      const minGrade = specFor(test, fiber, ladderKey(test.ladderTemps![0]), reqs).min ?? 4;
      if (out.status === "pending") {
        base.pendingTests.push(mt.testId);
        continue;
      }
      if (maxSafe !== null && maxSafe >= method.processTempC) {
        // Passes at production temperature.
        continue;
      }
      if (maxSafe !== null && method.lowTempC !== null && maxSafe >= method.lowTempC) {
        // Passes only at a reduced temperature → conditional with a temperature cap.
        conditional = true;
        base.maxTempC = Math.min(base.maxTempC ?? maxSafe, maxSafe);
        conditions.add("max_temp");
        method.bleedFixes.filter((c) => c === "low_cure_ink" || c === "reduced_dwell" || c === "no_hot_stack").forEach((c) => conditions.add(c));
        base.reasons.push(`${mt.testId}:max_safe_${maxSafe}`);
        continue;
      }
      // Bleeds below the lowest viable temperature: a blocker can rescue it if
      // the staining is moderate (within one grade of the minimum).
      const g = gradeAt(out, method.lowTempC ?? method.processTempC);
      if (g !== null && g >= minGrade - 1 && method.bleedFixes.some((c) => c === "bleed_blocker" || c === "blocker_adhesive" || c === "light_base_only" || c === "pretreatment")) {
        conditional = true;
        if (method.lowTempC !== null) {
          base.maxTempC = method.lowTempC;
          conditions.add("max_temp");
        }
        method.bleedFixes.forEach((c) => conditions.add(c));
        base.reasons.push(`${mt.testId}:blocker_required`);
        continue;
      }
      base.failedTests.push(mt.testId);
      if (mt.critical) rejected = true;
      else {
        conditional = true;
        conditions.add("concession");
      }
      continue;
    }

    if (out.status === "pending") {
      base.pendingTests.push(mt.testId);
      continue;
    }
    if (out.status === "fail") {
      base.failedTests.push(mt.testId);
      if (mt.critical) rejected = true;
      else {
        conditional = true;
        conditions.add("concession");
      }
    }
  }

  // Sublimation needs a sublimation-friendly body.
  if ((method.code === "sublimation" || method.code === "spot_sublimation") && fiber === "cationic_polyester") {
    conditions.add("light_base_only");
  }

  base.conditions = Array.from(conditions);
  if (rejected) base.verdict = "rejected";
  else if (base.pendingTests.length > 0) base.verdict = "pending";
  else if (conditional) base.verdict = "conditional";
  else base.verdict = "approved";
  if (base.verdict === "approved") base.maxTempC = method.processTempC;
  return base;
}

export function evaluateAllMethods(
  fiber: FiberType,
  results: TestResult[],
  reqs?: RequirementIndex,
  overrides: Partial<Record<DecorationCode, MethodOverride>> = {}
): MethodOutcome[] {
  return DECORATIONS.map((d) => evaluateMethod(d, fiber, results, reqs, overrides[d.code]));
}

// ─── Base fabric & lot level ────────────────────────────────────────────────

export interface LotEvaluation {
  base: TestOutcome[];
  baseFailedCritical: string[];
  baseFailed: string[];
  methods: MethodOutcome[];
  requested: MethodOutcome[];
  maxSafeTempC: number | null;
  suggested: LotStatus;
  completeness: number;
  avgGrade: number | null;
}

export function evaluateLot(
  fiber: FiberType,
  methods: DecorationCode[],
  results: TestResult[],
  reqs?: RequirementIndex,
  overrides: Partial<Record<DecorationCode, MethodOverride>> = {}
): LotEvaluation {
  const latest = latestByTest(results);
  const base = BASE_TESTS.map((t) => {
    const r = latest.get(t.id);
    return r ? evaluateTest(t, fiber, r.readings, reqs) : { testId: t.id, status: "pending" as const, readings: [], worst: null };
  });
  const baseFailedCritical = base.filter((b) => b.status === "fail" && TEST_MAP[b.testId].critical).map((b) => b.testId);
  const baseFailed = base.filter((b) => b.status === "fail").map((b) => b.testId);

  const all = evaluateAllMethods(fiber, results, reqs, overrides);
  const requested = all.filter((m) => methods.includes(m.code));

  const ladder = latest.get("dye_migration");
  const maxSafeTempC = ladder ? evaluateTest(TEST_MAP.dye_migration, fiber, ladder.readings, reqs).maxSafeTempC ?? null : null;

  // Completeness = share of required tests (base + requested methods) with a result.
  const required = new Set<string>(BASE_TESTS.map((t) => t.id));
  requested.forEach((m) => DECORATION_MAP[m.code].tests.forEach((t) => required.add(t.testId)));
  const done = Array.from(required).filter((id) => latest.has(id)).length;
  const completeness = required.size ? Math.round((done / required.size) * 100) : 0;

  const grades: number[] = [];
  for (const [testId, r] of Array.from(latest.entries())) {
    const t = TEST_MAP[testId];
    if (!t || t.kind === "numeric") continue;
    for (const spec of t.readings) {
      const v = r.readings[spec.key];
      if (typeof v === "number") grades.push(v);
    }
  }
  const avgGrade = grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : null;

  let suggested: LotStatus;
  const reqVerdicts = requested.map((m) => m.verdict).filter((v) => v !== "not_applicable");
  const basePending = base.some((b) => b.status === "pending");
  if (baseFailedCritical.length > 0 || reqVerdicts.includes("rejected")) {
    // Near-miss failures go to retest; clear failures are rejected.
    const nearMiss = base
      .filter((b) => b.status === "fail")
      .every((b) => b.readings.every((r) => r.pass !== false || (r.min !== null && r.value !== null && r.min - r.value <= 0.5)));
    suggested = nearMiss && baseFailedCritical.length <= 1 ? "retest" : "rejected";
  } else if (basePending || reqVerdicts.includes("pending") || reqVerdicts.length === 0) {
    suggested = "in_review";
  } else if (reqVerdicts.includes("conditional") || baseFailed.length > 0) {
    suggested = "approved_concession";
  } else {
    suggested = "approved";
  }

  return { base, baseFailedCritical, baseFailed, methods: all, requested, maxSafeTempC, suggested, completeness, avgGrade };
}

// ─── Per-color evaluation ───────────────────────────────────────────────────
// A lot is usually tested in several colorways. Results tagged with a colorId
// count for that color; untagged results (physical/chemical) count for all.
// The lot verdict is the WORST color: a method is only approved for the lot
// when it is approved for every color.

export interface ColorEvaluation {
  color: LotColor;
  evaluation: LotEvaluation;
}

const VERDICT_RANK: Record<Verdict, number> = { rejected: 4, pending: 3, conditional: 2, approved: 1, not_applicable: 0 };
const STATUS_RANK: Partial<Record<LotStatus, number>> = { rejected: 5, retest: 4, in_review: 3, approved_concession: 2, approved: 1 };
const TEST_RANK = { fail: 2, pending: 1, pass: 0 } as const;

function mergeEvaluations(list: LotEvaluation[]): LotEvaluation {
  if (list.length === 1) return list[0];
  const base = list[0].base.map((_, i) => list.map((e) => e.base[i]).sort((a, b) => TEST_RANK[b.status] - TEST_RANK[a.status])[0]);
  const mergeMethods = (pick: (e: LotEvaluation) => MethodOutcome[]) =>
    pick(list[0]).map((_, i) => {
      const all = list.map((e) => pick(e)[i]);
      const worst = [...all].sort((a, b) => VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict])[0];
      const temps = all.map((m) => m.maxTempC).filter((t): t is number => t !== null);
      return {
        ...worst,
        conditions: Array.from(new Set(all.flatMap((m) => m.conditions))),
        maxTempC: temps.length ? Math.min(...temps) : null,
        reasons: Array.from(new Set(all.flatMap((m) => m.reasons))),
        failedTests: Array.from(new Set(all.flatMap((m) => m.failedTests))),
        pendingTests: Array.from(new Set(all.flatMap((m) => m.pendingTests))),
      };
    });
  const temps = list.map((e) => e.maxSafeTempC).filter((t): t is number => t !== null);
  const grades = list.map((e) => e.avgGrade).filter((g): g is number => g !== null);
  return {
    base,
    baseFailedCritical: Array.from(new Set(list.flatMap((e) => e.baseFailedCritical))),
    baseFailed: Array.from(new Set(list.flatMap((e) => e.baseFailed))),
    methods: mergeMethods((e) => e.methods),
    requested: mergeMethods((e) => e.requested),
    maxSafeTempC: temps.length ? Math.min(...temps) : null,
    suggested: [...list].sort((a, b) => (STATUS_RANK[b.suggested] ?? 0) - (STATUS_RANK[a.suggested] ?? 0))[0].suggested,
    completeness: Math.round(list.reduce((s, e) => s + e.completeness, 0) / list.length),
    avgGrade: grades.length ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10 : null,
  };
}

// ─── Finished-garment wash trials ───────────────────────────────────────────

export const GARMENT_MIN = { appearance: 4, cracking: 4, peeling: 4, fading: 3.5, shrinkagePct: 5 } as const;

export interface TrialOutcome {
  status: "pass" | "concession" | "fail";
  failures: string[];
}

/** Pass ≥ minimum on every grade; one grade under → concession; anything ≤ 2.5 or 2+ misses → fail. */
export function evaluateGarmentTrial(t: Pick<GarmentTrial, "appearance" | "cracking" | "peeling" | "fading" | "shrinkagePct">): TrialOutcome {
  const failures: string[] = [];
  const grades: [string, number | null, number][] = [
    ["appearance", t.appearance, GARMENT_MIN.appearance],
    ["cracking", t.cracking, GARMENT_MIN.cracking],
    ["peeling", t.peeling, GARMENT_MIN.peeling],
    ["fading", t.fading, GARMENT_MIN.fading],
  ];
  let severe = false;
  for (const [k, v, min] of grades) {
    if (v === null || v === undefined) continue;
    if (v < min) failures.push(k);
    if (v <= 2.5) severe = true;
  }
  if (t.shrinkagePct !== null && t.shrinkagePct !== undefined && Math.abs(t.shrinkagePct) > GARMENT_MIN.shrinkagePct) failures.push("shrinkage");
  if (!failures.length) return { status: "pass", failures };
  return { status: severe || failures.length > 1 ? "fail" : "concession", failures };
}

/** A failed garment trial downgrades the method it was decorated with (unless staff overrode it). */
function applyTrials(evaluation: LotEvaluation, trials: GarmentTrial[], overrides: Partial<Record<DecorationCode, MethodOverride>>): LotEvaluation {
  if (!trials.length) return evaluation;
  const adjust = (m: MethodOutcome): MethodOutcome => {
    if (m.overridden || m.verdict === "not_applicable") return m;
    const outs = trials.filter((t) => t.method === m.code).map(evaluateGarmentTrial);
    if (!outs.length) return m;
    if (outs.some((o) => o.status === "fail")) return { ...m, verdict: "rejected", failedTests: Array.from(new Set([...m.failedTests, "garment_trial"])) };
    if (outs.some((o) => o.status === "concession") && m.verdict === "approved") return { ...m, verdict: "conditional", conditions: Array.from(new Set([...m.conditions, "concession" as ConditionCode])) };
    return m;
  };
  const requested = evaluation.requested.map(adjust);
  let suggested = evaluation.suggested;
  if (requested.some((m) => m.verdict === "rejected") && (suggested === "approved" || suggested === "approved_concession")) suggested = "retest";
  else if (requested.some((m) => m.verdict === "conditional") && suggested === "approved") suggested = "approved_concession";
  void overrides;
  return { ...evaluation, requested, methods: evaluation.methods.map(adjust), suggested };
}

export function evaluateLotColors(
  fiber: FiberType,
  lot: { methods: DecorationCode[]; colors: LotColor[]; overrides: Partial<Record<DecorationCode, MethodOverride>> },
  results: TestResult[],
  reqs?: RequirementIndex,
  trials: GarmentTrial[] = []
): { overall: LotEvaluation; perColor: ColorEvaluation[] } {
  if (!lot.colors.length) return { overall: applyTrials(evaluateLot(fiber, lot.methods, results, reqs, lot.overrides), trials, lot.overrides), perColor: [] };
  const perColor = lot.colors.map((color) => ({
    color,
    evaluation: applyTrials(
      evaluateLot(fiber, lot.methods, results.filter((r) => r.colorId === color.id || r.colorId === null), reqs, lot.overrides),
      trials.filter((t) => t.colorId === color.id || t.colorId === null),
      lot.overrides
    ),
  }));
  return { overall: mergeEvaluations(perColor.map((c) => c.evaluation)), perColor };
}
