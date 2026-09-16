"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SystemType } from "@/types/database";
import { cn } from "@/lib/utils";

export function SystemSwitcher({ systems, current }: { systems: SystemType[]; current: SystemType }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(system: SystemType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("system", system);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {systems.map((system) => (
        <button
          key={system}
          onClick={() => handleChange(system)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition",
            system === current
              ? "bg-rethink-orange text-rethink-bg"
              : "border border-white/15 text-rethink-cream/70 hover:bg-white/5"
          )}
        >
          {system}
        </button>
      ))}
    </div>
  );
}
