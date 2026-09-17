import { DosificacionView } from "@/components/views/DosificacionView";

export default async function AdminPortalDosificacionPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { system?: string };
}) {
  return <DosificacionView clientId={params.clientId} system={searchParams.system} />;
}
