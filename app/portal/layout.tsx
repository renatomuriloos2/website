import { requireAppUser } from "@/lib/auth";
import { Shell } from "@/components/Shell";

const NAV_ITEMS = [
  { href: "/portal", label: "Resumen" },
  { href: "/portal/historial", label: "Historial" },
  { href: "/portal/dosificacion", label: "Dosificación" },
  { href: "/portal/recomendaciones", label: "Recomendaciones" },
  { href: "/portal/calendario", label: "Calendario" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const appUser = await requireAppUser("client");

  return (
    <Shell navItems={NAV_ITEMS} userEmail={appUser.email} accountHref="/portal/cuenta">
      {children}
    </Shell>
  );
}
