import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { isDemo } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { MfaEnroll } from "./MfaEnroll";

export default function MfaSetupPage() {
  if (isDemo()) redirect("/settings");
  const { t } = getI18n();
  return (
    <AuthCard title={t.auth.mfaSetupTitle} subtitle={t.auth.mfaSetupSubtitle}>
      <MfaEnroll />
    </AuthCard>
  );
}
