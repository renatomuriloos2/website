import { CalendarioView } from "@/components/views/CalendarioView";

export default async function AdminPortalCalendarioPage({
  params,
}: {
  params: { clientId: string };
}) {
  return (
    <CalendarioView
      clientId={params.clientId}
      downloadHref={`/admin/portal/${params.clientId}/calendario/ics`}
    />
  );
}
