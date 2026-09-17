import { HistorialView } from "@/components/views/HistorialView";

export default function HistorialPage({
  params,
  searchParams,
}: {
  params: { clientId: string };
  searchParams: { system?: string };
}) {
  return <HistorialView clientId={params.clientId} system={searchParams.system} />;
}
