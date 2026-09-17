"use client";

import { usePathname, useRouter } from "next/navigation";

export function PortalClientSwitcher({
  clients,
  currentClientId,
}: {
  clients: { id: string; name: string }[];
  currentClientId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(newClientId: string) {
    const segments = pathname.split("/"); // ["", "portal", "<clientId-or-cuenta>", ...resto]
    if (segments[2] === "cuenta") {
      router.push(`/portal/${newClientId}`);
      return;
    }
    segments[2] = newClientId;
    router.push(segments.join("/"));
  }

  return (
    <div className="mb-4">
      <label className="label">Cliente</label>
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
    </div>
  );
}
