import { createClient } from "@/lib/supabase/server";
import { getRecentVisits } from "@/lib/admin-data";
import { PriorityBadge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";
import { DeleteVisitForm } from "@/components/DeleteVisitForm";
import Link from "next/link";

export default async function VisitasPage({
  searchParams,
}: {
  searchParams: { created?: string };
}) {
  const supabase = createClient();
  const visits = await getRecentVisits(supabase, 200);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Visitas</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Todas las visitas registradas. Edita o elimina una si hubo un error de captura.
      </p>

      {searchParams.created && (
        <div className="mb-6 rounded-lg border border-rethink-green/30 bg-rethink-green/10 px-4 py-2 text-sm text-rethink-green">
          Visita registrada.
        </div>
      )}

      <div className="card overflow-x-auto">
        {visits.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">Sin visitas registradas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-rethink-cream/50">
                <th className="py-2 pr-4 font-normal">Fecha</th>
                <th className="py-2 pr-4 font-normal">Cliente</th>
                <th className="py-2 pr-4 font-normal">Sistema</th>
                <th className="py-2 pr-4 font-normal">Técnico</th>
                <th className="py-2 pr-4 font-normal">Prioridad</th>
                <th className="py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-rethink-cream/80">{formatDate(v.visit_date)}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.clients?.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.system}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.technician ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <PriorityBadge priority={v.priority} />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/visitas/${v.id}`} className="text-rethink-orange hover:underline">
                        Editar
                      </Link>
                      <DeleteVisitForm visitId={v.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
