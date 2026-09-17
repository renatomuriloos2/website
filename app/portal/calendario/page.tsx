import { requireAppUser } from "@/lib/auth";
import { CalendarioView } from "@/components/views/CalendarioView";

export default async function CalendarioPage() {
  const appUser = await requireAppUser("client");
  return <CalendarioView clientId={appUser.client_id!} />;
}
