"use client";

import { usePathname } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PortalClientSwitcher } from "@/components/PortalClientSwitcher";

export function PortalShellClient({
  clients,
  userEmail,
  children,
}: {
  clients: { id: string; name: string }[];
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segment = pathname.split("/")[2];
  const currentClientId = clients.some((c) => c.id === segment) ? segment : clients[0]?.id;

  const navItems = currentClientId
    ? [
        { href: `/portal/${currentClientId}`, label: "Resumen" },
        { href: `/portal/${currentClientId}/historial`, label: "Historial" },
        { href: `/portal/${currentClientId}/dosificacion`, label: "Dosificación" },
        { href: `/portal/${currentClientId}/recomendaciones`, label: "Recomendaciones" },
        { href: `/portal/${currentClientId}/calendario`, label: "Calendario" },
      ]
    : [];

  return (
    <Shell navItems={navItems} userEmail={userEmail} accountHref="/portal/cuenta">
      {clients.length > 1 && currentClientId && (
        <PortalClientSwitcher clients={clients} currentClientId={currentClientId} />
      )}
      {children}
    </Shell>
  );
}
