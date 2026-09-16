import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getClientSystems,
  getParameterRanges,
  getReadingsForVisits,
  getVisits,
} from "@/lib/portal-data";
import { SystemSwitcher } from "@/components/SystemSwitcher";
import { HistoryView } from "@/components/HistoryView";
import { SystemType } from "@/types/database";

export default async function HistorialPage({
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

  const visitsAsc = [...visits].sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const readings = await getReadingsForVisits(
    supabase,
    visitsAsc.map((v) => v.id)
  );

  const visitDateById = new Map(visitsAsc.map((v) => [v.id, v.visit_date]));
  const seriesByParam: Record<string, { date: string; value: number }[]> = {};
  for (const reading of readings) {
    const date = visitDateById.get(reading.visit_id);
    if (!date) continue;
    if (!seriesByParam[reading.param_key]) seriesByParam[reading.param_key] = [];
    seriesByParam[reading.param_key].push({ date, value: reading.value });
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Historial</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Tendencia por parámetro y bitácora de visitas.
      </p>
      <SystemSwitcher systems={systems} current={system} />
      <HistoryView
        params={ranges}
        seriesByParam={seriesByParam}
        visits={visits.map((v) => ({
          id: v.id,
          visit_date: v.visit_date,
          technician: v.technician,
          priority: v.priority,
          recommendation: v.recommendation,
        }))}
        systemLabel={system}
      />
    </div>
  );
}
