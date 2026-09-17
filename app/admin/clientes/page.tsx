import { createClient } from "@/lib/supabase/server";
import { getAllClients, getAllAppUsers } from "@/lib/admin-data";
import { CreateClientForm } from "@/components/CreateClientForm";
import { DeleteClientForm } from "@/components/DeleteClientForm";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function ClientesPage() {
  const supabase = createClient();
  const [clients, users] = await Promise.all([getAllClients(supabase), getAllAppUsers(supabase)]);

  const userCountByClient = new Map<string, number>();
  for (const u of users) {
    if (u.client_id) userCountByClient.set(u.client_id, (userCountByClient.get(u.client_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Gestionar clientes</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Alta, edición y baja de clientes. Al crear un cliente se generan sus rangos óptimos por
        defecto para los sistemas que marques.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <h3 className="mb-4 text-sm font-medium text-rethink-cream">Clientes ({clients.length})</h3>
          {clients.length === 0 ? (
            <p className="text-sm text-rethink-cream/50">Aún no hay clientes.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-rethink-cream/50">
                  <th className="py-2 pr-4 font-normal">Nombre</th>
                  <th className="py-2 pr-4 font-normal">Ubicación</th>
                  <th className="py-2 pr-4 font-normal">Usuarios</th>
                  <th className="py-2 pr-4 font-normal">Creado</th>
                  <th className="py-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-4 text-rethink-cream/80">{c.name}</td>
                    <td className="py-2 pr-4 text-rethink-cream/80">{c.location ?? "—"}</td>
                    <td className="py-2 pr-4 text-rethink-cream/80">
                      {userCountByClient.get(c.id) ?? 0}
                    </td>
                    <td className="py-2 pr-4 text-rethink-cream/80">{formatDate(c.created_at)}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/portal/${c.id}`} className="text-rethink-cream/70 hover:underline">
                          Ver portal
                        </Link>
                        <Link href={`/admin/clientes/${c.id}`} className="text-rethink-orange hover:underline">
                          Editar
                        </Link>
                        <DeleteClientForm clientId={c.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 text-sm font-medium text-rethink-cream">Nuevo cliente</h3>
          <CreateClientForm />
        </div>
      </div>
    </div>
  );
}
