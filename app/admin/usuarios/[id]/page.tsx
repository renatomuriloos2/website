import { createClient } from "@/lib/supabase/server";
import { getAppUserById, getAllClients } from "@/lib/admin-data";
import { updateUserRoleAction, deleteUserAction } from "@/lib/actions/users";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { requireAppUser } from "@/lib/auth";
import { notFound } from "next/navigation";

export default async function EditUsuarioPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { password_set?: string };
}) {
  const currentUser = await requireAppUser("admin");
  const supabase = createClient();
  const [user, clients] = await Promise.all([
    getAppUserById(supabase, params.id),
    getAllClients(supabase),
  ]);

  if (!user) notFound();

  const isSelf = currentUser.id === user.id;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">{user.email}</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">
        {user.role === "admin" ? "Administrador" : `Cliente · ${user.clients?.name ?? "sin vincular"}`}
      </p>

      {searchParams.password_set && (
        <div className="mb-6 rounded-lg border border-rethink-green/30 bg-rethink-green/10 px-4 py-2 text-sm text-rethink-green">
          Contraseña actualizada.
        </div>
      )}

      <div className="card mb-6">
        <h3 className="mb-1 text-sm font-medium text-rethink-cream">Cambiar contraseña</h3>
        <p className="mb-4 text-xs text-rethink-cream/50">
          Se aplica de inmediato, sin enviar correo. Útil para cuentas de prueba o si el
          cliente perdió acceso a su correo.
        </p>
        <SetPasswordForm userId={user.id} />
      </div>

      <div className="card mb-6">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Rol y cliente vinculado</h3>
        <form
          action={updateUserRoleAction.bind(null, user.id)}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="label" htmlFor="role">
              Rol
            </label>
            <select id="role" name="role" defaultValue={user.role} className="input max-w-sm">
              <option value="client">Cliente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="client_id">
              Cliente (si el rol es Cliente)
            </label>
            <select
              id="client_id"
              name="client_id"
              defaultValue={user.client_id ?? ""}
              className="input max-w-sm"
            >
              <option value="">— Ninguno (solo para admins) —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary self-start">
            Guardar cambios
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="mb-1 text-sm font-medium text-rethink-cream">Eliminar cuenta</h3>
        <p className="mb-4 text-xs text-rethink-cream/50">
          Borra el acceso por completo. No se puede deshacer.
        </p>
        {isSelf ? (
          <p className="text-sm text-rethink-cream/50">No puedes eliminar tu propia cuenta.</p>
        ) : (
          <form action={deleteUserAction.bind(null, user.id)}>
            <button type="submit" className="btn-secondary text-red-400">
              Eliminar usuario
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
