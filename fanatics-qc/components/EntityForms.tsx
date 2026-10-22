"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveFabricAction, saveSupplierAction } from "@/lib/actions/admin";
import { initialState } from "@/lib/actions/state";
import { FIBERS } from "@/lib/domain/catalog";
import type { Fabric, Supplier } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary px-6" disabled={pending}>{pending ? "…" : label}</button>;
}

function ImageInput({ name, label, current }: { name: string; label: string; current?: string | null }) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fx-mist ring-1 ring-fx-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-gray-400">JPG/PNG</span>}
        </div>
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPreview(URL.createObjectURL(f));
          }}
          className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-fx-ink file:px-3 file:py-1.5 file:text-xs file:text-white"
        />
      </div>
    </label>
  );
}

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const { t } = useI18n();
  const [state, action] = useFormState(saveSupplierAction.bind(null, supplier?.id ?? null), initialState);
  const s = supplier;
  return (
    <form action={action} className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ImageInput name="logo" label={t.suppliers.logo} current={s?.logoUrl} />
      </div>
      <label><span className="label">{t.suppliers.name} *</span><input name="name" required defaultValue={s?.name} className="input" /></label>
      <label><span className="label">{t.suppliers.code} *</span><input name="code" required defaultValue={s?.code} placeholder="APX" className="input uppercase" /></label>
      <label><span className="label">{t.suppliers.country}</span><input name="country" defaultValue={s?.country} className="input" /></label>
      <label><span className="label">{t.suppliers.city}</span><input name="city" defaultValue={s?.city} className="input" /></label>
      <label><span className="label">{t.suppliers.contact}</span><input name="contactName" defaultValue={s?.contactName} className="input" /></label>
      <label><span className="label">{t.suppliers.email}</span><input name="contactEmail" type="email" defaultValue={s?.contactEmail} className="input" /></label>
      <label><span className="label">{t.suppliers.phone}</span><input name="phone" defaultValue={s?.phone} className="input" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">{t.suppliers.tier}</span>
          <select name="tier" defaultValue={s?.tier ?? "approved"} className="input">
            <option value="strategic">{t.suppliers.tierStrategic}</option>
            <option value="approved">{t.suppliers.tierApproved}</option>
            <option value="probation">{t.suppliers.tierProbation}</option>
          </select>
        </label>
        <label>
          <span className="label">{t.suppliers.status}</span>
          <select name="status" defaultValue={s?.status ?? "onboarding"} className="input">
            <option value="active">{t.suppliers.stActive}</option>
            <option value="onboarding">{t.suppliers.stOnboarding}</option>
            <option value="inactive">{t.suppliers.stInactive}</option>
          </select>
        </label>
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <div className="flex justify-end sm:col-span-2"><Submit label={t.common.save} /></div>
    </form>
  );
}

export function FabricForm({ fabric, suppliers, lockSupplier }: { fabric?: Fabric; suppliers: Supplier[]; lockSupplier?: string | null }) {
  const { t, locale } = useI18n();
  const [state, action] = useFormState(saveFabricAction.bind(null, fabric?.id ?? null), initialState);
  const f = fabric;
  const [hex, setHex] = useState(f?.colorHex ?? "#0C2340");
  return (
    <form action={action} className="card grid max-w-3xl gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ImageInput name="photo" label={t.fabrics.photo} current={f?.photoUrl} />
      </div>
      {lockSupplier ? (
        <input type="hidden" name="supplierId" value={lockSupplier} />
      ) : (
        <label className="sm:col-span-2">
          <span className="label">{t.common.supplier} *</span>
          <select name="supplierId" required defaultValue={f?.supplierId} className="input">
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <label><span className="label">{t.fabrics.code} *</span><input name="code" required defaultValue={f?.code} className="input" /></label>
      <label><span className="label">{t.fabrics.name} *</span><input name="name" required defaultValue={f?.name} className="input" /></label>
      <label>
        <span className="label">{t.fabrics.fiber} *</span>
        <select name="fiber" defaultValue={f?.fiber ?? "polyester"} className="input">
          {FIBERS.map((x) => <option key={x.code} value={x.code}>{x.name[locale]}</option>)}
        </select>
      </label>
      <label><span className="label">{t.fabrics.composition}</span><input name="composition" defaultValue={f?.composition} placeholder="100% Polyester" className="input" /></label>
      <label><span className="label">{t.fabrics.construction}</span><input name="construction" defaultValue={f?.construction} placeholder="Double knit / Mesh / Jersey / Piqué" className="input" /></label>
      <label><span className="label">{t.fabrics.weight}</span><input name="weightGsm" type="number" min={40} max={1000} defaultValue={f?.weightGsm ?? ""} className="input" /></label>
      <label><span className="label">{t.fabrics.color}</span><input name="color" defaultValue={f?.color} className="input" /></label>
      <label>
        <span className="label">{t.fabrics.colorHex}</span>
        <div className="flex gap-2">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-fx-line" />
          <input name="colorHex" value={hex} onChange={(e) => setHex(e.target.value)} pattern="#[0-9a-fA-F]{6}" className="input font-mono" />
        </div>
      </label>
      <label><span className="label">{t.fabrics.dyeClass}</span><input name="dyeClass" defaultValue={f?.dyeClass} placeholder="Disperse / Reactive / Cationic" className="input" /></label>
      <label><span className="label">{t.fabrics.finish}</span><input name="finish" defaultValue={f?.finish} className="input" /></label>
      <label className="sm:col-span-2"><span className="label">{t.common.notes}</span><textarea name="notes" rows={2} defaultValue={f?.notes} className="input" /></label>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <div className="flex justify-end sm:col-span-2"><Submit label={t.common.save} /></div>
    </form>
  );
}
