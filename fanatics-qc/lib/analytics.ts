import { DECORATIONS, TEST_MAP } from "@/lib/domain/catalog";
import { evaluateLotColors, indexRequirements, type LotEvaluation } from "@/lib/domain/engine";
import type { DecorationCode, Fabric, FiberType, Lot, LotStatus, RequirementRow, Supplier, TestResult } from "@/lib/domain/types";

export interface Analytics {
  kpi: {
    total: number;
    pipeline: number;
    approved: number;
    concession: number;
    rejected: number;
    retest: number;
    decided: number;
    rftPct: number | null;
    approvalPct: number | null;
    avgCycleDays: number | null;
    avgGrade: number | null;
    medianMaxTemp: number | null;
  };
  monthly: { month: string; approved: number; concession: number; rejected: number; retest: number; pipeline: number }[];
  byStatus: { status: LotStatus; count: number }[];
  scorecard: {
    supplier: Supplier;
    lots: number;
    decided: number;
    approved: number;
    concession: number;
    rejected: number;
    retest: number;
    rftPct: number | null;
    approvalPct: number | null;
    avgCycleDays: number | null;
    avgGrade: number | null;
  }[];
  pareto: { testId: string; fails: number }[];
  matrix: { supplierId: string; cells: Partial<Record<DecorationCode, { n: number; ok: number; cond: number }>> }[];
  matrixMethods: DecorationCode[];
  fiberMix: { fiber: FiberType; count: number }[];
  evaluations: Map<string, LotEvaluation>;
}

const PIPELINE: LotStatus[] = ["draft", "submitted", "in_review", "retest", "on_hold"];
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);
const days = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 86400000;

/** Right First Time: approved without concession on the first submission (not a retest). */
export const isRft = (l: Lot) => l.status === "approved" && !l.isRetest;

