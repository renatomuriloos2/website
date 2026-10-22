import Link from "next/link";
import { notFound } from "next/navigation";
import { BaseTable, ColorDot, ColorMatrix, EvidenceStrip, FiberNote, LadderCard, MethodCard, PlacementSheet, ResultBlock } from "@/components/Dossier";
import { Icon } from "@/components/icons";
import { DecisionForm, DeleteResultButton, EvidenceUpload, ResultForm } from "@/components/LotForms";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, Avatar, Card, LinkButton, Progress } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo, isStaff } from "@/lib/data";
import { BASE_TESTS, DECORATION_MAP, FIBER_MAP, GARMENTS, STATUS_MAP, TEST_MAP } from "@/lib/domain/catalog";
import { evaluateLotColors, indexRequirements } from "@/lib/domain/engine";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Lot dossier" };

export default async function LotPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const repo = getRepo();
  const bundle = await repo.getLotBundle(ctx, params.id).catch(() => null);
  if (!bundle) notFound();
  const { lot, fabric, supplier, results, evidence, events } = bundle;
  const reqs = indexRequirements(await repo.listRequirements(ctx));
  const { overall: ev, perColor } = evaluateLotColors(fabric.fiber, lot, results, reqs);
  const staff = isStaff(ctx.user);
  const decided = ["approved", "approved_concession", "rejected"].includes(lot.status);
  const canEdit = staff || !decided;

  const requiredTests = Array.from(new Set([...BASE_TESTS.map((x) => x.id), ...lot.methods.flatMap((m) => DECORATION_MAP[m].tests.map((x) => x.testId))]));
  const latestIds = new Set(results.map((r) => r.testId));
  const sortedResults = [...results].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ladder = sortedResults.find((r) => r.testId === "dye_migration");
  const others = ev.methods.filter((m) => !lot.methods.includes(m.code) && m.verdict !== "not_applicable" && m.verdict !== "pending");
  const looseEvidence = evidence.filter((e) => !e.resultId);

  return (
    <div className="space-y-6">
      <Link href="/lots" className="no-print inline-flex items-center gap-1 text-sm text-gray-500 hover:text-fx-ink">
        <Icon name="chevron" className="h-4 w-4 rotate-180" /> {t.lots.title}
      </Link>

      {searchParams.created && <Alert tone="ok">✓ {t.lots.submitted} — {lot.ref}. {locale === "es" ? "Fanatics QC fue notificado." : "Fanatics QC has been notified."}</Alert>}

      {/* Hero */}
      <section className="fx-stripes relative overflow-hidden rounded-3xl bg-fx-ink text-white shadow-card">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fx-red/25 blur-3xl" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[220px_1fr_auto] lg:p-8">
          <div className="h-44 overflow-hidden rounded-2xl ring-4 ring-white/10 lg:h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {fabric.photoUrl ? <img src={fabric.photoUrl} alt={fabric.name} className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: fabric.colorHex }} />}
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={lot.status} locale={locale} />
              {lot.isRetest && <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-bold text-violet-200">RETEST</span>}
              <span className="text-xs text-white/50">{t.lots.dossier}</span>
            </div>
            <h1 className="font-display text-3xl font-black italic tracking-tight sm:text-4xl">{lot.ref}</h1>
            <p className="mt-1 text-white/70">
              {fabric.name} · {fabric.color} · {lot.program || GARMENTS[lot.garmentType][locale]}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar src={supplier.logoUrl} name={supplier.name} size={36} rounded="rounded-lg" />
              <div className="text-sm">
                <div className="font-semibold">{supplier.name}</div>
                <div className="text-xs text-white/50">{supplier.city}, {supplier.country}</div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
              {[
                [t.lots.lotNumber, lot.lotNumber],
                [t.lots.po, lot.poNumber || "—"],
                [t.lots.fiber, FIBER_MAP[fabric.fiber].name[locale]],
                [t.fabrics.composition, fabric.composition],
                [t.fabrics.construction, `${fabric.construction} · ${fabric.weightGsm ?? "—"} g/m²`],
                [t.fabrics.dyeClass, fabric.dyeClass],
                [t.lots.lab, lot.labName || "—"],
                [t.lots.submitted, fmtDate(lot.submittedAt, locale)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-white/40">{k}</dt>
                  <dd className="font-medium text-white/90">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-3 lg:w-56">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="text-[11px] uppercase tracking-wide text-white/50">{t.lots.maxSafe}</div>
              <div className="font-display text-4xl font-black italic">{ev.maxSafeTempC ? `${ev.maxSafeTempC}°C` : "—"}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="mb-2 flex justify-between text-[11px] uppercase tracking-wide text-white/50">
                <span>{t.lots.progress}</span>
                <span className="font-bold text-white">{ev.completeness}%</span>
              </div>
              <Progress value={ev.completeness} tone={ev.completeness === 100 ? "ok" : "info"} />
              <div className="mt-3 text-[11px] text-white/50">{t.lots.suggested}</div>
              <div className="text-sm font-bold">{STATUS_MAP[ev.suggested].label[locale]}</div>
            </div>
            <div className="no-print flex gap-2">
              <a href={`/dossier/${lot.id}`} className="btn flex-1 bg-white text-fx-ink hover:bg-white/90">
                <Icon name="printer" className="h-4 w-4" /> {t.lots.dossier}
              </a>
              {(lot.status === "retest" || lot.status === "rejected") && (
                <Link href={`/lots/new?retest=${lot.id}`} className="btn bg-fx-red text-white">
                  <Icon name="plus" className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {lot.decisionNotes && (
        <div className="card flex gap-4 border-l-4 p-5" style={{ borderLeftColor: "#09203F" }}>
          <Icon name="shield" className="h-6 w-6 shrink-0 text-fx-red" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t.lots.decision} · {lot.decidedBy} · {fmtDateTime(lot.decidedAt, locale)}
            </div>
            <p className="mt-1 text-sm">{lot.decisionNotes}</p>
          </div>
        </div>
      )}

      {perColor.length > 0 && (
        <Card
          title={`${locale === "es" ? "Colores ensayados" : "Colors tested"} (${perColor.length})`}
          subtitle={locale === "es" ? "Cada color se evalúa por separado; el lote toma el peor color." : "Each color is evaluated separately; the lot takes the worst color."}
          actions={<div className="flex -space-x-1.5">{lot.colors.map((c) => <ColorDot key={c.id} color={c} size={22} />)}</div>}
        >
          <ColorMatrix perColor={perColor} methods={lot.methods} results={results} locale={locale} t={t} />
        </Card>
      )}

      {/* Decoration readiness */}
      <Card title={t.lots.decorationReadiness} subtitle={`${FIBER_MAP[fabric.fiber].name[locale]} · ${lot.methods.length} ${t.lots.methods.toLowerCase()}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ev.requested.map((m) => (
            <MethodCard key={m.code} m={m} locale={locale} t={t} />
          ))}
        </div>
        {others.length > 0 && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-gray-600">
              {locale === "es" ? "Otros métodos evaluados con los datos disponibles" : "Other methods evaluated with the available data"} ({others.length})
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {others.map((m) => (
                <MethodCard key={m.code} m={m} locale={locale} t={t} compact />
              ))}
            </div>
          </details>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`${t.lots.heatLadder} · ${TEST_MAP.dye_migration.code}`} subtitle={TEST_MAP.dye_migration.name[locale]}>
          {ladder ? <LadderCard result={ladder} fabric={fabric} reqs={reqs} maxSafe={ev.maxSafeTempC} t={t} locale={locale} /> : <p className="text-sm text-gray-400">{t.lots.pending}</p>}
          <div className="mt-4">
            <FiberNote fabric={fabric} locale={locale} />
          </div>
        </Card>
        <Card title={t.lots.baseQualification}>
          <BaseTable evaluation={ev} results={results} locale={locale} t={t} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card title={`${t.lots.results} (${results.length})`}>
            {sortedResults.length === 0 && <p className="text-sm text-gray-400">{t.lots.noResults}</p>}
            <div className="space-y-3">
              {sortedResults.map((r) => (
                <ResultBlock
                  key={r.id}
                  result={r}
                  fabric={fabric}
                  reqs={reqs}
                  evidence={evidence.filter((e) => e.resultId === r.id)}
                  color={lot.colors.find((c) => c.id === r.colorId)}
                  locale={locale}
                  t={t}
                  actions={canEdit ? <DeleteResultButton lotId={lot.id} resultId={r.id} /> : null}
                />
              ))}
            </div>
          </Card>
          <Card title={`${t.lots.evidence} (${evidence.length})`}>
            {looseEvidence.length ? <EvidenceStrip items={looseEvidence} large /> : <p className="text-sm text-gray-400">{t.lots.noEvidence}</p>}
            <div className="no-print mt-5">
              <EvidenceUpload lotId={lot.id} />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {canEdit && (
            <Card title={t.lots.addResult} className="no-print">
              <ResultForm lotId={lot.id} requiredTests={requiredTests} doneTests={Array.from(latestIds)} defaultLab={lot.labName} colors={lot.colors} />
            </Card>
          )}
          {staff && (
            <Card title={t.lots.decide} subtitle={t.common.adminOnly} className="no-print">
              <DecisionForm
                lotId={lot.id}
                current={lot.status}
                suggested={ev.suggested}
                notes={lot.decisionNotes}
                methods={ev.requested.map((m) => ({ code: m.code, verdict: m.verdict, conditions: m.conditions, maxTempC: m.maxTempC, override: lot.overrides[m.code] ?? null }))}
              />
            </Card>
          )}
          <Card title={t.lots.timeline}>
            <ol className="relative space-y-4 border-l border-fx-line pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-fx-ink ring-1 ring-fx-line" />
                  <div className="text-xs text-gray-400">{fmtDateTime(e.at, locale)} · {e.actor}</div>
                  <div className="text-sm">
                    {e.type === "result" ? `+ ${TEST_MAP[e.message]?.code ?? e.message}` : e.type === "evidence" ? `📎 ${e.message}` : e.to ? (
                      <>
                        {e.type} → <b>{STATUS_MAP[e.to]?.label[locale] ?? e.to}</b>
                      </>
                    ) : (
                      e.type
                    )}
                  </div>
                  {e.message && (e.type === "decision" || e.type === "status") && <p className="mt-0.5 text-xs text-gray-500">{e.message}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Card title={t.lots.placements} subtitle={GARMENTS[lot.garmentType][locale]}>
        <PlacementSheet garment={lot.garmentType} locale={locale} approved={lot.status === "approved" || lot.status === "approved_concession"} />
      </Card>

      <div className="no-print flex justify-end">
        <LinkButton href={`/dossier/${lot.id}`} variant="dark" icon="printer">{t.common.print}</LinkButton>
      </div>
    </div>
  );
}
