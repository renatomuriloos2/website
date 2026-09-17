import { requireAppUser } from "@/lib/auth";
import { DosificacionView } from "@/components/views/DosificacionView";

export default async function DosificacionPage({
  searchParams,
}: {
  searchParams: { system?: string };
}) {
  const appUser = await requireAppUser("client");
  return <DosificacionView clientId={appUser.client_id!} system={searchParams.system} />;
}
