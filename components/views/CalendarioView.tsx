import { createClient } from "@/lib/supabase/server";
import { getClientSystems, getVisits } from "@/lib/portal-data";
import { StatusBadge, PriorityBadge } from "@/components/Badge";
import { formatDate, nextVisitStatus } from "@/lib/utils";

export async function CalendarioView({
  clientId,
  downloadHref,
}: {
  clientId: string;
  downloadHref?: string;
}) {
  const supabase = createClient();

  const systems = await getClientSystems(supabase, clientId);

  const rows = await Promise.all(
    systems.map(async (system) => {
      const visits = await getVisits(supabase, clientId, system);
      const latest = visits[0];
      return { system, latest, visits };
    })
  );

  const currentYear = new Date().getFullYear();
  const visitsThisYear = rows
    .flatMap((r) => r.visits)
    .filter((v) => new Date(v.visit_date + "T00:00:00").getFullYear() === currentYear)
    .sort((a, b) => (a.visit_date < b.visit_date ? 1 : -1));

  const hasUpcoming = rows.some((r) => r.latest?.next_visit_date);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Calendario</h1>
          <p className="text-sm text-rethink-cream/60">
            Próxima fecha de análisis por sistema y visitas realizadas en {currentYear}.
          </p>
        </div>
        {downloadHref && hasUpcoming && (
          <a href={downloadHref} className="btn-secondary text-xs" download>
            Descargar calendario (.ics)
          </a>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ system, latest }) => {
          const status = latest ? nextVisitStatus(latest.next_visit_date) : null;
          return (
            <div key={system} className="card">
              <h3 className="mb-2 text-sm font-medium text-rethink-cream">{system}</h3>
              {latest?.next_visit_date ? (
                <>
                  <p className="text-lg font-semibold text-rethink-cream">
                    {formatDate(latest.next_visit_date)}
                  </p>
                  {status && (
                    <div className="mt-2">
                      <StatusBadge status={status} />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-rethink-cream/50">Sin próxima visita programada.</p>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="mb-3 text-sm font-medium text-rethink-cream">Visitas realizadas en {currentYear}</h3>
      {visitsThisYear.length === 0 ? (
        <p className="card text-sm text-rethink-cream/60">Aún no hay visitas registradas este año.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-rethink-cream/50">
                <th className="py-2 pr-4 font-normal">Fecha</th>
                <th className="py-2 pr-4 font-normal">Sistema</th>
                <th className="py-2 pr-4 font-normal">Técnico</th>
                <th className="py-2 font-normal">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {visitsThisYear.map((v) => (
                <tr key={v.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-rethink-cream/80">{formatDate(v.visit_date)}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.system}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.technician ?? "—"}</td>
                  <td className="py-2">
                    <PriorityBadge priority={v.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
