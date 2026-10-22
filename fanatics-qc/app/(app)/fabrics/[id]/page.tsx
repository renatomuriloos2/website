import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { FIBER_MAP, DECORATION_SHORT } from "@/lib/domain/catalog";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";

export default async function FabricPage({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const { fabrics, suppliers, lots, analytics } = await loadWorkspace(ctx);
  const f = fabrics.find((x) => x.id === params.id);
  if (!f) notFound();
  const s = suppliers.find((x) => x.id === f.supplierId);
  const fl = lots.filter((l) => l.fabricId === f.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fiber = FIBER_MAP[f.fiber];
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={s?.name}
        title={`${f.code} · ${f.name}`}
        subtitle={`${f.color} · ${f.composition}`}
        actions={
          <>
            <LinkButton href={`/fabrics/${f.id}/edit`} variant="ghost" icon="settings">{t.common.edit}</LinkButton>
            <LinkButton href={`/lots/new?fabric=${f.id}`} icon="plus">{t.lots.new}</LinkButton>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {f.photoUrl ? <img src={f.photoUrl} alt="" className="h-64 w-full object-cover" /> : <div className="h-64" style={{ background: f.colorHex }} />}
          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            {[
              [t.fabrics.fiber, fiber.name[locale]],
              [t.fabrics.construction, f.construction],
              [t.fabrics.weight, f.weightGsm ?? "—"],
              [t.fabrics.dyeClass, f.dyeClass],
              [t.fabrics.finish, f.finish || "—"],
              [t.fabrics.colorHex, f.colorHex],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-xs text-gray-400">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mx-5 mb-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{fiber.note[locale]}</div>
        </div>
        <Card title={t.fabrics.history} bodyClass="p-0">
          <table className="w-full">
            <thead className="bg-fx-mist/60">
              <tr>
                <th className="th">{t.lots.ref}</th>
                <th className="th">{t.lots.methods}</th>
                <th className="th">{t.common.status}</th>
                <th className="th text-right">{t.lots.maxSafe}</th>
                <th className="th text-right">{t.common.date}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fx-line">
              {fl.map((l) => (
                <tr key={l.id} className="hover:bg-fx-mist/40">
                  <td className="td"><Link href={`/lots/${l.id}`} className="font-bold hover:text-fx-red">{l.ref}</Link></td>
                  <td className="td text-xs text-gray-500">{l.methods.map((m) => DECORATION_SHORT[m]).join(", ")}</td>
                  <td className="td"><StatusBadge status={l.status} locale={locale} /></td>
                  <td className="td text-right font-semibold tabular-nums">{analytics.evaluations.get(l.id)?.maxSafeTempC ?? "—"} °C</td>
                  <td className="td text-right text-xs text-gray-500">{fmtDate(l.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fl.length === 0 && <p className="p-5 text-sm text-gray-400">{t.lots.noLots}</p>}
        </Card>
      </div>
    </div>
  );
}
