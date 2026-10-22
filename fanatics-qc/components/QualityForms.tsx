"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { addGarmentTrialAction, capaAction, deleteGarmentTrialAction, openCapaAction } from "@/lib/actions/quality";
import { initialState } from "@/lib/actions/state";
import { DECORATION_MAP, PLACEMENTS } from "@/lib/domain/catalog";
import type { Capa, DecorationCode, LotColor } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "./icons";

const GRADES = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
const gradeLabel = (g: number) => (g % 1 ? `${g - 0.5}-${g + 0.5}` : String(g));

function Submit({ label, icon = "check", name, value, variant = "primary" }: { label: string; icon?: string; name?: string; value?: string; variant?: "primary" | "ghost" | "dark" }) {
  const { pending } = useFormStatus();
  return (
    <button name={name} value={value} className={variant === "primary" ? "btn-primary" : variant === "dark" ? "btn-dark" : "btn-ghost"} disabled={pending}>
      <Icon name={icon} className="h-4 w-4" />
      {pending ? "…" : label}
    </button>
  );
}

function PhotoInput({ name, label }: { name: string; label: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <label className="block cursor-pointer">
      <span className="label">{label} *</span>
      <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-fx-mist/60 hover:border-fx-red">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="h-8 w-8 text-gray-300" />}
      </div>
      <input type="file" name={name} required accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-1 text-xs" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
    </label>
  );
}

