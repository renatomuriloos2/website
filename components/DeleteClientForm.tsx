"use client";

import { useFormState, useFormStatus } from "react-dom";
import { deleteClientAction, ActionState } from "@/lib/actions/admin";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-red-400 hover:underline disabled:opacity-50">
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export function DeleteClientForm({ clientId }: { clientId: string }) {
  const action = deleteClientAction.bind(null, clientId);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="inline">
      <SubmitButton />
      {state.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
