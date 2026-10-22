import { AuthCard } from "@/components/AuthCard";
import { getI18n } from "@/lib/i18n/server";
import { MfaVerify } from "./MfaVerify";

export default function MfaPage() {
  const { t } = getI18n();
  return (
    <AuthCard title={t.auth.mfaTitle} subtitle={t.auth.mfaSubtitle}>
      <MfaVerify />
    </AuthCard>
  );
}
