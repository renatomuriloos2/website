import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllClients } from "@/lib/admin-data";
import { AdminClientSwitcher } from "@/components/AdminClientSwitcher";
import { AdminPortalTabs } from "@/components/AdminPortalTabs";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function AdminPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clientId: string };
}) {
  await requireAppUser(["admin", "tecnico"]);
  const supabase = createClient();

  const [clients, { data: client }] = await Promise.all([
    getAllClients(supabase),
    supabase.from("clients").select("id, name").eq("id", params.clientId).single(),
  ]);

  if (!client) notFound();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-rethink-cream/40">
            Viendo el portal como
          </p>
          <h2 className="text-lg font-semibold text-rethink-cream">{client.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          <AdminClientSwitcher clients={clients} currentClientId={params.clientId} />
          <Link href="/admin/clientes" className="btn-secondary text-xs">
            Volver a clientes
          </Link>
        </div>
      </div>
      <div className="mb-6 rounded-lg border border-rethink-amber/30 bg-rethink-amber/10 px-4 py-2 text-xs text-rethink-amber">
        Estás viendo el portal tal como lo ve este cliente. Para registrar visitas o editar
        rangos, usa las secciones de Administración.
      </div>
      <AdminPortalTabs clientId={params.clientId} />
      {children}
    </div>
  );
}
