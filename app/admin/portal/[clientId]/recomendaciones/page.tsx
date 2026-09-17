import { RecomendacionesView } from "@/components/views/RecomendacionesView";

export default async function AdminPortalRecomendacionesPage({
  params,
}: {
  params: { clientId: string };
}) {
  return <RecomendacionesView clientId={params.clientId} />;
}