export function computeAnalytics(input: { lots: Lot[]; results: TestResult[]; suppliers: Supplier[]; fabrics: Fabric[]; requirements: RequirementRow[] }): Analytics {
  const { lots, results, suppliers, fabrics } = input;
  const reqs = indexRequirements(input.requirements);
  const fabricById = new Map(fabrics.map((f) => [f.id, f]));
  const resultsByLot = new Map<string, TestResult[]>();
  results.forEach((r) => resultsByLot.set(r.lotId, [...(resultsByLot.get(r.lotId) ?? []), r]));

  const evaluations = new Map<string, LotEvaluation>();
  for (const l of lots) {
    const f = fabricById.get(l.fabricId);
    if (f) evaluations.set(l.id, evaluateLotColors(f.fiber, l, resultsByLot.get(l.id) ?? [], reqs).overall);
  }

  const decidedLots = lots.filter((l) => ["approved", "approved_concession", "rejected", "retest"].includes(l.status));
  const cycle = lots.filter((l) => l.decidedAt && l.submittedAt).map((l) => days(l.submittedAt!, l.decidedAt!));
  const grades = Array.from(evaluations.values()).map((e) => e.avgGrade).filter((g): g is number => g !== null);
  const temps = Array.from(evaluations.values()).map((e) => e.maxSafeTempC).filter((t): t is number => t !== null).sort((a, b) => a - b);

  const count = (s: LotStatus) => lots.filter((l) => l.status === s).length;
  const kpi = {
    total: lots.length,
    pipeline: lots.filter((l) => PIPELINE.includes(l.status)).length,
    approved: count("approved"),
    concession: count("approved_concession"),
    rejected: count("rejected"),
    retest: count("retest"),
    decided: decidedLots.length,
    rftPct: pct(decidedLots.filter(isRft).length, decidedLots.length),
    approvalPct: pct(decidedLots.filter((l) => l.status === "approved" || l.status === "approved_concession").length, decidedLots.length),
    avgCycleDays: avg(cycle),
    avgGrade: avg(grades),
    medianMaxTemp: temps.length ? temps[Math.floor(temps.length / 2)] : null,
  };

  // Monthly (last 9 months)
  const monthly: Analytics["monthly"] = [];
  const now = new Date();
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const inMonth = lots.filter((l) => (l.submittedAt ?? l.createdAt).slice(0, 7) === key);
    monthly.push({
      month: key,
      approved: inMonth.filter((l) => l.status === "approved").length,
      concession: inMonth.filter((l) => l.status === "approved_concession").length,
      rejected: inMonth.filter((l) => l.status === "rejected").length,
      retest: inMonth.filter((l) => l.status === "retest").length,
      pipeline: inMonth.filter((l) => ["submitted", "in_review", "on_hold", "draft"].includes(l.status)).length,
    });
  }

  const byStatus = (["submitted", "in_review", "on_hold", "retest", "approved", "approved_concession", "rejected"] as LotStatus[]).map((status) => ({ status, count: count(status) }));

  const scorecard = suppliers
    .map((supplier) => {
      const sl = lots.filter((l) => l.supplierId === supplier.id);
      const sd = sl.filter((l) => decidedLots.includes(l));
      const sc = sl.filter((l) => l.decidedAt && l.submittedAt).map((l) => days(l.submittedAt!, l.decidedAt!));
      const sg = sl.map((l) => evaluations.get(l.id)?.avgGrade).filter((g): g is number => typeof g === "number");
      return {
        supplier,
        lots: sl.length,
        decided: sd.length,
        approved: sl.filter((l) => l.status === "approved").length,
        concession: sl.filter((l) => l.status === "approved_concession").length,
        rejected: sl.filter((l) => l.status === "rejected").length,
        retest: sl.filter((l) => l.status === "retest").length,
        rftPct: pct(sd.filter(isRft).length, sd.length),
        approvalPct: pct(sd.filter((l) => l.status === "approved" || l.status === "approved_concession").length, sd.length),
        avgCycleDays: avg(sc),
        avgGrade: avg(sg),
      };
    })
    .sort((a, b) => (b.rftPct ?? -1) - (a.rftPct ?? -1));

  const fails = new Map<string, number>();
  for (const e of Array.from(evaluations.values())) {
    const ids = new Set<string>([...e.baseFailed, ...e.requested.flatMap((m) => m.failedTests)]);
    ids.forEach((id) => fails.set(id, (fails.get(id) ?? 0) + 1));
  }
  const pareto = Array.from(fails.entries())
    .filter(([id]) => TEST_MAP[id])
    .map(([testId, n]) => ({ testId, fails: n }))
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 8);

  const usedMethods = new Set<DecorationCode>(lots.flatMap((l) => l.methods));
  const matrixMethods = DECORATIONS.map((d) => d.code).filter((c) => usedMethods.has(c));
  const matrix = suppliers.map((s) => {
    const cells: Analytics["matrix"][number]["cells"] = {};
    for (const l of lots.filter((x) => x.supplierId === s.id)) {
      const e = evaluations.get(l.id);
      if (!e) continue;
      for (const m of e.requested) {
        if (m.verdict === "pending" || m.verdict === "not_applicable") continue;
        const c = (cells[m.code] ??= { n: 0, ok: 0, cond: 0 });
        c.n++;
        if (m.verdict === "approved") c.ok++;
        if (m.verdict === "conditional") c.cond++;
      }
    }
    return { supplierId: s.id, cells };
  });

  const fiberCounts = new Map<FiberType, number>();
  lots.forEach((l) => {
    const f = fabricById.get(l.fabricId);
    if (f) fiberCounts.set(f.fiber, (fiberCounts.get(f.fiber) ?? 0) + 1);
  });
  const fiberMix = Array.from(fiberCounts.entries())
    .map(([fiber, c]) => ({ fiber, count: c }))
    .sort((a, b) => b.count - a.count);

  return { kpi, monthly, byStatus, scorecard, pareto, matrix, matrixMethods, fiberMix, evaluations };
}
