"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addResultAction, decideLotAction, deleteResultAction, uploadEvidenceAction } from "@/lib/actions/lots";
import { initialState } from "@/lib/actions/state";
import { CONDITIONS, DECORATION_MAP, LOT_STATUSES, TEST_MAP, TEST_METHODS, VERDICTS } from "@/lib/domain/catalog";
import { deltaEToGrade } from "@/lib/domain/engine";
import type { ConditionCode, DecorationCode, LotColor, LotStatus, MethodOverride, Assessment } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "./icons";
import { cx } from "./ui";

function Submit({ label, icon = "check" }: { label: string; icon?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      <Icon name={icon} className="h-4 w-4" />
      {pending ? "…" : label}
    </button>
  );
}

const GRADES = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

export function ResultForm({ lotId, requiredTests, doneTests, defaultLab, colors }: { lotId: string; requiredTests: string[]; doneTests: string[]; defaultLab: string; colors: LotColor[] }) {
  const { t, locale } = useI18n();
  const [state, action] = useFormState(addResultAction.bind(null, lotId), initialState);
  const firstMissing = requiredTests.find((id) => !doneTests.includes(id)) ?? "";
  const [testId, setTestId] = useState(firstMissing);
  const test = TEST_MAP[testId];
  const [assessment, setAssessment] = useState<Assessment>("gray_scale");
  const [de, setDe] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!test) return;
    setAssessment(test.kind === "numeric" ? "instrument" : test.category === "decoration" ? "visual" : "gray_scale");
    setDe({});
  }, [testId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      const next = requiredTests.find((id) => !doneTests.includes(id) && id !== testId);
      if (next) setTestId(next);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const required = new Set(requiredTests);
  const spectro = assessment === "spectrophotometer" && test?.kind !== "numeric";

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="label">{t.lots.test}</span>
          <select name="testId" value={testId} onChange={(e) => setTestId(e.target.value)} className="input">
            <option value="">{t.lots.selectTest}</option>
            <optgroup label={locale === "es" ? "Requeridas para este lote" : "Required for this lot"}>
              {TEST_METHODS.filter((x) => required.has(x.id)).map((x) => (
                <option key={x.id} value={x.id}>
                  {doneTests.includes(x.id) ? "✓ " : "○ "}
                  {x.code} — {x.name[locale]}
                </option>
              ))}
            </optgroup>
            <optgroup label={locale === "es" ? "Otras" : "Other"}>
              {TEST_METHODS.filter((x) => !required.has(x.id)).map((x) => (
                <option key={x.id} value={x.id}>{x.code} — {x.name[locale]}</option>
              ))}
            </optgroup>
          </select>
        </label>
        {test && (
          <>
            {colors.length > 0 && (
              <label className="block sm:col-span-2">
                <span className="label">{locale === "es" ? "Color ensayado" : "Color tested"}</span>
                <select name="colorId" defaultValue={colors[0].id} className="input">
                  {colors.map((c) => <option key={c.id} value={c.id}>● {c.name}{c.code ? ` · ${c.code}` : ""}</option>)}
                  <option value="">{locale === "es" ? "Todos los colores (ensayo físico / químico)" : "All colors (physical / chemical test)"}</option>
                </select>
              </label>
            )}
            <label className="block">
              <span className="label">{t.lots.assessment}</span>
              <select name="assessment" value={assessment} onChange={(e) => setAssessment(e.target.value as Assessment)} className="input">
                {test.kind !== "numeric" && <option value="gray_scale">Gray scale (AATCC EP1 / EP2)</option>}
                {test.spectroCapable && test.kind !== "numeric" && <option value="spectrophotometer">Spectrophotometer (EP7 / EP12)</option>}
                {test.kind !== "numeric" && <option value="visual">Visual / photographic standard</option>}
                {test.kind === "numeric" && <option value="instrument">Instrument</option>}
              </select>
            </label>
            <label className="block">
              <span className="label">{t.lots.testedAt}</span>
              <input type="date" name="testedAt" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </label>
          </>
        )}
      </div>

      {test && (
        <div className="rounded-xl bg-fx-mist/70 p-4">
          <p className="mb-3 text-xs text-gray-500">{test.summary[locale]}</p>
          <p className="mb-3 text-[11px] font-medium text-gray-500">{spectro ? t.lots.spectroHint : test.kind === "numeric" ? "" : t.lots.gradeScale}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {test.readings.map((r) => (
              <label key={r.key} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-fx-line">
                <span className="text-xs">
                  {r.label[locale]}
                  <span className="block text-[10px] text-gray-400">
                    {r.min !== undefined ? `≥ ${r.min}` : ""}
                    {r.max !== undefined ? `≤ ${r.max}${r.unit ? " " + r.unit : ""}` : ""}
                  </span>
                </span>
                {spectro && r.scale ? (
                  <span className="flex items-center gap-1.5">
                    <input name={`de_${r.key}`} inputMode="decimal" placeholder="ΔE" value={de[r.key] ?? ""} onChange={(e) => setDe({ ...de, [r.key]: e.target.value })} className="w-16 rounded-md border border-fx-line px-2 py-1 text-right text-sm" />
                    <span className="w-8 text-center text-xs font-bold text-fx-red">{de[r.key] ? deltaEToGrade(Number(de[r.key]), r.scale) : "—"}</span>
                  </span>
                ) : test.kind === "numeric" ? (
                  <input name={`r_${r.key}`} inputMode="decimal" className="w-20 rounded-md border border-fx-line px-2 py-1 text-right text-sm" />
                ) : (
                  <select name={`r_${r.key}`} defaultValue="" className="w-20 rounded-md border border-fx-line px-1 py-1 text-sm">
                    <option value="">—</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g % 1 ? `${g - 0.5}-${g + 0.5}` : g}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {test && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t.lots.labName}</span>
            <input name="labName" defaultValue={defaultLab} maxLength={120} className="input" />
          </label>
          <label className="block">
            <span className="label">{t.lots.evidence} ({t.common.optional})</span>
            <input type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,application/pdf,.csv,.qtx,.cxf" capture="environment" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-fx-ink file:px-3 file:py-1 file:text-xs file:text-white" />
          </label>
          <label className="block sm:col-span-2">
            <span className="label">{t.common.notes}</span>
            <textarea name="notes" rows={2} maxLength={1000} className="input" />
          </label>
        </div>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {t.common.saved}</p>}
      <div className="flex justify-end">
        <Submit label={t.lots.addResult} icon="plus" />
      </div>
    </form>
  );
}

export function DeleteResultButton({ lotId, resultId }: { lotId: string; resultId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm("Delete this result?") && start(() => deleteResultAction(lotId, resultId))}
      className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600"
      aria-label="Delete"
    >
      <Icon name="x" className="h-4 w-4" />
    </button>
  );
}

export function EvidenceUpload({ lotId }: { lotId: string }) {
  const { t } = useI18n();
  const [state, action] = useFormState(uploadEvidenceAction.bind(null, lotId), initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-fx-mist/50 px-4 py-6 text-center transition hover:border-fx-red">
        <Icon name="upload" className="h-6 w-6 text-fx-red" />
        <span className="text-sm font-semibold">{t.lots.uploadEvidence}</span>
        <span className="max-w-md text-xs text-gray-500">{t.lots.evidenceHint}</span>
        <input type="file" name="files" multiple required accept="image/jpeg,image/png,image/webp,application/pdf,.csv,.qtx,.cxf" className="mt-2 text-xs" />
      </label>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label>
          <span className="label">{t.lots.kind}</span>
          <select name="kind" className="input">
            <option value="photo">{t.lots.kindPhoto}</option>
            <option value="report">{t.lots.kindReport}</option>
            <option value="spectro">{t.lots.kindSpectro}</option>
            <option value="other">{t.lots.kindOther}</option>
          </select>
        </label>
        <Submit label={t.common.upload} icon="upload" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">✓ {state.ok} file(s)</p>}
    </form>
  );
}

export interface DecisionMethod {
  code: DecorationCode;
  verdict: string;
  conditions: ConditionCode[];
  maxTempC: number | null;
  override: MethodOverride | null;
}

export function DecisionForm({ lotId, current, suggested, notes, methods }: { lotId: string; current: LotStatus; suggested: LotStatus; notes: string; methods: DecisionMethod[] }) {
  const { t, locale } = useI18n();
  const [state, action] = useFormState(decideLotAction.bind(null, lotId), initialState);
  const [open, setOpen] = useState<string | null>(null);
  const defaultStatus = ["approved", "approved_concession", "rejected", "retest", "on_hold"].includes(current) ? current : suggested;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {LOT_STATUSES.filter((s) => ["approved", "approved_concession", "retest", "on_hold", "rejected", "in_review"].includes(s.code)).map((s) => (
          <label key={s.code} className="relative flex cursor-pointer items-center gap-2 rounded-xl border border-fx-line p-3 text-sm font-semibold has-[:checked]:border-fx-ink has-[:checked]:bg-fx-ink has-[:checked]:text-white">
            <input type="radio" name="status" value={s.code} defaultChecked={s.code === defaultStatus} className="sr-only" />
            {s.label[locale]}
            {s.code === suggested && <span className="absolute -top-2 right-2 rounded-full bg-fx-red px-1.5 text-[9px] font-bold uppercase text-white">engine</span>}
          </label>
        ))}
      </div>
      <label className="block">
        <span className="label">{t.lots.decisionNotes}</span>
        <textarea name="notes" rows={3} maxLength={2000} defaultValue={notes} className="input" />
      </label>
      <div>
        <div className="label">{t.lots.override}</div>
        <p className="mb-2 text-xs text-gray-500">{t.lots.overrideHint}</p>
        <div className="divide-y divide-fx-line rounded-xl border border-fx-line">
          {methods.map((m) => (
            <div key={m.code} className="p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setOpen(open === m.code ? null : m.code)} className="text-left text-sm font-semibold">
                  {DECORATION_MAP[m.code].name[locale]}
                  <span className="ml-2 text-xs font-normal text-gray-400">engine: {VERDICTS[m.verdict as keyof typeof VERDICTS]?.label[locale]}</span>
                </button>
                <select name={`ov_${m.code}`} defaultValue={m.override?.verdict ?? "auto"} className="rounded-lg border border-fx-line px-2 py-1 text-xs" onChange={(e) => e.target.value !== "auto" && setOpen(m.code)}>
                  <option value="auto">{t.lots.auto}</option>
                  <option value="approved">{VERDICTS.approved.label[locale]}</option>
                  <option value="conditional">{VERDICTS.conditional.label[locale]}</option>
                  <option value="rejected">{VERDICTS.rejected.label[locale]}</option>
                  <option value="not_applicable">{VERDICTS.not_applicable.label[locale]}</option>
                </select>
              </div>
              <div className={cx("mt-3 grid gap-2 sm:grid-cols-2", open === m.code ? "" : "hidden")}>
                {(Object.keys(CONDITIONS) as ConditionCode[]).map((c) => (
                  <label key={c} className="flex items-start gap-2 text-xs">
                    <input type="checkbox" name={`ovc_${m.code}`} value={c} defaultChecked={(m.override?.conditions ?? m.conditions).includes(c)} className="mt-0.5 accent-[#E53D2E]" />
                    {CONDITIONS[c][locale].replace("{t}", "…")}
                  </label>
                ))}
                <label className="text-xs">
                  Max °C
                  <input name={`ovt_${m.code}`} type="number" min={80} max={230} defaultValue={m.override?.maxTempC ?? m.maxTempC ?? ""} className="input mt-1 py-1.5" />
                </label>
                <label className="text-xs">
                  {t.common.notes}
                  <input name={`ovn_${m.code}`} maxLength={300} defaultValue={m.override?.notes ?? ""} className="input mt-1 py-1.5" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {t.common.saved}</p>}
      <div className="flex justify-end">
        <Submit label={t.lots.decide} icon="shield" />
      </div>
    </form>
  );
}
