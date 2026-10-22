import { CONDITIONS, DECORATION_MAP, DECORATION_SHORT, FIBER_MAP, PLACEMENTS, TEST_MAP, VERDICTS, ladderKey, loc } from "@/lib/domain/catalog";
import type { ColorEvaluation, LotEvaluation, MethodOutcome, RequirementIndex } from "@/lib/domain/engine";
import { evaluateTest, specFor } from "@/lib/domain/engine";
import type { DecorationCode, Evidence, Fabric, GarmentType, Locale, LotColor, TestResult } from "@/lib/domain/types";
import type { Dict } from "@/lib/i18n/dict";
import { fmtDate } from "@/lib/format";
import { LadderChart } from "./Charts";
import { Icon } from "./icons";
import { VerdictBadge } from "./StatusBadge";
import { Badge, GradeChip, TONE_HEX, cx } from "./ui";

const FAMILY_ICON: Record<string, string> = { screen: "screen", sublimation: "drop", heat_applied: "press", digital: "spark", stitch: "needle", other: "activity" };

export function conditionText(code: string, locale: Locale, maxTemp: number | null) {
  const c = CONDITIONS[code as keyof typeof CONDITIONS];
  return c ? loc(c, locale).replace("{t}", String(maxTemp ?? "—")) : code;
}

export function MethodCard({ m, locale, t, compact = false }: { m: MethodOutcome; locale: Locale; t: Dict; compact?: boolean }) {
  const d = DECORATION_MAP[m.code];
  const tone = VERDICTS[m.verdict].tone;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fx-line bg-white p-4">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: TONE_HEX[tone] }} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-fx-mist p-2 text-fx-ink">
            <Icon name={FAMILY_ICON[d.family]} className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">{d.name[locale]}</div>
            <div className="text-[11px] text-gray-500">
              {d.processTempC ? `${d.processTempC} °C · ${d.dwellS ?? "—"} s` : "—"}
              {m.overridden && <span className="ml-1 font-semibold text-fx-red">· {t.lots.override}</span>}
            </div>
          </div>
        </div>
        <VerdictBadge verdict={m.verdict} locale={locale} />
      </div>
      {(m.verdict === "approved" || m.verdict === "conditional") && m.maxTempC && d.processTempC && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-fx-mist px-3 py-2 text-xs">
          <Icon name="thermo" className="h-4 w-4 text-fx-red" />
          <span className="text-gray-500">Max</span>
          <b className="tabular-nums">{m.maxTempC} °C</b>
        </div>
      )}
      {m.conditions.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {m.conditions.map((c) => (
            <li key={c} className="flex items-start gap-2 text-xs text-amber-900">
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              {conditionText(c, locale, m.maxTempC)}
            </li>
          ))}
        </ul>
      )}
      {m.failedTests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {m.failedTests.map((id) => (
            <Badge key={id} tone="bad" dot={false}>✕ {TEST_MAP[id]?.code}</Badge>
          ))}
        </div>
      )}
      {m.pendingTests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {m.pendingTests.map((id) => (
            <Badge key={id} tone="neutral" dot={false}>… {TEST_MAP[id]?.code}</Badge>
          ))}
        </div>
      )}
      {m.reasons.includes("fiber_incompatible") && <p className="mt-2 text-xs text-gray-500">—</p>}
      {!compact && m.verdict !== "not_applicable" && <p className="mt-3 border-t border-dashed border-fx-line pt-2 text-[11px] leading-relaxed text-gray-500">{d.tips[locale]}</p>}
    </div>
  );
}

export function LadderCard({ result, fabric, reqs, maxSafe, t, locale }: { result: TestResult | undefined; fabric: Fabric; reqs?: RequirementIndex; maxSafe: number | null; t: Dict; locale: Locale }) {
  const test = TEST_MAP.dye_migration;
  const min = specFor(test, fabric.fiber, ladderKey(test.ladderTemps![0]), reqs).min ?? 4;
  const points = test.ladderTemps!.map((tc) => ({ t: tc, g: result?.readings[ladderKey(tc)] ?? null }));
  return (
    <div>
      <LadderChart points={points} min={min} maxSafe={maxSafe} />
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t border-dashed border-fx-ink" /> {t.lots.minimum} {min}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: TONE_HEX.ok }} /> ≥ min</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: TONE_HEX.amber }} /> ≥ min − 1 ({locale === "es" ? "rescatable con bloqueador" : "blocker may rescue"})</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: TONE_HEX.bad }} /> {t.lots.fail}</span>
      </div>
    </div>
  );
}

