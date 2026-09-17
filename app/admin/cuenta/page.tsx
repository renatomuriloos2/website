import { requireAppUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function AdminCuentaPage() {
  const appUser = await requireAppUser(["admin", "tecnico"]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-rethink-cream">Mi cuenta</h1>
      <p className="mb-6 text-sm text-rethink-cream/60">{appUser.email}</p>
      <ChangePasswordForm />
    </div>
  );
}
