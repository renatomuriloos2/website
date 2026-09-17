"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createVisitAction, ActionState } from "@/lib/actions/admin";
import { Client, ParameterRange, SystemType } from "@/types/database";
import { SYSTEMS } from "@/lib/constants";

interface DosingRow {
  product: string;
  dose: string;
  unit: string;
  notes: string;
}

const initialState: ActionState = { error: null };

function systemsFor(client: Client | undefined): SystemType[] {
  return client?.active_systems?.length ? client.active_systems : SYSTEMS;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary self-start">
      {pending ? "Registrando..." : "Registrar visita"}
    </button>
  );
}

export function VisitForm({
  clients,
  allRanges,
}: {
  clients: Client[];
  allRanges: ParameterRange[];
}) {
  const [state, formAction] = useFormState(createVisitAction, initialState);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [system, setSystem] = useState<SystemType>(systemsFor(clients[0])[0] ?? SYSTEMS[0]);

  const currentClient = clients.find((c) => c.id === clientId);
  const availableSystems = systemsFor(currentClient);

  function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    const nextClient = clients.find((c) => c.id === newClientId);
    setSystem(systemsFor(nextClient)[0] ?? SYSTEMS[0]);
  }
  const [readingValues, setReadingValues] = useState<Record<string, string>>({});
  const [dosingRows, setDosingRows] = useState<DosingRow[]>([
    { product: "", dose: "", unit: "", notes: "" },
  ]);

  const ranges = useMemo(
    () => allRanges.filter((r) => r.client_id === clientId && r.system === system),
    [allRanges, clientId, system]
  );

  const readingsJson = useMemo(
    () =>
      JSON.stringify(
        ranges
          .map((r) => ({ param_key: r.param_key, value: Number(readingValues[r.param_key]) }))
          .filter((r) => readingValues[r.param_key] !== undefined && readingValues[r.param_key] !== "")
      ),
    [ranges, readingValues]
  );

  const dosingJson = useMemo(
    () =>
      JSON.stringify(
        dosingRows
          .filter((d) => d.product.trim() !== "")
          .map((d) => ({
            product: d.product,
            dose: d.dose === "" ? null : Number(d.dose),
            unit: d.unit || null,
            notes: d.notes || null,
          }))
      ),
    [dosingRows]
  );

  function updateDosingRow(index: number, field: keyof DosingRow, value: string) {
    setDosingRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addDosingRow() {
    setDosingRows((rows) => [...rows, { product: "", dose: "", unit: "", notes: "" }]);
  }

  function removeDosingRow(index: number) {
    setDosingRows((rows) => rows.filter((_, i) => i !== index));
  }

  if (clients.length === 0) {
    return <p className="card text-sm text-rethink-cream/60">Crea un cliente primero.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="readings" value={readingsJson} />
      <input type="hidden" name="dosing" value={dosingJson} />

      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Cliente</label>
          <select
            name="client_id"
            className="input"
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sistema</label>
          <select
            name="system"
            className="input"
            value={system}
            onChange={(e) => setSystem(e.target.value as SystemType)}
          >
            {availableSystems.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fecha de visita</label>
          <input
            name="visit_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Técnico</label>
          <input name="technician" className="input" />
        </div>
        <div>
          <label className="label">Próxima visita</label>
          <input name="next_visit_date" type="date" className="input" />
        </div>
        <div>
          <label className="label">Prioridad</label>
          <select name="priority" className="input" defaultValue="normal">
            <option value="normal">Normal</option>
            <option value="atencion">Atención</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Recomendación</label>
          <textarea name="recommendation" rows={3} className="input" />
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Lecturas por parámetro</h3>
        {ranges.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">
            Este cliente no tiene parámetros configurados para {system}. Ve a Gestionar rangos.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ranges.map((r) => (
              <div key={r.id}>
                <label className="label">
                  {r.label} {r.unit ? `(${r.unit})` : ""}
                </label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  value={readingValues[r.param_key] ?? ""}
                  onChange={(e) =>
                    setReadingValues((v) => ({ ...v, [r.param_key]: e.target.value }))
                  }
                  placeholder={
                    r.min_value !== null && r.max_value !== null
                      ? `${r.min_value} – ${r.max_value}`
                      : undefined
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Dosificación aplicada</h3>
        <div className="flex flex-col gap-3">
          {dosingRows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
              <input
                placeholder="Producto"
                className="input"
                value={row.product}
                onChange={(e) => updateDosingRow(i, "product", e.target.value)}
              />
              <input
                placeholder="Dosis"
                type="number"
                step="any"
                className="input"
                value={row.dose}
                onChange={(e) => updateDosingRow(i, "dose", e.target.value)}
              />
              <input
                placeholder="Unidad"
                className="input"
                value={row.unit}
                onChange={(e) => updateDosingRow(i, "unit", e.target.value)}
              />
              <input
                placeholder="Notas"
                className="input"
                value={row.notes}
                onChange={(e) => updateDosingRow(i, "notes", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeDosingRow(i)}
                className="btn-secondary text-xs"
              >
                Quitar
              </button>
            </div>
          ))}
          <button type="button" onClick={addDosingRow} className="btn-secondary self-start text-xs">
            Agregar producto
          </button>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
