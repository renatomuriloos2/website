import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientSystems, getParameterRanges, getReadingsForVisits, getVisits } from "@/lib/portal-data";
import { SystemSwitcher } from "@/components/SystemSwitcher";
import { RangeBadge } from "@/components/Badge";
import { SystemType } from "@/types/database";
import { formatDate, isOutOfRange } from "@/lib/utils";

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: { system?: string };
}) {
  const appUser = await requireAppUser("client");
  const supabase = createClient();
  const clientId = appUser.client_id!;

  const systems = await getClientSystems(supabase, clientId);
  const system = (searchParams.system as SystemType) ?? systems[0];

  const [ranges, visits] = await Promise.all([
    getParameterRanges(supabase, clientId, system),
    getVisits(supabase, clientId, system),
  ]);

  const latestVisit = visits[0];
  const readings = latestVisit ? await getReadingsForVisits(supabase, [latestVisit.id]) : [];
  const readingByParam = new Map(readings.map((r) => [r.param_key, r.value]));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Resumen</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Última lectura de cada parámetro frente a su rango óptimo.
      </p>
      <SystemSwitcher systems={systems} current={system} />

      {latestVisit ? (
        <p className="mb-4 text-xs text-rethink-cream/50">
          Última visita: {formatDate(latestVisit.visit_date)}
          {latestVisit.technician ? ` · ${latestVisit.technician}` : ""}
        </p>
      ) : (
        <p className="mb-4 text-xs text-rethink-cream/50">Aún no hay visitas registradas para este sistema.</p>
      )}

      {ranges.length === 0 ? (
        <p className="card text-sm text-rethink-cream/60">
          No hay parámetros configurados para {system} todavía.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranges.map((range) => {
            const value = readingByParam.get(range.param_key);
            const outOfRange =
              value !== undefined ? isOutOfRange(value, range.min_value, range.max_value) : false;
            return (
              <div key={range.id} className="card">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-rethink-cream">{range.label}</h3>
                  {value !== undefined && <RangeBadge outOfRange={outOfRange} />}
                </div>
                <p className="text-2xl font-semibold text-rethink-cream">
                  {value !== undefined ? value : "—"}
                  {value !== undefined && range.unit && (
                    <span className="ml-1 text-sm font-normal text-rethink-cream/50">{range.unit}</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-rethink-cream/50">
                  Rango óptimo: {range.min_value ?? "s/l"} – {range.max_value ?? "s/l"}{" "}
                  {range.unit}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
