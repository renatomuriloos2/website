import Link from "next/link";
import { Avatar, Badge, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const ctx = await requireUser(["admin", "reviewer"]);
  const { t } = getI18n();
  const { suppliers, fabrics, analytics } = await loadWorkspace(ctx);
  const tier = { strategic: t.suppliers.tierStrategic, approved: t.suppliers.tierApproved, probation: t.suppliers.tierProbation };
  const status = { active: t.suppliers.stActive, onboarding: t.suppliers.stOnboarding, inactive: t.suppliers.stInactive };
  return (
    <div>
      <PageHeader title={t.suppliers.title} subtitle={t.suppliers.subtitle} actions={ctx.user.role === "admin" ? <LinkButton href="/suppliers/new" icon="plus">{t.suppliers.new}</LinkButton> : null} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((s) => {
          const sc = analytics.scorecard.find((x) => x.supplier.id === s.id);
          return (
            <Link key={s.id} href={`/suppliers/${s.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="flex items-start gap-4">
                <Avatar src={s.logoUrl} name={s.name} size={56} rounded="rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{s.code}</div>
                  <div className="truncate text-lg font-bold">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.city}, {s.country}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Badge tone={s.tier === "strategic" ? "info" : s.tier === "probation" ? "warn" : "neutral"}>{tier[s.tier]}</Badge>
                <Badge tone={s.status === "active" ? "ok" : s.status === "onboarding" ? "violet" : "neutral"}>{status[s.status]}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 border-t border-fx-line pt-4 text-center">
                {[
                  [t.fabrics.title, fabrics.filter((f) => f.supplierId === s.id).length],
                  [t.dash.lots, sc?.lots ?? 0],
                  ["RFT", sc?.rftPct === null || sc?.rftPct === undefined ? "—" : `${sc.rftPct}%`],
                  [t.dash.avgGrade, sc?.avgGrade ?? "—"],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <div className="font-display text-xl font-extrabold">{v}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">{k}</div>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
