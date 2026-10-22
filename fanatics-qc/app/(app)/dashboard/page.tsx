import Link from "next/link";
import { Donut, HBars, StackedBars } from "@/components/Charts";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, Card, PageHeader, Stat, TONE_HEX, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/data";
import { DECORATION_MAP, DECORATION_SHORT, FIBER_MAP, STATUS_MAP, TEST_MAP } from "@/lib/domain/catalog";
import { ago } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const { lots, suppliers, fabrics, analytics } = await loadWorkspace(ctx);
  const { kpi } = analytics;
  const staff = isStaff(ctx.user);
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const fabricById = new Map(fabrics.map((f) => [f.id, f]));

  const monthLabel = (m: string) => new Date(`${m}-15`).toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { month: "short" });
  const monthly = analytics.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const series = [
    { key: "approved", label: STATUS_MAP.approved.label[locale], color: TONE_HEX.ok },
    { key: "concession", label: STATUS_MAP.approved_concession.label[locale], color: TONE_HEX.amber },
    { key: "retest", label: STATUS_MAP.retest.label[locale], color: TONE_HEX.violet },
    { key: "rejected", label: STATUS_MAP.rejected.label[locale], color: TONE_HEX.bad },
    { key: "pipeline", label: t.dash.pipeline, color: "#C9CDD4" },
  ];
  const recent = [...lots].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 7);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={staff ? "Fanatics · Global Sourcing Quality" : supplierById.get(ctx.user.supplierId ?? "")?.name}
        title={t.dash.title}
        subtitle={staff ? t.dash.subtitle : t.dash.supplierSubtitle}
        actions={
          <>
            {staff && <LinkButton href="/board" variant="ghost" icon="board">{t.nav.board}</LinkButton>}
            <LinkButton href="/lots/new" icon="plus">{t.lots.new}</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t.dash.lots} value={kpi.total} icon="lots" tone="neutral" hint={`${kpi.pipeline} ${t.dash.pipeline.toLowerCase()}`} />
        <Stat label={t.dash.rft} value={kpi.rftPct === null ? "—" : `${kpi.rftPct}%`} icon="spark" tone="ok" hint={t.dash.rftHint} />
        <Stat label={t.dash.approved} value={kpi.approved} icon="check" tone="ok" hint={`${kpi.approvalPct ?? "—"}% ${t.dash.approvalRate.toLowerCase()}`} />
        <Stat label={t.dash.concession} value={kpi.concession} icon="alert" tone="amber" />
        <Stat label={t.dash.rejected} value={kpi.rejected + kpi.retest} icon="x" tone="bad" hint={`${kpi.retest} ${STATUS_MAP.retest.label[locale].toLowerCase()}`} />
        <Stat label={t.dash.cycle} value={kpi.avgCycleDays === null ? "—" : kpi.avgCycleDays} icon="clock" tone="info" hint={`${t.dash.days} · ${t.dash.avgGrade} ${kpi.avgGrade ?? "—"}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={t.dash.monthly} className="xl:col-span-2">
          <StackedBars data={monthly} series={series} xKey="label" />
        </Card>
        <Card title={t.dash.byStatus}>
          <Donut
            data={analytics.byStatus.map((s) => ({ label: STATUS_MAP[s.status].label[locale], value: s.count, color: TONE_HEX[STATUS_MAP[s.status].tone] === TONE_HEX.neutral ? "#C9CDD4" : TONE_HEX[STATUS_MAP[s.status].tone] }))}
            center={{ value: String(kpi.total), label: t.dash.lots }}
          />
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {analytics.byStatus.map((s) => (
              <li key={s.status} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="h-2 w-2 rounded-sm" style={{ background: TONE_HEX[STATUS_MAP[s.status].tone] === TONE_HEX.neutral ? "#C9CDD4" : TONE_HEX[STATUS_MAP[s.status].tone] }} />
                  {STATUS_MAP[s.status].label[locale]}
                </span>
                <span className="font-semibold tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {staff && (
        <Card title={t.dash.bySupplier} bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-fx-mist/60">
                <tr>
                  <th className="th">{t.common.supplier}</th>
                  <th className="th text-right">{t.dash.lots}</th>
                  <th className="th">{t.dash.rft}</th>
                  <th className="th text-right">{t.dash.approved}</th>
                  <th className="th text-right">{t.dash.concession}</th>
                  <th className="th text-right">{t.dash.rejected}</th>
                  <th className="th text-right">{t.dash.avgGrade}</th>
                  <th className="th text-right">{t.dash.cycle}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fx-line">
                {analytics.scorecard.map((r) => (
                  <tr key={r.supplier.id} className="hover:bg-fx-mist/40">
                    <td className="td">
                      <Link href={`/suppliers/${r.supplier.id}`} className="flex items-center gap-3 font-semibold hover:text-fx-red">
                        <Avatar src={r.supplier.logoUrl} name={r.supplier.name} size={30} rounded="rounded-lg" />
                        <span>
                          {r.supplier.name}
                          <span className="block text-xs font-normal text-gray-400">{r.supplier.country}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="td text-right tabular-nums">{r.lots}</td>
                    <td className="td w-48">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full" style={{ width: `${r.rftPct ?? 0}%`, background: (r.rftPct ?? 0) >= 70 ? TONE_HEX.ok : (r.rftPct ?? 0) >= 45 ? TONE_HEX.amber : TONE_HEX.bad }} />
                        </div>
                        <span className="w-12 text-right text-xs font-bold tabular-nums">{r.rftPct === null ? "—" : `${r.rftPct}%`}</span>
                      </div>
                    </td>
                    <td className="td text-right tabular-nums">{r.approved}</td>
                    <td className="td text-right tabular-nums">{r.concession}</td>
                    <td className="td text-right tabular-nums">{r.rejected + r.retest}</td>
                    <td className="td text-right tabular-nums">{r.avgGrade ?? "—"}</td>
                    <td className="td text-right tabular-nums">{r.avgCycleDays === null ? "—" : `${r.avgCycleDays} ${t.dash.days}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.dash.pareto}>
          {analytics.pareto.length ? (
            <HBars data={analytics.pareto.map((p) => ({ label: `${TEST_MAP[p.testId].code}`, value: p.fails }))} unit={t.dash.fails} />
          ) : (
            <p className="text-sm text-gray-400">{t.common.empty}</p>
          )}
          <ul className="mt-2 space-y-1 text-xs text-gray-500">
            {analytics.pareto.slice(0, 4).map((p) => (
              <li key={p.testId}>
                <b className="text-fx-ink">{TEST_MAP[p.testId].code}</b> — {TEST_MAP[p.testId].name[locale]}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t.dash.matrix} subtitle={t.dash.matrixHint} bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto p-4">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white" />
                  {analytics.matrixMethods.map((m) => (
                    <th key={m} className="h-24 w-10 align-bottom">
                      <div className="mx-auto w-4 rotate-180 whitespace-nowrap font-medium text-gray-500 [writing-mode:vertical-rl]">{DECORATION_SHORT[m]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.matrix
                  .filter((row) => Object.keys(row.cells).length)
                  .map((row) => {
                    const s = supplierById.get(row.supplierId)!;
                    return (
                      <tr key={row.supplierId}>
                        <td className="sticky left-0 whitespace-nowrap bg-white pr-3 font-semibold">{s.code}</td>
                        {analytics.matrixMethods.map((m) => {
                          const c = row.cells[m];
                          if (!c) return <td key={m} className="p-0.5"><div className="h-8 w-10 rounded bg-gray-50" /></td>;
                          const share = Math.round(((c.ok + c.cond) / c.n) * 100);
                          const bg = share >= 80 ? TONE_HEX.ok : share >= 50 ? TONE_HEX.amber : TONE_HEX.bad;
                          return (
                            <td key={m} className="p-0.5">
                              <div className="flex h-8 w-10 items-center justify-center rounded text-[10px] font-bold text-white" style={{ background: bg, opacity: 0.35 + (c.n / 6) * 0.65 }} title={`${s.name} · ${DECORATION_MAP[m].name[locale]}: ${c.ok} ✓ · ${c.cond} ⚠ · ${c.n - c.ok - c.cond} ✕ (n=${c.n})`}>
                                {share}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title={t.dash.recent} className="xl:col-span-2" bodyClass="p-0">
          <ul className="divide-y divide-fx-line">
            {recent.map((l) => {
              const f = fabricById.get(l.fabricId);
              const s = supplierById.get(l.supplierId);
              return (
                <li key={l.id}>
                  <Link href={`/lots/${l.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-fx-mist/40">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {f?.photoUrl ? <img src={f.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: f?.colorHex }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {l.ref}
                        {l.isRetest && <span className="rounded bg-violet-100 px-1.5 text-[10px] font-bold text-violet-700">RETEST</span>}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {s?.name} · {f?.name} · {l.program}
                      </div>
                    </div>
                    <StatusBadge status={l.status} locale={locale} />
                    <span className="hidden w-16 text-right text-xs text-gray-400 sm:block">{ago(l.updatedAt, t.common)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title={t.dash.fiberMix}>
          <ul className="space-y-3">
            {analytics.fiberMix.map((f) => (
              <li key={f.fiber}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{FIBER_MAP[f.fiber].name[locale]}</span>
                  <span className="tabular-nums text-gray-500">{f.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-fx-ink" style={{ width: `${(f.count / Math.max(1, kpi.total)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-fx-mist p-4">
            <Icon name="thermo" className="h-6 w-6 text-fx-red" />
            <div>
              <div className="text-xs text-gray-500">{t.dash.maxTemp}</div>
              <div className="font-display text-2xl font-extrabold">{kpi.medianMaxTemp ? `${kpi.medianMaxTemp} °C` : "—"}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
