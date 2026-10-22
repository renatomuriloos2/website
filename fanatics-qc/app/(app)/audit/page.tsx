import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const ctx = await requireUser(["admin"]);
  const { t, locale } = getI18n();
  const rows = await getRepo().listAudit(ctx, 300);
  return (
    <div>
      <PageHeader kicker="SOC 2 · ISO 27001 evidence" title={t.audit.title} subtitle={t.audit.subtitle} actions={<a href="/api/export/audit" className="btn-ghost">CSV</a>} />
      <Card bodyClass="p-0">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-fx-mist/60">
              <tr>
                <th className="th">{t.common.date}</th>
                <th className="th">{t.audit.actor}</th>
                <th className="th">{t.audit.action}</th>
                <th className="th">{t.audit.entity}</th>
                <th className="th">{t.audit.details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fx-line font-mono text-xs">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="td whitespace-nowrap text-gray-500">{fmtDateTime(r.at, locale)}</td>
                  <td className="td">{r.actor}</td>
                  <td className="td"><span className="rounded bg-fx-mist px-1.5 py-0.5 font-semibold">{r.action}</span></td>
                  <td className="td">{r.entity} · {r.entityId}</td>
                  <td className="td max-w-md truncate text-gray-500" title={r.details}>{r.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
