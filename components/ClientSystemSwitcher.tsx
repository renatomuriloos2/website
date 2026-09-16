"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SYSTEMS } from "@/lib/constants";
import { Client } from "@/types/database";

export function ClientSystemSwitcher({
  clients,
  currentClientId,
  currentSystem,
}: {
  clients: Client[];
  currentClientId: string;
  currentSystem: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap gap-4">
      <div>
        <label className="label">Cliente</label>
        <select
          className="input"
          value={currentClientId}
          onChange={(e) => update("client_id", e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Sistema</label>
        <select className="input" value={currentSystem} onChange={(e) => update("system", e.target.value)}>
          {SYSTEMS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
