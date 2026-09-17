"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateUserRoleAction, ActionState } from "@/lib/actions/users";
import { Client, Role } from "@/types/database";

const initialState: ActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary self-start">
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

export function UpdateRoleForm({
  userId,
  currentRole,
  currentClientId,
  clients,
}: {
  userId: string;
  currentRole: Role;
  currentClientId: string | null;
  clients: Client[];
}) {
  const action = updateUserRoleAction.bind(null, userId);
  const [state, formAction] = useFormState(action, initialState);
  const [role, setRole] = useState<Role>(currentRole);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="role">
          Rol
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="input max-w-sm"
        >
          <option value="client">Cliente</option>
          <option value="tecnico">Técnico</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      {role === "client" ? (
        <div>
          <label className="label" htmlFor="client_id">
            Cliente
          </label>
          <select
            id="client_id"
            name="client_id"
            defaultValue={currentClientId ?? ""}
            className="input max-w-sm"
          >
            <option value="">— Selecciona un cliente —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-rethink-cream/50">
          {role === "tecnico"
            ? "Los técnicos ven y operan todos los clientes — no se vinculan a uno solo."
            : "Los administradores tienen acceso completo — no se vinculan a un cliente."}
        </p>
      )}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
