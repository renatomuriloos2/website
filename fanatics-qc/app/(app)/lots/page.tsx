import Link from "next/link";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, Empty, LinkButton, PageHeader, Progress } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/data";
import { DECORATION_SHORT, FIBER_MAP, LOT_STATUSES } from "@/lib/domain/catalog";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export const metadata = { title: "Lots" };

export default async function LotsPage({ searchParams }: { searchParams: { status?: string; supplier?: string; q?: string } }) {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const { lots, suppliers, fabrics, analytics } = await loadWorkspace(ctx);
  const staff = isStaff(ctx.user);
  const sMap = new Map(suppliers.map((s) => [s.id, s]));
  const fMap = new Map(fabrics.map((f) => [f.id, f]));
  const q = (searchParams.q ?? "").toLowerCase().trim();
  const rows = lots
    .filter((l) => !searchParams.status || l.status === searchParams.status)
    .filter((l) => !searchParams.supplier || l.supplierId === searchParams.supplier)
    .filter((l) => {
      if (!q) return true;
      const f = fMap.get(l.fabricId);
      return [l.ref, l.lotNumber, l.poNumber, l.program, f?.code, f?.name, sMap.get(l.supplierId)?.name].some((v) => v?.toLowerCase().includes(q));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        title={t.lots.title}
        subtitle={t.lots.subtitle}
        actions={
          <>
            <a href="/api/export/lots" className="btn-ghost">
              <Icon name="download" className="h-4 w-4" />
              CSV
            </a>
            <LinkButton href="/lots/new" icon="plus">{t.lots.new}</LinkButton>
          </>
        }
      />
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[200px] flex-1">
          <span className="label">{t.common.search}</span>
          <input name="q" defaultValue={searchParams.q} placeholder="QC-2026-…, PO, fabric, program" className="input" />
        </label>
        <label>
          <span className="label">{t.common.status}</span>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input">
            <option value="">{t.common.all}</option>
            {LOT_STATUSES.map((s) => (
              <option key={s.code} value={s.code}>{s.label[locale]}</option>
            ))}
          </select>
        </label>
        {staff && (
          <label>
            <span className="label">{t.common.supplier}</span>
            <select name="supplier" defaultValue={searchParams.supplier ?? ""} className="input">
              <option value="">{t.common.all}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        )}
        <button className="btn-dark">{t.common.filter}</button>
      </form>

      {rows.length === 0 ? (
        <Empty text={t.lots.noLots} action={<LinkButton href="/lots/new" icon="plus">{t.lots.new}</LinkButton>} />
      ) : (
        <Card bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-fx-mist/60">
                <tr>
                  <th className="th">{t.lots.ref}</th>
                  {staff && <th className="th">{t.common.supplier}</th>}
                  <th className="th">{t.common.fabric}</th>
                  <th className="th">{t.lots.methods}</th>
                  <th className="th">{t.common.status}</th>
                  <th className="th w-36">{t.lots.progress}</th>
                  <th className="th text-right">{t.lots.maxSafe}</th>
                  <th className="th text-right">{t.common.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fx-line">
                {rows.map((l) => {
                  const f = fMap.get(l.fabricId);
                  const s = sMap.get(l.supplierId);
                  const e = analytics.evaluations.get(l.id);
                  return (
                    <tr key={l.id} className="hover:bg-fx-mist/40">
                      <td className="td">
                        <Link href={`/lots/${l.id}`} className="font-bold hover:text-fx-red">{l.ref}</Link>
                        <div className="text-xs text-gray-400">{l.lotNumber} · {l.program}</div>
                      </td>
                      {staff && (
                        <td className="td">
                          <div className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {s?.logoUrl && <img src={s.logoUrl} alt="" className="h-6 w-6 rounded" />}
                            <span className="text-sm">{s?.name}</span>
                          </div>
                        </td>
                      )}
                      <td className="td">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {f?.photoUrl ? <img src={f.photoUrl} alt="" className="h-8 w-8 rounded-md object-cover" /> : <span className="h-8 w-8 rounded-md" style={{ background: f?.colorHex }} />}
                          <div>
                            <div className="text-sm font-medium">{f?.name}</div>
                            <div className="text-xs text-gray-400">{f ? FIBER_MAP[f.fiber].short : ""} · {f?.color}</div>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {l.methods.map((m) => (
                            <span key={m} className="rounded bg-fx-mist px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{DECORATION_SHORT[m]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td">
                        <StatusBadge status={l.status} locale={locale} />
                        {l.isRetest && <div className="mt-1 text-[10px] font-bold text-violet-600">RETEST</div>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Progress value={e?.completeness ?? 0} tone={(e?.completeness ?? 0) === 100 ? "ok" : "info"} />
                          <span className="w-9 text-right text-xs tabular-nums text-gray-500">{e?.completeness ?? 0}%</span>
                        </div>
                      </td>
                      <td className="td text-right text-sm font-semibold tabular-nums">{e?.maxSafeTempC ? `${e.maxSafeTempC} °C` : "—"}</td>
                      <td className="td text-right text-xs text-gray-500">{fmtDate(l.submittedAt ?? l.createdAt, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
