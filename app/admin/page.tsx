import { createClient } from "@/lib/supabase/server";
import { getAllClients, getRecentVisits } from "@/lib/admin-data";
import { PriorityBadge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function AdminHomePage() {
  const supabase = createClient();
  const [clients, visits] = await Promise.all([
    getAllClients(supabase),
    getRecentVisits(supabase, 10),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Panel de administrador</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        {clients.length} cliente{clients.length === 1 ? "" : "s"} registrado
        {clients.length === 1 ? "" : "s"}.
      </p>

      <div className="mb-6 flex gap-3">
        <Link href="/admin/visitas/nueva" className="btn-primary">
          Registrar visita
        </Link>
        <Link href="/admin/clientes" className="btn-secondary">
          Gestionar clientes
        </Link>
        <Link href="/admin/rangos" className="btn-secondary">
          Gestionar rangos
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Últimas visitas</h3>
        {visits.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">Sin visitas registradas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-rethink-cream/50">
                <th className="py-2 pr-4 font-normal">Fecha</th>
                <th className="py-2 pr-4 font-normal">Cliente</th>
                <th className="py-2 pr-4 font-normal">Sistema</th>
                <th className="py-2 font-normal">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-rethink-cream/80">{formatDate(v.visit_date)}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.clients?.name ?? "—"}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.system}</td>
                  <td className="py-2">
                    <PriorityBadge priority={v.priority} />
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
