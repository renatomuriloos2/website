import Link from "next/link";
import { notFound } from "next/navigation";
import { CapaBadge } from "@/components/CapaBadge";
import { Icon } from "@/components/icons";
import { CapaForm } from "@/components/QualityForms";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Avatar, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo, isStaff } from "@/lib/data";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "CAPA" };

export default async function CapaPage({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const { locale } = getI18n();
  const es = locale === "es";
  const repo = getRepo();
  const capa = await repo.getCapa(ctx, params.id).catch(() => null);
  if (!capa) notFound();
  const bundle = await repo.getLotBundle(ctx, capa.lotId).catch(() => null);
  if (!bundle) notFound();
  const retest = capa.retestLotId ? await repo.getLotBundle(ctx, capa.retestLotId).catch(() => null) : null;
  const staff = isStaff(ctx.user);
  const supplierCanEdit = !staff && (capa.status === "open" || capa.status === "returned");
  const steps = [
    { k: "open", label: es ? "Abierta" : "Opened", at: capa.createdAt },
    { k: "submitted", label: es ? "Enviada por el mill" : "Submitted by mill", at: capa.submittedAt },
    { k: "accepted", label: es ? "Aceptada por Fanatics" : "Accepted by Fanatics", at: capa.status === "accepted" || capa.status === "closed" ? capa.updatedAt : null },
    { k: "closed", label: es ? "Cerrada (verificada)" : "Closed (verified)", at: capa.closedAt },
  ];
  return (
    <div className="space-y-6">
      <Link href="/capa" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-fx-ink">
        <Icon name="chevron" className="h-4 w-4 rotate-180" /> CAPA
      </Link>
      <section className="fx-stripes relative overflow-hidden rounded-3xl bg-fx-ink p-6 text-white lg:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fx-red/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2"><CapaBadge capa={capa} locale={locale} /></div>
            <h1 className="font-display text-3xl font-black italic">{capa.ref}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/70">{capa.problem}</p>
            <div className="mt-4 flex items-center gap-3 text-sm">
              <Avatar src={bundle.supplier.logoUrl} name={bundle.supplier.name} size={32} rounded="rounded-lg" />
              <span className="font-semibold">{bundle.supplier.name}</span>
              <span className="text-white/50">·</span>
              <Link href={`/lots/${bundle.lot.id}`} className="underline decoration-white/30 hover:decoration-white">{bundle.lot.ref}</Link>
              <StatusBadge status={bundle.lot.status} locale={locale} />
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-[11px] uppercase tracking-wide text-white/50">{es ? "Fecha límite" : "Due date"}</div>
            <div className="font-display text-3xl font-black italic">{fmtDate(capa.dueDate ? capa.dueDate + "T12:00:00" : null, locale)}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title={es ? "Plan de acción (8D simplificado)" : "Action plan (simplified 8D)"} subtitle={supplierCanEdit ? (es ? "Completa los 4 puntos y envíalo a Fanatics." : "Complete the 4 sections and submit to Fanatics.") : undefined}>
          {capa.status === "returned" && capa.reviewNotes && <div className="mb-4"><Alert tone="bad">{es ? "Devuelta por Fanatics:" : "Returned by Fanatics:"} {capa.reviewNotes}</Alert></div>}
          <CapaForm capa={capa} staff={staff} supplierCanEdit={supplierCanEdit} />
        </Card>
        <div className="space-y-6">
          <Card title={es ? "Seguimiento" : "Progress"}>
            <ol className="relative space-y-4 border-l border-fx-line pl-5">
              {steps.map((s) => (
                <li key={s.k} className="relative">
                  <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white ring-1 ring-fx-line ${s.at ? "bg-emerald-500" : "bg-gray-200"}`} />
                  <div className={`text-sm ${s.at ? "font-semibold" : "text-gray-400"}`}>{s.label}</div>
                  <div className="text-xs text-gray-400">{s.at ? fmtDateTime(s.at, locale) : "—"}</div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title={es ? "Verificación de efectividad" : "Effectiveness check"}>
            {retest ? (
              <Link href={`/lots/${retest.lot.id}`} className="flex items-center justify-between rounded-xl bg-fx-mist p-3 hover:bg-fx-mist/70">
                <div>
                  <div className="text-xs text-gray-500">{es ? "Lote de re-test" : "Retest lot"}</div>
                  <div className="font-bold">{retest.lot.ref}</div>
                </div>
                <StatusBadge status={retest.lot.status} locale={locale} />
              </Link>
            ) : (
              <p className="text-sm text-gray-500">
                {es ? "La CAPA se cierra automáticamente cuando un lote de re-test vinculado es aprobado." : "The CAPA closes automatically when a linked retest lot is approved."}
              </p>
            )}
            {!staff && (capa.status === "accepted") && !retest && (
              <Link href={`/lots/new?retest=${capa.lotId}`} className="btn-primary mt-3 w-full">
                <Icon name="plus" className="h-4 w-4" /> {es ? "Enviar lote de re-test" : "Submit retest lot"}
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