export function BaseTable({ evaluation, results, locale, t }: { evaluation: LotEvaluation; results: TestResult[]; locale: Locale; t: Dict }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-fx-line">
            <th className="th pl-0">{t.lots.test}</th>
            <th className="th">{t.lots.readings}</th>
            <th className="th text-right">{t.common.status}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fx-line">
          {evaluation.base.map((b) => {
            const test = TEST_MAP[b.testId];
            const has = results.some((r) => r.testId === b.testId);
            return (
              <tr key={b.testId}>
                <td className="td pl-0">
                  <div className="text-sm font-semibold">{test.name[locale]}</div>
                  <div className="text-[11px] text-gray-400">{test.code}{test.critical ? " · critical" : ""}</div>
                </td>
                <td className="td">
                  <div className="flex flex-wrap gap-1">
                    {b.readings.filter((r) => r.value !== null).map((r) => (
                      <span key={r.key} className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        {test.readings.find((x) => x.key === r.key)?.label[locale].replace(/^Staining · |^Transferencia · /, "")}
                        <ReadingChip value={r.value} pass={r.pass} unit={test.readings.find((x) => x.key === r.key)?.unit} />
                      </span>
                    ))}
                  </div>
                </td>
                <td className="td text-right">
                  {!has ? <Badge tone="neutral">{t.lots.pending}</Badge> : b.status === "pass" ? <Badge tone="ok">{t.lots.pass}</Badge> : b.status === "fail" ? <Badge tone="bad">{t.lots.fail}</Badge> : <Badge tone="neutral">{t.lots.pending}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReadingChip({ value, pass, unit }: { value: number | null; pass: boolean | null; unit?: string }) {
  if (value === null) return <span className="text-gray-300">—</span>;
  const color = pass === false ? TONE_HEX.bad : TONE_HEX.ok;
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums" style={{ background: `${color}18`, color }}>
      {value}
      {unit && unit !== "ΔE" ? <span className="ml-0.5 font-medium opacity-70">{unit}</span> : null}
    </span>
  );
}

export function ColorDot({ color, size = 14 }: { color: LotColor; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full ring-1 ring-black/15" style={{ background: color.hex, width: size, height: size }} />;
}

/** Colors tested × decoration methods: verdict and max safe temperature per color. */
export function ColorMatrix({ perColor, methods, results, locale, t }: { perColor: ColorEvaluation[]; methods: DecorationCode[]; results: TestResult[]; locale: Locale; t: Dict }) {
  const cb = (colorId: string) => {
    const r = [...results].reverse().find((x) => x.testId === "color_blocking" && x.colorId === colorId);
    if (!r) return null;
    const vals = Object.values(r.readings).filter((v): v is number => typeof v === "number");
    return vals.length ? Math.min(...vals) : null;
  };
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-fx-line">
            <th className="th pl-0">{locale === "es" ? "Color" : "Color"}</th>
            <th className="th text-center">{t.lots.maxSafe}</th>
            <th className="th text-center">Color blocking</th>
            {methods.map((m) => <th key={m} className="th text-center">{DECORATION_SHORT[m]}</th>)}
            <th className="th text-right">{t.lots.suggested}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fx-line">
          {perColor.map(({ color, evaluation }) => {
            const blocking = cb(color.id);
            return (
              <tr key={color.id}>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/15" style={{ background: color.hex }} />
                    <div>
                      <div className="font-semibold">{color.name}</div>
                      <div className="text-[11px] text-gray-400">{color.code || color.hex}</div>
                    </div>
                  </div>
                </td>
                <td className="text-center font-bold tabular-nums">{evaluation.maxSafeTempC ? `${evaluation.maxSafeTempC} °C` : "—"}</td>
                <td className="text-center"><GradeChip value={blocking} min={4} /></td>
                {methods.map((m) => {
                  const o = evaluation.requested.find((x) => x.code === m);
                  if (!o) return <td key={m} />;
                  const tone = VERDICTS[o.verdict].tone;
                  return (
                    <td key={m} className="text-center">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ background: `${TONE_HEX[tone]}18`, color: TONE_HEX[tone] }} title={o.conditions.map((c) => conditionText(c, locale, o.maxTempC)).join(" · ")}>
                        {o.verdict === "approved" ? "✓" : o.verdict === "conditional" ? "⚠" : o.verdict === "rejected" ? "✕" : "…"}
                        {o.verdict === "conditional" && o.maxTempC ? ` ${o.maxTempC}°` : ""}
                      </span>
                    </td>
                  );
                })}
                <td className="text-right text-xs font-semibold">{VERDICTS[evaluation.suggested === "approved" ? "approved" : evaluation.suggested === "approved_concession" ? "conditional" : evaluation.suggested === "rejected" || evaluation.suggested === "retest" ? "rejected" : "pending"].label[locale]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-gray-500">✓ {VERDICTS.approved.label[locale]} · ⚠ {VERDICTS.conditional.label[locale]} (max °C) · ✕ {VERDICTS.rejected.label[locale]} · … {VERDICTS.pending.label[locale]}</p>
    </div>
  );
}

export function ResultBlock({ result, fabric, reqs, evidence, locale, t, actions, color }: { result: TestResult; fabric: Fabric; reqs?: RequirementIndex; evidence: Evidence[]; locale: Locale; t: Dict; actions?: React.ReactNode; color?: LotColor }) {
  const test = TEST_MAP[result.testId];
  if (!test) return null;
  const out = evaluateTest(test, fabric.fiber, result.readings, reqs);
  const tone = out.status === "pass" ? "ok" : out.status === "fail" ? (test.kind === "ladder" ? "amber" : "bad") : "neutral";
  const assessLabel: Record<string, string> = { gray_scale: "Gray scale", spectrophotometer: "Spectrophotometer", visual: "Visual", instrument: "Instrument" };
  return (
    <div className="rounded-2xl border border-fx-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-fx-ink px-1.5 py-0.5 text-[10px] font-bold text-white">{test.code}</span>
            <span className="text-sm font-bold">{test.name[locale]}</span>
            {color && (
              <span className="inline-flex items-center gap-1 rounded-full bg-fx-mist px-2 py-0.5 text-[11px] font-semibold">
                <ColorDot color={color} size={10} />
                {color.name}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            {assessLabel[result.assessment]} · {result.labName || "—"} · {fmtDate(result.testedAt, locale)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {test.kind === "ladder" && out.maxSafeTempC !== undefined ? (
            <Badge tone={out.maxSafeTempC ? "info" : "bad"}>max {out.maxSafeTempC ?? "<" + test.ladderTemps![0]} °C</Badge>
          ) : (
            <Badge tone={tone}>{out.status === "pass" ? t.lots.pass : out.status === "fail" ? t.lots.fail : t.lots.pending}</Badge>
          )}
          {actions}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {out.readings.map((r) => {
          const spec = test.readings.find((x) => x.key === r.key)!;
          return (
            <div key={r.key} className="flex items-center justify-between gap-2 rounded-lg bg-fx-mist/60 px-2.5 py-1.5">
              <span className="truncate text-[11px] text-gray-600">{spec.label[locale].replace(/^Staining · |^Transferencia · /, "↳ ")}</span>
              <span className="flex items-center gap-1">
                {result.deltaE[r.key] !== undefined && result.deltaE[r.key] !== null && <span className="text-[10px] text-gray-400">ΔE {result.deltaE[r.key]}</span>}
                <ReadingChip value={r.value} pass={r.pass} unit={spec.unit} />
              </span>
            </div>
          );
        })}
      </div>
      {result.notes && <p className="mt-3 text-xs text-gray-600">{result.notes}</p>}
      {evidence.length > 0 && <EvidenceStrip items={evidence} />}
    </div>
  );
}

export function EvidenceStrip({ items, large = false }: { items: Evidence[]; large?: boolean }) {
  return (
    <div className={cx("mt-3 grid gap-2", large ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-3 sm:grid-cols-6")}>
      {items.map((e) =>
        e.mime.startsWith("image/") && e.url ? (
          <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg ring-1 ring-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.url} alt={e.name} className={cx("w-full object-cover transition group-hover:scale-105", large ? "h-36" : "h-16")} />
            {large && <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 px-2 pb-1.5 pt-4 text-[10px] text-white">{e.name}</span>}
          </a>
        ) : (
          <a key={e.id} href={e.url || undefined} target="_blank" rel="noreferrer" className={cx("flex flex-col items-center justify-center gap-1 rounded-lg bg-fx-mist p-2 text-center ring-1 ring-black/5", large ? "h-36" : "h-16")} title={`SHA-256 ${e.sha256}`}>
            <Icon name="file" className="h-5 w-5 text-fx-red" />
            <span className="line-clamp-2 break-all text-[10px] text-gray-600">{e.name}</span>
          </a>
        )
      )}
    </div>
  );
}

/** Garment silhouette with decoration placements, after the decoration spec-sheet convention. */
export function PlacementSheet({ garment, locale, approved }: { garment: GarmentType; locale: Locale; approved: boolean }) {
  const shirt = "M60 20 L95 8 Q120 22 145 8 L180 20 L232 62 L208 102 L186 88 L186 232 L54 232 L54 88 L32 102 L8 62 Z";
  const fill = approved ? "#0E9F6E" : "#9CA3AF";
  const front = PLACEMENTS.filter((p) => p.side !== "back");
  const back = PLACEMENTS.filter((p) => p.side === "back");
  const box = (p: (typeof PLACEMENTS)[number]) => (
    <g key={p.code}>
      <rect x={(p.x / 100) * 240} y={(p.y / 100) * 240} width={(p.w / 100) * 240} height={(p.h / 100) * 240} rx="3" fill={fill} fillOpacity={p.code === "FC" || p.code === "BN" ? 0.85 : 0.18} stroke={fill} strokeDasharray={p.code === "FC" || p.code === "BN" ? "0" : "3 2"} />
      <text x={((p.x + p.w / 2) / 100) * 240} y={((p.y + p.h / 2) / 100) * 240 + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill={p.code === "FC" || p.code === "BN" ? "#fff" : "#374151"}>{p.code}</text>
    </g>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.2fr]">
      {[{ label: locale === "es" ? "Frente" : "Front", items: front }, { label: locale === "es" ? "Espalda" : "Back", items: back }].map((side) => (
        <figure key={side.label} className="rounded-xl bg-fx-mist/60 p-3">
          <svg viewBox="0 0 240 240" className="mx-auto h-44 w-auto" role="img" aria-label={`${garment} ${side.label}`}>
            <path d={shirt} fill="#fff" stroke="#09203F" strokeWidth="2" strokeLinejoin="round" />
            <path d="M95 8 Q120 30 145 8" fill="none" stroke="#09203F" strokeWidth="2" />
            {side.items.map(box)}
          </svg>
          <figcaption className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">{side.label}</figcaption>
        </figure>
      ))}
      <table className="self-start text-xs">
        <tbody className="divide-y divide-fx-line">
          {PLACEMENTS.map((p) => (
            <tr key={p.code}>
              <td className="py-1.5 pr-2 font-bold">{p.code}</td>
              <td className="py-1.5 pr-2 text-gray-600">{p.name[locale]}</td>
              <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-gray-500">{p.size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FiberNote({ fabric, locale }: { fabric: Fabric; locale: Locale }) {
  const f = FIBER_MAP[fabric.fiber];
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide">{locale === "es" ? "Información esencial del producto" : "Essential product information"}</div>
      {f.note[locale]}
    </div>
  );
}

export { GradeChip };
