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
    { group: "Asistente WhatsApp" },
    { href: "/admin/whatsapp", label: "Panel del bot" },
    { href: "/admin/whatsapp/contactos", label: "Conversaciones" },
    { href: "/admin/whatsapp/conocimiento", label: "Base de conocimiento" },
    ...(appUser.role === "admin"
      ? [
          { href: "/admin/whatsapp/costos", label: "Costos de IA" },
          { href: "/admin/whatsapp/probar", label: "Probar el bot" },
          { href: "/admin/whatsapp/configuracion", label: "Configuración" },
        ]
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
