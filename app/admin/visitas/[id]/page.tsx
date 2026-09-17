import { createClient } from "@/lib/supabase/server";
import { getVisitWithDetails, getTecnicoUsers } from "@/lib/admin-data";
import { EditVisitForm } from "@/components/EditVisitForm";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function EditVisitaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [visit, tecnicos] = await Promise.all([
    getVisitWithDetails(supabase, params.id),
    getTecnicoUsers(supabase),
  ]);

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
        <EditVisitForm visit={visit} tecnicos={tecnicos} />
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
