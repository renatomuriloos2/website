import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllClients } from "@/lib/admin-data";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminPortalLandingPage() {
  await requireAppUser("admin");
  const supabase = createClient();
  const clients = await getAllClients(supabase);

  if (clients.length === 0) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Ver como cliente</h1>
        <p className="card text-sm text-rethink-cream/60">
          Todavía no hay clientes.{" "}
          <Link href="/admin/clientes" className="text-rethink-orange hover:underline">
            Crea uno primero
          </Link>
          .
        </p>
      </div>
    );
  }

  redirect(`/admin/portal/${clients[0].id}`);
}
