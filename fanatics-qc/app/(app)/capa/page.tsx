import Link from "next/link";
import { CapaBadge } from "@/components/CapaBadge";
import { Card, Empty, PageHeader, Stat, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/data";
import { CAPA_STATUS, isOverdue } from "@/lib/domain/capa";
import type { CapaStatus } from "@/lib/domain/types";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export const metadata = { title: "CAPA" };

export default async function CapaListPage({ searchParams }: { searchParams: { status?: string } }) {
  const ctx = await requireUser();
  const { locale } = getI18n();
  const es = locale === "es";
  const { capas, lots, suppliers, analytics } = await loadWorkspace(ctx);
  const staff = isStaff(ctx.user);
  const lMap = new Map(lots.map((l) => [l.id, l]));
  const sMap = new Map(suppliers.map((s) => [s.id, s]));
  const filter = searchParams.status as CapaStatus | "overdue" | undefined;
  const rows = capas.filter((c) => !filter || (filter === "overdue" ? isOverdue(c) : c.status === filter));
  const count = (s: CapaStatus) => capas.filter((c) => c.status === s).length;
  const tabs: (CapaStatus | "overdue" | "")[] = ["", "open", "submitted", "returned", "accepted", "closed", "overdue"];
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Corrective & Preventive Action"
        title="CAPA"
        subtitle={es ? "Acciones correctivas y preventivas de los mills para lotes rechazados o en re-test" : "Mill corrective and preventive actions for rejected or retest lots"}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={es ? "Abiertas" : "Open"} value={analytics.kpi.capaOpen} tone="warn" icon="alert" />
        <Stat label={es ? "Por revisar" : "To review"} value={count("submitted")} tone="info" icon="file" hint={staff ? (es ? "esperando a Fanatics" : "waiting on Fanatics") : undefined} />
        <Stat label={es ? "Vencidas" : "Overdue"} value={analytics.kpi.capaOverdue} tone="bad" icon="clock" />
        <Stat label={es ? "Días prom. al cierre" : "Avg. days to close"} value={analytics.kpi.capaAvgDaysToClose ?? "—"} tone="ok" icon="check" />
      </div>
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-fx-line">
        {tabs.map((t) => (
          <Link key={t || "all"} href={t ? `/capa?status=${t}` : "/capa"} className={cx("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold", (filter ?? "") === t ? "bg-fx-ink text-white" : "text-gray-500 hover:text-fx-ink")}>
            {t === "" ? (es ? "Todas" : "All") : t === "overdue" ? (es ? "Vencidas" : "Overdue") : CAPA_STATUS[t][locale].split(" —")[0]}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <Empty text={es ? "No hay CAPA en este filtro." : "No CAPAs in this filter."} />
      ) : (
        <Card bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-fx-mist/60">
                <tr>
                  <th className="th">CAPA</th>
                  <th className="th">{es ? "Lote" : "Lot"}</th>
                  {staff && <th className="th">{es ? "Proveedor" : "Supplier"}</th>}
                  <th className="th">{es ? "Estado" : "Status"}</th>
                  <th className="th">{es ? "Problema" : "Problem"}</th>
                  <th className="th text-right">{es ? "Vence" : "Due"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fx-line">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-fx-mist/40">
                    <td className="td"><Link href={`/capa/${c.id}`} className="font-bold hover:text-fx-red">{c.ref}</Link></td>
                    <td className="td"><Link href={`/lots/${c.lotId}`} className="text-sm hover:text-fx-red">{lMap.get(c.lotId)?.ref}</Link></td>
                    {staff && <td className="td text-sm">{sMap.get(c.supplierId)?.name}</td>}
                    <td className="td"><CapaBadge capa={c} locale={locale} /></td>
                    <td className="td max-w-sm truncate text-xs text-gray-500" title={c.problem}>{c.problem}</td>
                    <td className="td text-right text-xs text-gray-500">{fmtDate(c.dueDate ? c.dueDate + "T12:00:00" : null, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
