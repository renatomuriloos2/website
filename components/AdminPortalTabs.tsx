"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminPortalTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/admin/portal/${clientId}`;
  const tabs = [
    { href: base, label: "Resumen" },
    { href: `${base}/historial`, label: "Historial" },
    { href: `${base}/dosificacion`, label: "Dosificación" },
    { href: `${base}/recomendaciones`, label: "Recomendaciones" },
    { href: `${base}/calendario`, label: "Calendario" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              active
                ? "bg-rethink-orange text-rethink-bg"
                : "border border-surface/15 text-rethink-cream/70 hover:bg-surface/5"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
