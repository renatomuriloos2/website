"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateVisitAction, deleteVisitAction, ActionState } from "@/lib/actions/admin";
import { Visit } from "@/types/database";

const initialState: ActionState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

function DeleteButton({ formAction }: { formAction: (formData: FormData) => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      className="btn-secondary text-red-400"
    >
      {pending ? "Eliminando..." : "Eliminar visita"}
    </button>
  );
}

export function EditVisitForm({ visit }: { visit: Visit }) {
  const [saveState, saveAction] = useFormState(updateVisitAction.bind(null, visit.id), initialState);
  const [deleteState, deleteAction] = useFormState(deleteVisitAction.bind(null, visit.id), initialState);

  return (
    <form action={saveAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="label">Fecha de visita</label>
        <input name="visit_date" type="date" required defaultValue={visit.visit_date} className="input" />
      </div>
      <div>
        <label className="label">Técnico</label>
        <input name="technician" defaultValue={visit.technician ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Próxima visita</label>
        <input
          name="next_visit_date"
          type="date"
          defaultValue={visit.next_visit_date ?? ""}
          className="input"
        />
      </div>
      <div>
        <label className="label">Prioridad</label>
        <select name="priority" defaultValue={visit.priority} className="input">
          <option value="normal">Normal</option>
          <option value="atencion">Atención</option>
          <option value="urgente">Urgente</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label">Recomendación</label>
        <textarea name="recommendation" rows={3} defaultValue={visit.recommendation ?? ""} className="input" />
      </div>
      {(saveState.error || deleteState.error) && (
        <p className="sm:col-span-2 text-sm text-red-400">{saveState.error || deleteState.error}</p>
      )}
      <div className="sm:col-span-2 flex gap-3">
        <SaveButton />
        <DeleteButton formAction={deleteAction} />
      </div>
    </form>
  );
}
