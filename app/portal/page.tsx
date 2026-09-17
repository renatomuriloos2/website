import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PortalRootPage() {
  const appUser = await requireAppUser("client");

  if (appUser.client_ids.length === 0) {
    return (
      <div className="card text-sm text-rethink-cream/70">
        Tu cuenta no tiene ningún cliente asignado todavía. Contacta a tu administrador.
      </div>
    );
  }

  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .in("id", appUser.client_ids)
    .order("name")
    .limit(1);

  redirect(`/portal/${clients?.[0]?.id ?? appUser.client_ids[0]}`);
}
