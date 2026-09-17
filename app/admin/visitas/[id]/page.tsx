import { createClient } from "@/lib/supabase/server";
import { getVisitWithDetails } from "@/lib/admin-data";
import { updateVisitAction, deleteVisitAction } from "@/lib/actions/admin";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function EditVisitaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const visit = await getVisitWithDetails(supabase, params.id);

  if (!visit) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">
        Editar visita · {visit.clients?.name ?? "—"}
      </h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        {visit.system} · registrada el {formatDate(visit.visit_date)}
      </p>

      <div className="card mb-6">
        <form
          action={updateVisitAction.bind(null, visit.id)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="label">Fecha de visita</label>
            <input
              name="visit_date"
              type="date"
              required
              defaultValue={visit.visit_date}
              className="input"
            />
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
            <textarea
              name="recommendation"
              rows={3}
              defaultValue={visit.recommendation ?? ""}
              className="input"
            />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="btn-primary">
              Guardar cambios
            </button>
            <button
              type="submit"
              formAction={deleteVisitAction.bind(null, visit.id)}
              className="btn-secondary text-red-400"
            >
              Eliminar visita
            </button>
          </div>
        </form>
      </div>

      <p className="mb-3 text-xs text-rethink-cream/50">
        Las lecturas y la dosificación no se editan aquí. Si necesitas corregirlas, elimina la
        visita y regístrala de nuevo desde Registrar visita.
      </p>

      <div className="mb-6 card">
        <h3 className="mb-3 text-sm font-medium text-rethink-cream">Lecturas registradas</h3>
        {visit.visit_readings.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">Sin lecturas.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-sm text-rethink-cream/80 sm:grid-cols-3">
            {visit.visit_readings.map((r) => (
              <li key={r.id}>
                {r.param_key}: <span className="font-medium text-rethink-cream">{r.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-medium text-rethink-cream">Dosificación registrada</h3>
        {visit.visit_dosing.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">Sin dosificación.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-rethink-cream/80">
            {visit.visit_dosing.map((d) => (
              <li key={d.id}>
                {d.product}: <span className="font-medium text-rethink-cream">{d.dose ?? "—"} {d.unit ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
