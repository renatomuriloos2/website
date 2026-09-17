import { createClient } from "@/lib/supabase/server";
import { getClientSystems, getVisits } from "@/lib/portal-data";
import { StatusBadge } from "@/components/Badge";
import { formatDate, nextVisitStatus } from "@/lib/utils";

export async function CalendarioView({ clientId }: { clientId: string }) {
  const supabase = createClient();

  const systems = await getClientSystems(supabase, clientId);

  const rows = await Promise.all(
    systems.map(async (system) => {
      const visits = await getVisits(supabase, clientId, system);
      const latest = visits[0];
      return { system, latest };
    })
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Calendario</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Próxima fecha de análisis por sistema.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ system, latest }) => {
          const status = latest ? nextVisitStatus(latest.next_visit_date) : null;
          return (
            <div key={system} className="card">
              <h3 className="mb-2 text-sm font-medium text-rethink-cream">{system}</h3>
              {latest ? (
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
    </div>
  );
}
