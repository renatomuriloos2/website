import { requireAppUser } from "@/lib/auth";
import { Shell, NavItem } from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const appUser = await requireAppUser(["admin", "tecnico"]);

  const navItems: NavItem[] = [
    { href: "/admin", label: "Inicio" },
    { href: "/admin/visitas/nueva", label: "Registrar visita" },
    { href: "/admin/visitas", label: "Visitas" },
    { href: "/admin/clientes", label: "Clientes" },
    { href: "/admin/rangos", label: "Rangos óptimos" },
    ...(appUser.role === "admin"
      ? [{ href: "/admin/usuarios", label: "Usuarios" }]
      : []),
    { group: "Portal de clientes" },
    { href: "/admin/portal", label: "Ver como cliente" },
  ];

  return (
    <Shell navItems={navItems} userEmail={appUser.email} accountHref="/admin/cuenta">
      {children}
    </Shell>
  );
}
