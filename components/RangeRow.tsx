"use client";

import { useId } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { upsertRangeAction, deleteRangeAction, ActionState } from "@/lib/actions/admin";
import { ParameterRange } from "@/types/database";

const initialState: ActionState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs">
      {pending ? "Guardando..." : "Guardar"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-red-400 hover:underline disabled:opacity-50"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

export function RangeRow({ range }: { range: ParameterRange }) {
  const saveFormId = useId();
  const [saveState, saveAction] = useFormState(upsertRangeAction, initialState);
  const [deleteState, deleteAction] = useFormState(deleteRangeAction.bind(null, range.id), initialState);

  // A <form> can't wrap multiple <td> cells directly under a <tr> — browsers
  // foster-parent it out of the table on parse, breaking hydration. Instead the
  // save form lives entirely inside one <td>, and the other cells' inputs attach
  // to it via the HTML `form` attribute.
  return (
    <tr className="border-b border-white/5 last:border-0 align-top">
      <td className="py-2 pr-4">
        <input form={saveFormId} type="hidden" name="client_id" value={range.client_id} />
        <input form={saveFormId} type="hidden" name="system" value={range.system} />
        <input form={saveFormId} name="label" defaultValue={range.label} className="input" />
      </td>
      <td className="py-2 pr-4">
        <input form={saveFormId} name="unit" defaultValue={range.unit ?? ""} className="input" />
      </td>
      <td className="py-2 pr-4">
        <input
          form={saveFormId}
          name="min_value"
          type="number"
          step="any"
          defaultValue={range.min_value ?? ""}
          className="input"
        />
      </td>
      <td className="py-2 pr-4">
        <input
          form={saveFormId}
          name="max_value"
          type="number"
          step="any"
          defaultValue={range.max_value ?? ""}
          className="input"
        />
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <form id={saveFormId} action={saveAction} className="contents">
            <input type="hidden" name="id" value={range.id} />
            <SaveButton />
          </form>
          <form action={deleteAction} className="contents">
            <DeleteButton />
          </form>
        </div>
        {(saveState.error || deleteState.error) && (
          <p className="mt-1 text-xs text-red-400">{saveState.error || deleteState.error}</p>
        )}
      </td>
    </tr>
  );
}
