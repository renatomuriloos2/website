"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createApiKeyAction, createUserAction, loadSampleAction, markNotificationsReadAction, removeSampleAction, revokeApiKeyAction, setUserActiveAction } from "@/lib/actions/admin";
import { initialState } from "@/lib/actions/state";
import type { Supplier } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "./icons";

function Submit({ label, icon = "plus" }: { label: string; icon?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      <Icon name={icon} className="h-4 w-4" />
      {pending ? "…" : label}
    </button>
  );
}

function Secret({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <div className="mb-2 font-semibold text-emerald-800">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs ring-1 ring-emerald-200">{value}</code>
        <button type="button" className="btn-ghost py-2" onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true))}>
          {copied ? "✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function CreateUserForm({ suppliers, defaultSupplier }: { suppliers: Supplier[]; defaultSupplier?: string }) {
  const { t } = useI18n();
  const [state, action] = useFormState(createUserAction, initialState);
  const [role, setRole] = useState(defaultSupplier ? "supplier" : "supplier");
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="label">{t.users.fullName}</span><input name="fullName" required className="input" /></label>
        <label><span className="label">{t.users.email}</span><input name="email" type="email" required className="input" /></label>
        <label>
          <span className="label">{t.users.role}</span>
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className="input">
            <option value="supplier">{t.users.roleSupplier}</option>
            <option value="reviewer">{t.users.roleReviewer}</option>
            <option value="admin">{t.users.roleAdmin}</option>
          </select>
        </label>
        {role === "supplier" && (
          <label>
            <span className="label">{t.common.supplier}</span>
            <select name="supplierId" defaultValue={defaultSupplier} required className="input">
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500">{t.users.tempHint}</p>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error === "supplier_required" ? t.users.supplierRequired : state.error}</p>}
      {state.ok && state.data && <Secret label={`${t.users.created} — ${state.data.email}`} value={state.data.password} />}
      <div className="flex justify-end"><Submit label={t.users.new} /></div>
    </form>
  );
}

export function ToggleUser({ id, active, labels }: { id: string; active: boolean; labels: { enable: string; disable: string } }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => setUserActiveAction(id, !active))} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${active ? "text-red-600 ring-red-200 hover:bg-red-50" : "text-emerald-700 ring-emerald-200 hover:bg-emerald-50"}`}>
      {active ? labels.disable : labels.enable}
    </button>
  );
}

export function ApiKeyForm() {
  const { t } = useI18n();
  const [state, action] = useFormState(createApiKeyAction, initialState);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1"><span className="label">{t.settings.keyName}</span><input name="name" required placeholder="Power BI – Global Sourcing" className="input" /></label>
        <Submit label={t.settings.newKey} icon="key" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && state.data && <Secret label={t.settings.copyNow} value={state.data.token} />}
    </form>
  );
}

export function RevokeKey({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => confirm("Revoke this key?") && start(() => revokeApiKeyAction(id))} className="text-xs font-semibold text-red-600 hover:underline">
      {label}
    </button>
  );
}

export function MarkAllRead({ label }: { label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => markNotificationsReadAction())} className="btn-ghost">
      <Icon name="check" className="h-4 w-4" /> {label}
    </button>
  );
}

export function SampleDataCard() {
  const { locale } = useI18n();
  const es = locale === "es";
  const [loadState, load] = useFormState(loadSampleAction, initialState);
  const [removeState, remove] = useFormState(removeSampleAction, initialState);
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {es
          ? "Carga un conjunto de datos de ejemplo (4 mills, 16 telas, ~60 lotes con resultados por color, decisiones y re-tests) para explorar dashboards, tablero y dossiers. Los datos son sintéticos, quedan marcados como ejemplo y se eliminan con un clic."
          : "Load a sample dataset (4 mills, 16 fabrics, ~60 lots with per-color results, decisions and retests) to explore dashboards, board and dossiers. The data is synthetic, flagged as sample and removable in one click."}
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={load}>
          <Submit label={es ? "Cargar datos de ejemplo" : "Load sample data"} icon="spark" />
        </form>
        <form action={remove} onSubmit={(e) => { if (!confirm(es ? "¿Eliminar todos los datos de ejemplo?" : "Remove all sample data?")) e.preventDefault(); }}>
          <button className="btn-ghost">
            <Icon name="x" className="h-4 w-4" />
            {es ? "Eliminar datos de ejemplo" : "Remove sample data"}
          </button>
        </form>
      </div>
      {(loadState.error || removeState.error) && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadState.error || removeState.error}</p>}
      {loadState.ok && !removeState.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {es ? "Lotes cargados" : "Lots loaded"}: {loadState.ok.split(":")[1]}</p>}
      {removeState.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✓ {es ? "Datos de ejemplo eliminados" : "Sample data removed"}</p>}
    </div>
  );
}
