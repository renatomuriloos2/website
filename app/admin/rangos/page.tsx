import { createClient } from "@/lib/supabase/server";
import { getAllClients } from "@/lib/admin-data";
import { ClientSystemSwitcher } from "@/components/ClientSystemSwitcher";
import { RangeRow } from "@/components/RangeRow";
import { AddRangeForm } from "@/components/AddRangeForm";
import { SYSTEMS } from "@/lib/constants";
import { ParameterRange, SystemType } from "@/types/database";

export default async function RangosPage({
  searchParams,
}: {
  searchParams: { client_id?: string; system?: string };
}) {
  const supabase = createClient();
  const clients = await getAllClients(supabase);

  if (clients.length === 0) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Rangos óptimos</h1>
        <p className="card text-sm text-rethink-cream/60">
          Crea un cliente primero en Gestionar clientes.
        </p>
      </div>
    );
  }

  const clientId = searchParams.client_id ?? clients[0].id;
  const selectedClient = clients.find((c) => c.id === clientId);
  const clientSystems = selectedClient?.active_systems?.length
    ? selectedClient.active_systems
    : SYSTEMS;
  const system = (searchParams.system as SystemType) ?? clientSystems[0];

  const { data: ranges } = await supabase
    .from("parameter_ranges")
    .select("*")
    .eq("client_id", clientId)
    .eq("system", system)
    .order("label")
    .returns<ParameterRange[]>();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Rangos óptimos</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        Edita mínimos y máximos por cliente y sistema, o agrega parámetros personalizados.
      </p>

      <ClientSystemSwitcher clients={clients} currentClientId={clientId} currentSystem={system} />

      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-rethink-cream/50">
              <th className="py-2 pr-4 font-normal">Parámetro</th>
              <th className="py-2 pr-4 font-normal">Unidad</th>
              <th className="py-2 pr-4 font-normal">Mínimo</th>
              <th className="py-2 pr-4 font-normal">Máximo</th>
              <th className="py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {(ranges ?? []).map((r) => (
              <RangeRow key={r.id} range={r} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Agregar parámetro personalizado</h3>
        <AddRangeForm clientId={clientId} system={system} />
      </div>
    </div>
  );
}
