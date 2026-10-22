import { AuthCard } from "@/components/AuthCard";
import { PasswordForm } from "@/components/PasswordForm";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function ForcedPasswordPage() {
  await requireUser(undefined, { allowPasswordChange: true });
  const { t } = getI18n();
  return (
    <AuthCard title={t.auth.changePassword} subtitle={t.auth.mustChange}>
      <PasswordForm />
    </AuthCard>
  );
}
