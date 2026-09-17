import { requireAppUser } from "@/lib/auth";
import { RecomendacionesView } from "@/components/views/RecomendacionesView";

export default async function RecomendacionesPage() {
  const appUser = await requireAppUser("client");
  return <RecomendacionesView clientId={appUser.client_id!} />;
}
