import { ResumenView } from "@/components/views/ResumenView";

export default async function AdminPortalResumenPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { system?: string };
}) {
  return <ResumenView clientId={params.clientId} system={searchParams.system} />;
}
