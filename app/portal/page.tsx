import { requireAppUser } from "@/lib/auth";
import { ResumenView } from "@/components/views/ResumenView";

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: { system?: string };
}) {
  const appUser = await requireAppUser("client");
  return <ResumenView clientId={appUser.client_id!} system={searchParams.system} />;
}
