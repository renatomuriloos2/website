import { computeAnalytics } from "@/lib/analytics";
import { DECORATIONS, FIBER_MAP, TEST_MAP, TEST_METHODS } from "@/lib/domain/catalog";
import { evaluateLotColors, evaluateTest, indexRequirements } from "@/lib/domain/engine";
import type { Fabric, Lot, RequirementRow, Supplier, TestResult } from "@/lib/domain/types";

export type Row = Record<string, string | number | boolean | null>;
export const DATASETS = ["kpis", "suppliers", "lots", "colors", "results", "protocol"] as const;
export type Dataset = (typeof DATASETS)[number];

interface Snapshot {
  suppliers: Supplier[];
  fabrics: Fabric[];
  lots: Lot[];
  results: TestResult[];
  requirements: RequirementRow[];
}

/** Flat, Power BI-friendly tables built from a data snapshot (one level, no nesting). */
export function buildDataset(name: Dataset, snap: Snapshot): Row[] {
  const reqs = indexRequirements(snap.requirements);
  const sMap = new Map(snap.suppliers.map((s) => [s.id, s]));
  const fMap = new Map(snap.fabrics.map((f) => [f.id, f]));
  const byLot = new Map<string, TestResult[]>();
  snap.results.forEach((r) => byLot.set(r.lotId, [...(byLot.get(r.lotId) ?? []), r]));
  const a = computeAnalytics(snap);

  switch (name) {
    case "kpis":
      return [{ generated_at: new Date().toISOString(), ...Object.fromEntries(Object.entries(a.kpi).map(([k, v]) => [k, v])) }];
    case "suppliers":
      return a.scorecard.map((s) => ({
        supplier_code: s.supplier.code,
        supplier_name: s.supplier.name,
        country: s.supplier.country,
        tier: s.supplier.tier,
        lots: s.lots,
        decided: s.decided,
        approved: s.approved,
        approved_concession: s.concession,
        rejected: s.rejected,
        retest: s.retest,
        rft_pct: s.rftPct,
        approval_pct: s.approvalPct,
        avg_cycle_days: s.avgCycleDays,
        avg_grade: s.avgGrade,
      }));
    case "lots":
      return snap.lots.map((l) => {
        const f = fMap.get(l.fabricId);
        const e = a.evaluations.get(l.id);
        const row: Row = {
          lot_ref: l.ref,
          lot_number: l.lotNumber,
          po_number: l.poNumber,
          program: l.program,
          garment_type: l.garmentType,
          supplier_code: sMap.get(l.supplierId)?.code ?? "",
          supplier_name: sMap.get(l.supplierId)?.name ?? "",
          fabric_code: f?.code ?? "",
          fabric_name: f?.name ?? "",
          fiber: f ? FIBER_MAP[f.fiber].name.en : "",
          colors: l.colors.map((c) => c.name).join(" | "),
          color_count: l.colors.length,
          status: l.status,
          is_retest: l.isRetest,
          right_first_time: l.status === "approved" && !l.isRetest,
          engine_suggestion: e?.suggested ?? null,
          completeness_pct: e?.completeness ?? null,
          max_safe_temp_c: e?.maxSafeTempC ?? null,
          avg_grade: e?.avgGrade ?? null,
          submitted_at: l.submittedAt,
          decided_at: l.decidedAt,
          decided_by: l.decidedBy,
          cycle_days: l.submittedAt && l.decidedAt ? Math.round(((new Date(l.decidedAt).getTime() - new Date(l.submittedAt).getTime()) / 86400000) * 10) / 10 : null,
        };
        for (const d of DECORATIONS) row[`verdict_${d.code}`] = l.methods.includes(d.code) ? e?.requested.find((m) => m.code === d.code)?.verdict ?? null : null;
        return row;
      });
    case "colors":
      return snap.lots.flatMap((l) => {
        const f = fMap.get(l.fabricId);
        if (!f) return [];
        const { perColor } = evaluateLotColors(f.fiber, l, byLot.get(l.id) ?? [], reqs);
        return perColor.map(({ color, evaluation }) => {
          const row: Row = {
            lot_ref: l.ref,
            supplier_code: sMap.get(l.supplierId)?.code ?? "",
            fabric_code: f.code,
            color_name: color.name,
            color_hex: color.hex,
            color_code: color.code,
            max_safe_temp_c: evaluation.maxSafeTempC,
            engine_suggestion: evaluation.suggested,
          };
          for (const m of evaluation.requested) row[`verdict_${m.code}`] = m.verdict;
          return row;
        });
      });
    case "results":
      return snap.results.flatMap((r) => {
        const l = snap.lots.find((x) => x.id === r.lotId);
        const f = l ? fMap.get(l.fabricId) : undefined;
        const test = TEST_MAP[r.testId];
        if (!l || !f || !test) return [];
        const out = evaluateTest(test, f.fiber, r.readings, reqs);
        return out.readings
          .filter((x) => x.value !== null)
          .map((x) => ({
            lot_ref: l.ref,
            supplier_code: sMap.get(l.supplierId)?.code ?? "",
            fiber: f.fiber,
            color: l.colors.find((c) => c.id === r.colorId)?.name ?? "ALL",
            test_id: r.testId,
            test_code: test.code,
            category: test.category,
            reading: x.key,
            value: x.value,
            min: x.min,
            max: x.max,
            pass: x.pass,
            assessment: r.assessment,
            lab: r.labName,
            tested_at: r.testedAt,
          }));
      });
    case "protocol":
      return TEST_METHODS.flatMap((t) =>
        t.readings.map((rd) => ({
          test_id: t.id,
          test_code: t.code,
          standards: t.standards,
          name: t.name.en,
          category: t.category,
          kind: t.kind,
          reading: rd.key,
          default_min: rd.min ?? null,
          default_max: rd.max ?? null,
          unit: rd.unit ?? null,
          used_by: DECORATIONS.filter((d) => d.tests.some((x) => x.testId === t.id)).map((d) => d.code).join(","),
        }))
      );
  }
}

export function toCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  // Neutralise spreadsheet formula injection (=, +, -, @ at cell start).
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
