"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createLotAction } from "@/lib/actions/lots";
import { initialState } from "@/lib/actions/state";
import { DECORATIONS, FIBER_MAP, GARMENTS } from "@/lib/domain/catalog";
import type { Fabric, GarmentType, Supplier } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "./icons";
import { cx } from "./ui";

const FAMILY_ICON: Record<string, string> = { screen: "screen", sublimation: "drop", heat_applied: "press", digital: "spark", stitch: "needle", other: "activity" };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary px-6" disabled={pending}>
      {pending ? "…" : label}
      <Icon name="arrowRight" className="h-4 w-4" />
    </button>
  );
}

export function LotForm({ fabrics, suppliers, retestOptions, defaults }: { fabrics: Fabric[]; suppliers: Supplier[]; retestOptions: { id: string; ref: string; fabricId: string }[]; defaults: { fabricId?: string; parentLotId?: string } }) {
  const { t, locale } = useI18n();
  const [state, action] = useFormState(createLotAction, initialState);
  const [fabricId, setFabricId] = useState(defaults.fabricId ?? "");
  const fabric = fabrics.find((f) => f.id === fabricId);
  const [colors, setColors] = useState<{ name: string; hex: string; code: string }[]>(fabric ? [{ name: fabric.color, hex: fabric.colorHex, code: "" }] : []);
  const pickFabric = (id: string) => {
    setFabricId(id);
    const f = fabrics.find((x) => x.id === id);
    if (f && (colors.length === 0 || (colors.length === 1 && !colors[0].code))) setColors([{ name: f.color, hex: f.colorHex, code: "" }]);
  };
  const setColor = (i: number, patch: Partial<{ name: string; hex: string; code: string }>) => setColors(colors.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const sMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="card space-y-4 p-6">
        <label className="block">
          <span className="label">{t.common.fabric} *</span>
          <select name="fabricId" required value={fabricId} onChange={(e) => pickFabric(e.target.value)} className="input">
            <option value="">—</option>
            {suppliers.map((s) => (
              <optgroup key={s.id} label={s.name}>
                {fabrics.filter((f) => f.supplierId === s.id).map((f) => (
                  <option key={f.id} value={f.id}>{f.code} · {f.name} · {f.color}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {fabric && (
          <div className="flex items-center gap-3 rounded-xl bg-fx-mist p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {fabric.photoUrl ? <img src={fabric.photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="h-14 w-14 rounded-lg" style={{ background: fabric.colorHex }} />}
            <div className="text-xs">
              <div className="text-sm font-semibold">{fabric.name}</div>
              <div className="text-gray-500">{sMap.get(fabric.supplierId)?.name} · {fabric.composition} · {fabric.weightGsm} g/m²</div>
              <div className="mt-1 text-gray-500">{FIBER_MAP[fabric.fiber].note[locale]}</div>
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">{t.lots.lotNumber} *</span>
            <input name="lotNumber" required maxLength={60} className="input" />
          </label>
          <label className="block">
            <span className="label">{t.lots.po}</span>
            <input name="poNumber" maxLength={60} className="input" />
          </label>
          <label className="block">
            <span className="label">{t.lots.program}</span>
            <input name="program" maxLength={80} placeholder="NFL Replica Jersey" className="input" />
          </label>
          <label className="block">
            <span className="label">{t.lots.garment}</span>
            <select name="garmentType" className="input" defaultValue="jersey">
              {(Object.keys(GARMENTS) as GarmentType[]).map((g) => (
                <option key={g} value={g}>{GARMENTS[g][locale]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">{t.lots.quantity}</span>
            <input name="quantityM" type="number" min={0} step="1" className="input" />
          </label>
          <label className="block">
            <span className="label">{t.lots.lab}</span>
            <input name="labName" maxLength={120} placeholder="Intertek / Bureau Veritas / in-house" className="input" />
          </label>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label mb-0">{locale === "es" ? "Colores a ensayar" : "Colors to test"}</span>
            <button type="button" onClick={() => setColors([...colors, { name: "", hex: "#888888", code: "" }])} className="text-xs font-semibold text-fx-red hover:underline">
              + {locale === "es" ? "Agregar color" : "Add color"}
            </button>
          </div>
          <p className="mb-2 text-xs text-gray-500">
            {locale === "es" ? "Cada color se ensaya por separado (migración, solidez, color blocking). El lote se aprueba por el peor color." : "Each color is tested separately (migration, fastness, color blocking). The lot is approved on its worst color."}
          </p>
          <div className="space-y-2">
            {colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={c.hex} onChange={(e) => setColor(i, { hex: e.target.value })} className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-fx-line" aria-label="hex" />
                <input type="hidden" name="color_hex" value={c.hex} />
                <input name="color_name" value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} placeholder={locale === "es" ? "Nombre (ej. Team Red)" : "Name (e.g. Team Red)"} maxLength={60} className="input" />
                <input name="color_code" value={c.code} onChange={(e) => setColor(i, { code: e.target.value })} placeholder="Pantone / std" maxLength={30} className="input w-36" />
                <button type="button" onClick={() => setColors(colors.filter((_, k) => k !== i))} className="rounded-lg p-2 text-gray-400 hover:text-red-600" aria-label="remove">
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {retestOptions.length > 0 && (
          <label className="block">
            <span className="label">{t.lots.retestOf} ({t.common.optional})</span>
            <select name="parentLotId" defaultValue={defaults.parentLotId ?? ""} className="input">
              <option value="">—</option>
              {retestOptions.map((r) => (
                <option key={r.id} value={r.id}>{r.ref}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="card p-6">
        <div className="label">{t.lots.methods} *</div>
        <p className="mb-4 text-xs text-gray-500">{t.lots.methodsHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DECORATIONS.map((d) => {
            const disabled = Boolean(fabric && !d.fibers.includes(fabric.fiber));
            return (
              <label key={d.code} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border border-fx-line p-3 transition has-[:checked]:border-fx-red has-[:checked]:bg-red-50/40", disabled && "cursor-not-allowed opacity-40")}>
                <input type="checkbox" name="methods" value={d.code} disabled={disabled} className="mt-1 accent-[#E53D2E]" />
                <Icon name={FAMILY_ICON[d.family]} className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{d.name[locale]}</span>
                  <span className="text-[11px] text-gray-500">
                    {d.processTempC ? `${d.processTempC} °C` : "—"}
                    {d.lowTempC ? ` · low-cure ${d.lowTempC} °C` : ""}
                    {disabled ? ` · ${FIBER_MAP[fabric!.fiber].short} ✕` : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {state.error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <div className="mt-6 flex justify-end">
          <Submit label={t.lots.submit} />
        </div>
      </div>
    </form>
  );
}
