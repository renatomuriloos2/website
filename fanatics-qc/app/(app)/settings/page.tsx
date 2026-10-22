import Link from "next/link";
import { SampleDataCard } from "@/components/AdminForms";
import { AppSetup } from "@/components/AppSetup";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { PasswordForm } from "@/components/PasswordForm";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireUser();
  const { t } = getI18n();
  const u = ctx.user;
  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t.settings.account}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">{t.users.fullName}</dt><dd className="font-semibold">{u.fullName}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">{t.users.email}</dt><dd>{u.email}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">{t.users.role}</dt><dd>{u.role}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-gray-500">{t.settings.language}</dt><dd><LocaleSwitch /></dd></div>
          </dl>
        </Card>
        <Card title={t.settings.security}>
          <div className="mb-5 flex items-center justify-between rounded-xl bg-fx-mist p-4">
            <div>
              <div className="text-sm font-semibold">2FA · TOTP</div>
              <div className="text-xs text-gray-500">{u.mfaEnabled ? t.auth.mfaEnabled : t.auth.mfaSetupSubtitle}</div>
            </div>
            {u.mfaEnabled ? <Badge tone="ok">ON</Badge> : isDemo() ? <Badge tone="neutral">demo</Badge> : <Link href="/mfa/setup" className="btn-primary py-2">{t.auth.verify}</Link>}
          </div>
          <PasswordForm />
        </Card>
        <Card title={t.settings.appPush} className="lg:col-span-2">
          <AppSetup vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} />
        </Card>
        {u.role === "admin" && (
          <Card title={t.settings.sampleData} className="lg:col-span-2">
            <SampleDataCard />
          </Card>
        )}
      </div>
    </div>
  );
}
