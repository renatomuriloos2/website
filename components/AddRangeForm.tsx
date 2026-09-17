"use client";

import { useFormState, useFormStatus } from "react-dom";
import { upsertRangeAction, ActionState } from "@/lib/actions/admin";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary self-end sm:col-span-4 sm:w-fit">
      {pending ? "Agregando..." : "Agregar parámetro"}
    </button>
  );
}

export function AddRangeForm({ clientId, system }: { clientId: string; system: string }) {
  const [state, formAction] = useFormState(upsertRangeAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="system" value={system} />
      <div>
        <label className="label">Nombre</label>
        <input name="label" required className="input" />
      </div>
      <div>
        <label className="label">Unidad</label>
        <input name="unit" className="input" />
      </div>
      <div>
        <label className="label">Mínimo</label>
        <input name="min_value" type="number" step="any" className="input" />
      </div>
      <div>
        <label className="label">Máximo</label>
        <input name="max_value" type="number" step="any" className="input" />
      </div>
      {state.error && <p className="text-sm text-red-400 sm:col-span-4">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
