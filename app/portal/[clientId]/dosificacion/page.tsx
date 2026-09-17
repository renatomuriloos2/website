import { DosificacionView } from "@/components/views/DosificacionView";

export default function DosificacionPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { system?: string };
}) {
  return <DosificacionView clientId={params.clientId} system={searchParams.system} />;
}
