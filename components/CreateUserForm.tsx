"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createUserAction, ActionState } from "@/lib/actions/users";
import { Client } from "@/types/database";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Creando..." : "Crear usuario"}
    </button>
  );
}

export function CreateUserForm({
  clients,
  preselectedClientId,
}: {
  clients: Client[];
  preselectedClientId: string;
}) {
  const [state, formAction] = useFormState(createUserAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input id="email" name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input id="password" name="password" type="password" required minLength={8} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="role">
          Rol
        </label>
        <select id="role" name="role" defaultValue="client" className="input">
          <option value="client">Cliente</option>
          <option value="tecnico">Técnico</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="client_id">
          Cliente (si el rol es Cliente)
        </label>
        <select id="client_id" name="client_id" defaultValue={preselectedClientId} className="input">
          <option value="">— Ninguno (solo para admins) —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
