import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getVisits } from "@/lib/portal-data";
import { PriorityBadge } from "@/components/Badge";
import { formatDate } from "@/lib/utils";

export default async function RecomendacionesPage() {
  const appUser = await requireAppUser("client");
  const supabase = createClient();
  const clientId = appUser.client_id!;

  const visits = (await getVisits(supabase, clientId)).filter((v) => v.recommendation);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Recomendaciones</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Feed de recomendaciones de todos los sistemas, con prioridad.
      </p>

      {visits.length === 0 ? (
        <p className="card text-sm text-rethink-cream/60">No hay recomendaciones registradas todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visits.map((v) => (
            <div key={v.id} className="card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="badge bg-white/10 text-rethink-cream/80">{v.system}</span>
                  <span className="text-xs text-rethink-cream/50">{formatDate(v.visit_date)}</span>
                </div>
                <PriorityBadge priority={v.priority} />
              </div>
              <p className="text-sm text-rethink-cream/90">{v.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
