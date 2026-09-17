import { createClient } from "@/lib/supabase/server";
import {
  updateClientAction,
  linkUserAction,
  unlinkUserAction,
  sendPasswordResetAction,
} from "@/lib/actions/admin";
import { notFound } from "next/navigation";
import { Client, AppUser } from "@/types/database";

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { reset_sent?: string };
}) {
  const supabase = createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single<Client>();

  if (!client) notFound();

  const { data: linkedUsers } = await supabase
    .from("users")
    .select("id, email, role, client_id")
    .eq("client_id", params.id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">{client.name}</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">Editar datos del cliente y cuentas vinculadas.</p>

      {searchParams.reset_sent && (
        <div className="mb-6 rounded-lg border border-rethink-green/30 bg-rethink-green/10 px-4 py-2 text-sm text-rethink-green">
          Correo de recuperación enviado a {searchParams.reset_sent}.
        </div>
      )}

      <div className="card mb-6">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Datos del cliente</h3>
        <form action={updateClientAction.bind(null, client.id)} className="flex flex-col gap-3">
          <div>
            <label className="label" htmlFor="name">
              Nombre
            </label>
            <input id="name" name="name" defaultValue={client.name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="location">
              Ubicación
            </label>
            <input
              id="location"
              name="location"
              defaultValue={client.location ?? ""}
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary self-start">
            Guardar cambios
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Cuentas de cliente vinculadas</h3>
        <p className="mb-4 text-xs text-rethink-cream/50">
          Primero crea la cuenta en Supabase → Authentication → Users, copia su UUID y vincúlala
          aquí para que quede scoped a este cliente.
        </p>

        {(linkedUsers as AppUser[] | null)?.length ? (
          <ul className="mb-4 flex flex-col gap-2">
            {(linkedUsers as AppUser[]).map((u) => (
              <li key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-rethink-cream/80">{u.email}</span>
                <div className="flex gap-3">
                  <form action={sendPasswordResetAction}>
                    <input type="hidden" name="email" value={u.email} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <button type="submit" className="text-rethink-cream/60 hover:underline">
                      Enviar recuperación
                    </button>
                  </form>
                  <form action={unlinkUserAction.bind(null, u.id)}>
                    <button type="submit" className="text-red-400 hover:underline">
                      Desvincular
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-rethink-cream/50">Sin cuentas vinculadas todavía.</p>
        )}

        <form action={linkUserAction} className="flex flex-col gap-3">
          <input type="hidden" name="client_id" value={client.id} />
          <div>
            <label className="label" htmlFor="user_id">
              UUID del usuario (Supabase Auth)
            </label>
            <input id="user_id" name="id" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="user_email">
              Correo
            </label>
            <input id="user_email" name="email" type="email" required className="input" />
          </div>
          <button type="submit" className="btn-secondary self-start">
            Vincular
          </button>
        </form>
      </div>
    </div>
  );
}
