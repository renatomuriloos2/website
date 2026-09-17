"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateClientAction, ActionState } from "@/lib/actions/admin";
import { SystemCheckboxes } from "@/components/SystemCheckboxes";
import { SYSTEMS } from "@/lib/constants";
import { Client } from "@/types/database";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary self-start">
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

export function EditClientForm({ client }: { client: Client }) {
  const action = updateClientAction.bind(null, client.id);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input id="name" name="name" defaultValue={client.name} required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="location">
          Ubicación
        </label>
        <input id="location" name="location" defaultValue={client.location ?? ""} className="input" />
      </div>
      <SystemCheckboxes selected={client.active_systems?.length ? client.active_systems : SYSTEMS} />
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
