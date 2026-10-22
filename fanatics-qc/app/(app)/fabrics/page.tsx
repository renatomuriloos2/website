import Link from "next/link";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/data";
import { FIBER_MAP } from "@/lib/domain/catalog";
import { getI18n } from "@/lib/i18n/server";
import { loadWorkspace } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Fabrics" };

export default async function FabricsPage({ searchParams }: { searchParams: { supplier?: string } }) {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const { fabrics, suppliers, lots } = await loadWorkspace(ctx);
  const sMap = new Map(suppliers.map((s) => [s.id, s]));
  const list = fabrics.filter((f) => !searchParams.supplier || f.supplierId === searchParams.supplier);
  return (
    <div>
      <PageHeader title={t.fabrics.title} subtitle={t.fabrics.subtitle} actions={<LinkButton href="/fabrics/new" icon="plus">{t.fabrics.new}</LinkButton>} />
      {list.length === 0 ? (
        <Empty text={t.common.empty} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((f) => {
            const fl = lots.filter((l) => l.fabricId === f.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const s = sMap.get(f.supplierId);
            return (
              <Link key={f.id} href={`/fabrics/${f.id}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-glow">
                <div className="relative h-36 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.photoUrl ? <img src={f.photoUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="h-full w-full" style={{ background: f.colorHex }} />}
                  <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">{FIBER_MAP[f.fiber].short}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {isStaff(ctx.user) && s?.logoUrl && <img src={s.logoUrl} alt="" className="absolute right-3 top-3 h-7 w-7 rounded-md bg-white" />}
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{f.code}</div>
                  <div className="font-bold">{f.name}</div>
                  <div className="text-xs text-gray-500">{f.color} · {f.composition} · {f.weightGsm} g/m²</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{fl.length} {t.fabrics.lots.toLowerCase()}</span>
                    {fl[0] && <StatusBadge status={fl[0].status} locale={locale} />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
