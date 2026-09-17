import { requireAppUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PortalClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { clientId: string };
}) {
  const appUser = await requireAppUser("client");
  if (!appUser.client_ids.includes(params.clientId)) {
    redirect("/portal");
  }
  return <>{children}</>;
}
