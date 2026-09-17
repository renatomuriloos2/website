import { requireAppUser } from "@/lib/auth";
import { HistorialView } from "@/components/views/HistorialView";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: { system?: string };
}) {
  const appUser = await requireAppUser("client");
  return <HistorialView clientId={appUser.client_id!} system={searchParams.system} />;
}
