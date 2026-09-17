import { CalendarioView } from "@/components/views/CalendarioView";

export default function CalendarioPage({ params }: { params: { clientId: string } }) {
  return <CalendarioView clientId={params.clientId} />;
}