export function GarmentTrialForm({ lotId, methods, colors }: { lotId: string; methods: DecorationCode[]; colors: LotColor[] }) {
  const { locale } = useI18n();
  const es = locale === "es";
  const [state, action] = useFormState(addGarmentTrialAction.bind(null, lotId), initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const gradeSelect = (name: string, label: string, required = false) => (
    <label className="block">
      <span className="label">{label}{required ? " *" : ""}</span>
      <select name={name} required={required} defaultValue="" className="input">
        <option value="">—</option>
        {GRADES.map((g) => <option key={g} value={g}>{gradeLabel(g)}</option>)}
      </select>
    </label>
  );
  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <PhotoInput name="before" label={es ? "Foto ANTES del lavado" : "Photo BEFORE washing"} />
        <PhotoInput name="after" label={es ? "Foto DESPUÉS del lavado" : "Photo AFTER washing"} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">{es ? "Método decorado" : "Decoration method"} *</span>
          <select name="method" required className="input">
            {methods.map((m) => <option key={m} value={m}>{DECORATION_MAP[m].name[locale]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">{es ? "Ubicación" : "Placement"}</span>
          <select name="placement" className="input">
            {PLACEMENTS.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name[locale]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">{es ? "Color" : "Color"}</span>
          <select name="colorId" className="input" defaultValue={colors[0]?.id ?? ""}>
            {colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="">{es ? "Todos" : "All"}</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{es ? "Ciclos de lavado" : "Wash cycles"} *</span>
          <select name="washCycles" defaultValue="25" className="input">
            {[1, 5, 10, 20, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{es ? "Procedimiento" : "Procedure"}</span>
          <input name="washProcedure" defaultValue="AATCC 135 (1-IV-A-i), inside out, 41 °C, tumble dry normal" className="input" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-5">
        {gradeSelect("appearance", es ? "Apariencia general" : "Overall appearance", true)}
        {gradeSelect("cracking", es ? "Agrietamiento" : "Cracking")}
        {gradeSelect("peeling", es ? "Desprendimiento" : "Peeling")}
        {gradeSelect("fading", es ? "Decoloración" : "Fading")}
        <label className="block">
          <span className="label">{es ? "Encogimiento %" : "Shrinkage %"}</span>
          <input name="shrinkagePct" inputMode="decimal" placeholder="-2.5" className="input" />
        </label>
      </div>
      <p className="text-xs text-gray-500">{es ? "Mínimos: apariencia, agrietamiento y desprendimiento ≥ 4; decoloración ≥ 3,5; encogimiento ≤ 5 %. Una falla menor = concesión; falla severa (≤ 2,5) o múltiple = no aprobado para ese método." : "Minimums: appearance, cracking and peeling ≥ 4; fading ≥ 3.5; shrinkage ≤ 5 %. One minor miss = concession; severe (≤ 2.5) or multiple misses = method not approved."}</p>
      <label className="block">
        <span className="label">{es ? "Notas" : "Notes"}</span>
        <textarea name="notes" rows={2} maxLength={1000} className="input" />
      </label>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {es ? "Prueba guardada" : "Trial saved"}</p>}
      <div className="flex justify-end">
        <Submit label={es ? "Guardar prueba de prenda" : "Save garment trial"} icon="plus" />
      </div>
    </form>
  );
}

export function DeleteTrialButton({ lotId, id }: { lotId: string; id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => confirm("Delete this garment trial?") && start(() => deleteGarmentTrialAction(lotId, id))} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600" aria-label="Delete">
      <Icon name="x" className="h-4 w-4" />
    </button>
  );
}

export function OpenCapaButton({ lotId, label }: { lotId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => openCapaAction(lotId))} className="btn-dark py-2">
      <Icon name="alert" className="h-4 w-4" /> {pending ? "…" : label}
    </button>
  );
}

export function CapaForm({ capa, staff, supplierCanEdit }: { capa: Capa; staff: boolean; supplierCanEdit: boolean }) {
  const { locale } = useI18n();
  const es = locale === "es";
  const [state, action] = useFormState(capaAction.bind(null, capa.id), initialState);
  const editable = staff ? capa.status !== "closed" : supplierCanEdit;
  const field = (name: keyof Capa, label: string, hint: string, rows = 3) => (
    <label className="block">
      <span className="label">{label}</span>
      <textarea name={name} rows={rows} defaultValue={String(capa[name] ?? "")} readOnly={!editable} maxLength={4000} placeholder={hint} className={`input ${editable ? "" : "bg-fx-mist/60"}`} />
    </label>
  );
  return (
    <form action={action} className="space-y-4">
      {field("rootCause", es ? "1. Causa raíz (5 porqués / Ishikawa)" : "1. Root cause (5 Whys / Ishikawa)", es ? "¿Por qué ocurrió? Respaldar con datos (temperaturas, recetas, registros)." : "Why did it happen? Support with data (temperatures, recipes, records).", 4)}
      {field("containment", es ? "2. Contención inmediata" : "2. Immediate containment", es ? "¿Qué se hizo con el material afectado?" : "What was done with the affected material?")}
      {field("correctiveAction", es ? "3. Acción correctiva" : "3. Corrective action", es ? "¿Qué se corrigió en este lote / proceso?" : "What was fixed in this lot / process?")}
      {field("preventiveAction", es ? "4. Acción preventiva" : "4. Preventive action", es ? "¿Qué cambia para que no se repita?" : "What changes so it does not happen again?")}
      <label className="block max-w-sm">
        <span className="label">{es ? "Responsable en el mill" : "Mill owner"}</span>
        <input name="supplierOwner" defaultValue={capa.supplierOwner} readOnly={!editable} maxLength={120} className={`input ${editable ? "" : "bg-fx-mist/60"}`} />
      </label>
      {staff && (
        <label className="block">
          <span className="label">{es ? "Notas de revisión Fanatics" : "Fanatics review notes"}</span>
          <textarea name="reviewNotes" rows={2} defaultValue={capa.reviewNotes} maxLength={2000} className="input" />
        </label>
      )}
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {es ? "Guardado" : "Saved"}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {editable && <Submit name="intent" value="save" label={es ? "Guardar borrador" : "Save draft"} icon="file" variant="ghost" />}
        {(capa.status === "open" || capa.status === "returned") && (supplierCanEdit || staff) && <Submit name="intent" value="submit" label={es ? "Enviar a Fanatics" : "Submit to Fanatics"} icon="arrowRight" />}
        {staff && capa.status === "submitted" && (
          <>
            <Submit name="intent" value="return" label={es ? "Devolver" : "Return"} icon="x" variant="ghost" />
            <Submit name="intent" value="accept" label={es ? "Aceptar" : "Accept"} icon="check" />
          </>
        )}
        {staff && capa.status !== "closed" && <Submit name="intent" value="close" label={es ? "Cerrar CAPA" : "Close CAPA"} icon="shield" variant="dark" />}
      </div>
    </form>
  );
}
