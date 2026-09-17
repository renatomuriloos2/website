import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/lib/auth";
import { PortalShellClient } from "@/components/PortalShellClient";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const appUser = await requireAppUser("client");
  const supabase = createClient();

  const clients =
    appUser.client_ids.length > 0
      ? (
          await supabase
            .from("clients")
            .select("id, name")
            .in("id", appUser.client_ids)
            .order("name")
        ).data ?? []
      : [];

  return (
    <PortalShellClient clients={clients} userEmail={appUser.email}>
      {children}
    </PortalShellClient>
  );
}
