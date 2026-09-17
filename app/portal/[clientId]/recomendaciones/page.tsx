import { RecomendacionesView } from "@/components/views/RecomendacionesView";

export default function RecomendacionesPage({ params }: { params: { clientId: string } }) {
  return <RecomendacionesView clientId={params.clientId} />;
}
