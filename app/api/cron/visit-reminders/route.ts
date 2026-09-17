import { createAdminClient } from "@/lib/supabase/admin";
import { sendVisitReminderEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface DueVisit {
  id: string;
  client_id: string;
  system: string;
  next_visit_date: string;
  technician_id: string | null;
  clients: { name: string } | null;
}

// Corre una vez al día (ver vercel.json). Revisa las visitas cuya próxima
// fecha cae dentro de los próximos 7 días y todavía no tienen recordatorio
// enviado, y le avisa por correo a cada cuenta cliente vinculada y, si la
// visita tiene un técnico asignado, también a esa cuenta.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadStr = weekAhead.toISOString().slice(0, 10);

  const { data: dueVisits, error: fetchError } = await supabase
    .from("visits")
    .select("id, client_id, system, next_visit_date, technician_id, clients(name)")
    .not("next_visit_date", "is", null)
    .gte("next_visit_date", todayStr)
    .lte("next_visit_date", weekAheadStr)
    .is("reminder_sent_at", null)
    .returns<DueVisit[]>();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }

  let visitsProcessed = 0;
  let emailsSent = 0;
  const failures: string[] = [];

  for (const visit of dueVisits ?? []) {
    const clientName = visit.clients?.name ?? "Cliente";
    const recipients = new Set<string>();

    const { data: clientUsers } = await supabase
      .from("user_clients")
      .select("users(email)")
      .eq("client_id", visit.client_id)
      .returns<{ users: { email: string } | null }[]>();
    for (const row of clientUsers ?? []) {
      if (row.users?.email) recipients.add(row.users.email);
    }

    if (visit.technician_id) {
      const { data: tech } = await supabase
        .from("users")
        .select("email")
        .eq("id", visit.technician_id)
        .single();
      if (tech?.email) recipients.add(tech.email);
    }

    let anyFailed = false;
    for (const email of recipients) {
      try {
        await sendVisitReminderEmail({
          to: email,
          clientName,
          system: visit.system,
          visitDate: visit.next_visit_date,
        });
        emailsSent++;
      } catch (err) {
        anyFailed = true;
        failures.push(`${email}: ${err instanceof Error ? err.message : "error desconocido"}`);
      }
    }

    // Si hubo al menos un fallo, deja reminder_sent_at sin marcar para
    // reintentar mañana; si no había a quién avisar o todo salió bien, se
    // marca para no repetir el recordatorio.
    if (!anyFailed) {
      await supabase
        .from("visits")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", visit.id);
    }
    visitsProcessed++;
  }

  return NextResponse.json({ ok: true, visitsProcessed, emailsSent, failures });
}
