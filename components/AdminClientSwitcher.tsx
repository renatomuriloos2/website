"use client";

import { usePathname, useRouter } from "next/navigation";
import { Client } from "@/types/database";

export function AdminClientSwitcher({
  clients,
  currentClientId,
}: {
  clients: Client[];
  currentClientId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(newClientId: string) {
    const segments = pathname.split("/");
    segments[3] = newClientId; // ["", "admin", "portal", "<clientId>", ...resto]
    router.push(segments.join("/"));
  }

  return (
    <select
      className="input max-w-xs"
      value={currentClientId}
      onChange={(e) => handleChange(e.target.value)}
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
