import { requireAppUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";

const NAV_ITEMS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/visitas/nueva", label: "Registrar visita" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/rangos", label: "Rangos óptimos" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const appUser = await requireAppUser("admin");

  return (
    <Shell navItems={NAV_ITEMS} userEmail={appUser.email} accountHref="/admin/cuenta">
      {children}
    </Shell>
  );
}
