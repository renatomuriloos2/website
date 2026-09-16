import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientSystems, getDosingForVisits, getVisits } from "@/lib/portal-data";
import { SystemSwitcher } from "@/components/SystemSwitcher";
import { SystemType } from "@/types/database";
import { formatDate } from "@/lib/utils";

export default async function DosificacionPage({
  searchParams,
}: {
  searchParams: { system?: string };
}) {
  const appUser = await requireAppUser("client");
  const supabase = createClient();
  const clientId = appUser.client_id!;

  const systems = await getClientSystems(supabase, clientId);
  const system = (searchParams.system as SystemType) ?? systems[0];

  const visits = await getVisits(supabase, clientId, system);
  const dosing = await getDosingForVisits(
    supabase,
    visits.map((v) => v.id)
  );
  const visitById = new Map(visits.map((v) => [v.id, v]));

  const rows = dosing
    .map((d) => ({ ...d, visit: visitById.get(d.visit_id) }))
    .filter((d) => d.visit)
    .sort((a, b) => b.visit!.visit_date.localeCompare(a.visit!.visit_date));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Dosificación</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Bitácora de productos aplicados en cada visita.
      </p>
      <SystemSwitcher systems={systems} current={system} />

      <div className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">Sin registros de dosificación todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-rethink-cream/50">
                <th className="py-2 pr-4 font-normal">Fecha</th>
                <th className="py-2 pr-4 font-normal">Producto</th>
                <th className="py-2 pr-4 font-normal">Dosis</th>
                <th className="py-2 font-normal">Notas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-rethink-cream/80">
                    {formatDate(d.visit!.visit_date)}
                  </td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{d.product}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">
                    {d.dose ?? "—"} {d.unit ?? ""}
                  </td>
                  <td className="py-2 text-rethink-cream/80">{d.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
