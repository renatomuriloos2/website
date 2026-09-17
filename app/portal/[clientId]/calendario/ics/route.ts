import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/lib/auth";
import { getUpcomingVisits } from "@/lib/portal-data";
import { buildIcsCalendar, IcsEvent } from "@/lib/ics";
import { redirect } from "next/navigation";

export async function GET(_request: Request, { params }: { params: { clientId: string } }) {
  const appUser = await requireAppUser("client");
  if (!appUser.client_ids.includes(params.clientId)) {
    redirect("/portal");
  }

  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", params.clientId)
    .single();

  const upcoming = await getUpcomingVisits(supabase, params.clientId);

  const events: IcsEvent[] = upcoming.map((v) => ({
    uid: `visit-${v.id}-next`,
    title: `Visita técnica Rethink — ${v.system}`,
    description: `Visita programada de tratamiento de agua (${v.system}) para ${client?.name ?? "cliente"}.`,
    date: v.date,
  }));

  const ics = buildIcsCalendar(events, `Visitas Rethink — ${client?.name ?? "Cliente"}`);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="visitas-rethink.ics"',
    },
  });
}
