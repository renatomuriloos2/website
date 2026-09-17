import { createClient } from "@/lib/supabase/server";
import { getAllClients, getRecentVisits } from "@/lib/admin-data";
import { PriorityBadge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { seedDemoDataAction, clearDemoDataAction } from "@/lib/actions/demo";

export default async function AdminHomePage() {
  const supabase = createClient();
  const [clients, visits] = await Promise.all([
    getAllClients(supabase),
    getRecentVisits(supabase, 10),
  ]);

  const demoClientCount = clients.filter((c) => c.name.startsWith("[Demo] ")).length;

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

      <div className="card mb-6">
        <h3 className="mb-1 text-sm font-medium text-rethink-cream">Datos de demostración</h3>
        <p className="mb-4 text-xs text-rethink-cream/50">
          Crea 3 clientes de ejemplo ({demoClientCount > 0 ? `ya hay ${demoClientCount} cargados` : "ninguno cargado"}) con rangos,
          visitas, lecturas y dosificación reales en tu base de datos, para explorar la app con
          datos de muestra. Se identifican con el prefijo &quot;[Demo]&quot; y se pueden borrar
          en cualquier momento sin afectar clientes reales.
        </p>
        <div className="flex gap-3">
          <form action={seedDemoDataAction}>
            <button type="submit" className="btn-primary">
              Cargar datos de demostración
            </button>
          </form>
          <form action={clearDemoDataAction}>
            <button type="submit" className="btn-secondary">
              Borrar datos de demostración
            </button>
          </form>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-rethink-cream">Últimas visitas</h3>
          <Link href="/admin/visitas" className="text-xs text-rethink-orange hover:underline">
            Ver todas
          </Link>
        </div>
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
