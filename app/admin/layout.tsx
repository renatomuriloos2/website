import { requireAppUser } from "@/lib/auth";
import { Shell, NavItem } from "@/components/Shell";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/visitas/nueva", label: "Registrar visita" },
  { href: "/admin/visitas", label: "Visitas" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/rangos", label: "Rangos óptimos" },
  { group: "Portal de clientes" },
  { href: "/admin/portal", label: "Ver como cliente" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const appUser = await requireAppUser("admin");

  return (
    <Shell navItems={NAV_ITEMS} userEmail={appUser.email} accountHref="/admin/cuenta">
      {children}
    </Shell>
  );
}
