import Link from "next/link";
import { notFound } from "next/navigation";
import { StackedBars } from "@/components/Charts";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, Card, LinkButton, Stat, TONE_HEX } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { STATUS_MAP } from "@/lib/domain/catalog";
import { computeAnalytics } from "@/lib/analytics";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export default async function SupplierPage({ params }: { params: { id: string } }) {
  const ctx = await requireUser(["admin", "reviewer"]);
  const { t, locale } = getI18n();
  const ws = await loadWorkspace(ctx);
  const s = ws.suppliers.find((x) => x.id === params.id);
  if (!s) notFound();
  const a = computeAnalytics({
    lots: ws.lots.filter((l) => l.supplierId === s.id),
    results: ws.results,
    suppliers: [s],
    fabrics: ws.fabrics.filter((f) => f.supplierId === s.id),
    requirements: ws.requirements,
  });
  const users = ctx.user.role === "admin" ? (await getRepo().listUsers(ctx)).filter((u) => u.supplierId === s.id) : [];
  const fabrics = ws.fabrics.filter((f) => f.supplierId === s.id);
  const monthLabel = (m: string) => new Date(`${m}-15`).toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { month: "short" });
  return (
    <div className="space-y-6">
      <section className="fx-stripes relative overflow-hidden rounded-3xl bg-fx-ink p-6 text-white lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fx-red/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={s.logoUrl} name={s.name} size={84} rounded="rounded-3xl" />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-fx-red">{s.code} · {s.tier}</div>
            <h1 className="font-display text-3xl font-black italic">{s.name}</h1>
            <p className="text-sm text-white/60">{s.city}, {s.country} · {s.contactName} · {s.contactEmail} · {s.phone}</p>
          </div>
          {ctx.user.role === "admin" && (
            <div className="flex gap-2">
              <Link href={`/suppliers/${s.id}/edit`} className="btn bg-white/10 text-white hover:bg-white/20">{t.common.edit}</Link>
              <Link href={`/users?supplier=${s.id}`} className="btn bg-fx-red text-white">{t.users.new}</Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label={t.dash.lots} value={a.kpi.total} tone="neutral" />
        <Stat label={t.dash.rft} value={a.kpi.rftPct === null ? "—" : `${a.kpi.rftPct}%`} tone="ok" />
        <Stat label={t.dash.approvalRate} value={a.kpi.approvalPct === null ? "—" : `${a.kpi.approvalPct}%`} tone="info" />
        <Stat label={t.dash.avgGrade} value={a.kpi.avgGrade ?? "—"} tone="amber" />
        <Stat label={t.dash.maxTemp} value={a.kpi.medianMaxTemp ? `${a.kpi.medianMaxTemp}°` : "—"} tone="bad" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title={t.dash.monthly}>
          <StackedBars
            data={a.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))}
            xKey="label"
            series={[
              { key: "approved", label: STATUS_MAP.approved.label[locale], color: TONE_HEX.ok },
              { key: "concession", label: STATUS_MAP.approved_concession.label[locale], color: TONE_HEX.amber },
              { key: "retest", label: STATUS_MAP.retest.label[locale], color: TONE_HEX.violet },
              { key: "rejected", label: STATUS_MAP.rejected.label[locale], color: TONE_HEX.bad },
              { key: "pipeline", label: t.dash.pipeline, color: "#C9CDD4" },
            ]}
          />
        </Card>
        <Card title={`${t.fabrics.title} (${fabrics.length})`} actions={<LinkButton href="/fabrics/new" variant="ghost" icon="plus">{t.fabrics.new}</LinkButton>}>
          <div className="grid grid-cols-2 gap-3">
            {fabrics.map((f) => (
              <Link key={f.id} href={`/fabrics/${f.id}`} className="group overflow-hidden rounded-xl ring-1 ring-fx-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.photoUrl ? <img src={f.photoUrl} alt="" className="h-20 w-full object-cover" /> : <div className="h-20" style={{ background: f.colorHex }} />}
                <div className="p-2 text-xs"><b>{f.code}</b><div className="truncate text-gray-500">{f.name}</div></div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title={t.lots.title} bodyClass="p-0">
          <ul className="divide-y divide-fx-line">
            {ws.lots.filter((l) => l.supplierId === s.id).slice(0, 12).map((l) => (
              <li key={l.id}>
                <Link href={`/lots/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-fx-mist/40">
                  <div>
                    <div className="text-sm font-bold">{l.ref}</div>
                    <div className="text-xs text-gray-500">{l.program} · {fmtDate(l.createdAt, locale)}</div>
                  </div>
                  <StatusBadge status={l.status} locale={locale} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        {ctx.user.role === "admin" && (
          <Card title={t.suppliers.users}>
            <ul className="space-y-3">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <Avatar name={u.fullName} size={32} rounded="rounded-full" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold">{u.fullName}</div>
                    <div className="truncate text-xs text-gray-500">{u.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold ${u.mfaEnabled ? "text-emerald-600" : "text-amber-600"}`}>2FA {u.mfaEnabled ? "✓" : "—"}</span>
                </li>
              ))}
              {users.length === 0 && <li className="text-sm text-gray-400">{t.common.empty}</li>}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
