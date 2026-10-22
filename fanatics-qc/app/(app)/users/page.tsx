import { CreateUserForm, ToggleUser } from "@/components/AdminForms";
import { Alert, Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: { supplier?: string } }) {
  const ctx = await requireUser(["admin"]);
  const { t, locale } = getI18n();
  const repo = getRepo();
  const [users, suppliers] = await Promise.all([repo.listUsers(ctx), repo.listSuppliers(ctx)]);
  const sMap = new Map(suppliers.map((s) => [s.id, s]));
  const roleLabel = { admin: t.users.roleAdmin, reviewer: t.users.roleReviewer, supplier: t.users.roleSupplier };
  return (
    <div className="space-y-6">
      <PageHeader title={t.users.title} subtitle={t.users.subtitle} />
      <Alert tone="info">🔒 {t.users.isolation}</Alert>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title={`${t.users.title} (${users.length})`} bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-fx-mist/60">
                <tr>
                  <th className="th">{t.users.fullName}</th>
                  <th className="th">{t.users.role}</th>
                  <th className="th">{t.users.mfa}</th>
                  <th className="th">{t.users.lastSeen}</th>
                  <th className="th text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fx-line">
                {users.map((u) => {
                  const s = u.supplierId ? sMap.get(u.supplierId) : null;
                  return (
                    <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.fullName} src={s?.logoUrl} size={34} rounded="rounded-full" />
                          <div>
                            <div className="font-semibold">{u.fullName}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <Badge tone={u.role === "admin" ? "bad" : u.role === "reviewer" ? "info" : "neutral"}>{roleLabel[u.role]}</Badge>
                        {s && <div className="mt-1 text-xs text-gray-500">{s.name}</div>}
                      </td>
                      <td className="td">{u.mfaEnabled ? <Badge tone="ok">TOTP</Badge> : <Badge tone="warn">{t.lots.pending}</Badge>}</td>
                      <td className="td text-xs text-gray-500">{fmtDateTime(u.lastSignInAt, locale)}</td>
                      <td className="td text-right">{u.id !== ctx.user.id && <ToggleUser id={u.id} active={u.active} labels={{ enable: t.users.enable, disable: t.users.disable }} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title={t.users.new}>
          <CreateUserForm suppliers={suppliers} defaultSupplier={searchParams.supplier} />
        </Card>
      </div>
    </div>
  );
}
