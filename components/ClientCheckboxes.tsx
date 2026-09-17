import { Client } from "@/types/database";

export function ClientCheckboxes({ clients, selected }: { clients: Client[]; selected: string[] }) {
  return (
    <div>
      <label className="label">Clientes asignados</label>
      {clients.length === 0 ? (
        <p className="text-xs text-rethink-cream/50">No hay clientes creados todavía.</p>
      ) : (
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-lg border border-surface/15 p-3">
          {clients.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-rethink-cream/80">
              <input
                type="checkbox"
                name="client_ids"
                value={c.id}
                defaultChecked={selected.includes(c.id)}
                className="accent-rethink-orange"
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-rethink-cream/40">
        Un usuario puede tener acceso a varios clientes a la vez (ej. si administra más de una
        planta). Marca todos los que correspondan.
      </p>
    </div>
  );
}
