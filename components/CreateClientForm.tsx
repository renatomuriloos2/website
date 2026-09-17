"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClientAction, ActionState } from "@/lib/actions/admin";
import { SystemCheckboxes } from "@/components/SystemCheckboxes";
import { SYSTEMS } from "@/lib/constants";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Creando..." : "Crear cliente"}
    </button>
  );
}

export function CreateClientForm() {
  const [state, formAction] = useFormState(createClientAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input id="name" name="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="location">
          Ubicación
        </label>
        <input id="location" name="location" className="input" />
      </div>
      <SystemCheckboxes selected={SYSTEMS} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
