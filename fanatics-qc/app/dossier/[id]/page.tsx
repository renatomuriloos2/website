import Link from "next/link";
import { notFound } from "next/navigation";
import { FanaticsMark } from "@/components/Brand";
import { BaseTable, ColorMatrix, EvidenceStrip, GarmentTrialCard, FiberNote, LadderCard, MethodCard, PlacementSheet, ResultBlock, conditionText } from "@/components/Dossier";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { DECORATION_MAP, FIBER_MAP, GARMENTS, STATUS_MAP } from "@/lib/domain/catalog";
import { evaluateLotColors, indexRequirements } from "@/lib/domain/engine";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { PrintButton } from "../PrintButton";

export const metadata = { title: "Dossier" };

function Section({ n, title, children, className = "" }: { n: number | string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-8 ${className}`}>
      <h2 className="mb-3 flex items-center gap-3 border-b-2 border-fx-ink pb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-fx-ink">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-fx-red text-[10px] text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function DossierPage({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const repo = getRepo();
  const bundle = await repo.getLotBundle(ctx, params.id).catch(() => null);
  if (!bundle) notFound();
  const { lot, fabric, supplier, results, evidence, trials, capas } = bundle;
  const reqs = indexRequirements(await repo.listRequirements(ctx));
  const { overall: ev, perColor } = evaluateLotColors(fabric.fiber, lot, results, reqs, trials);
  const ready = ev.requested.filter((m) => m.verdict === "approved" || m.verdict === "conditional");
  const notReady = ev.requested.filter((m) => m.verdict === "rejected");
  const sorted = [...results].sort((a, b) => a.testedAt.localeCompare(b.testedAt));
  const ladder = sorted.filter((r) => r.testId === "dye_migration").pop();
  const photos = evidence.filter((e) => e.mime.startsWith("image/") && e.kind !== "garment_before" && e.kind !== "garment_after");

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-2">
        <Link href={`/lots/${lot.id}`} className="text-sm text-gray-600 hover:text-fx-ink">← {lot.ref}</Link>
        <PrintButton label={t.common.print} />
      </div>
      <article className="mx-auto max-w-[210mm] overflow-x-auto bg-white px-5 py-10 sm:px-10 shadow-2xl print:max-w-none print:p-0 print:shadow-none">
        {/* Header band, after the decoration spec-sheet layout */}
        <header className="-mx-5 -mt-10 mb-6 bg-fx-ink px-5 py-5 sm:-mx-10 sm:px-10 text-white print:mx-0 print:mt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FanaticsMark className="h-9 w-auto" />
              <div>
                <div className="font-brand text-xl font-bold leading-none">Fanatics</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-fx-red">Decoration QC Lab</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">{t.lots.reportTitle}</div>
              <div className="font-display text-2xl font-black italic">{lot.ref}</div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-[150px_1fr] print:grid-cols-[150px_1fr]">
          <div className="h-[150px] overflow-hidden rounded-xl ring-1 ring-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {fabric.photoUrl ? <img src={fabric.photoUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: fabric.colorHex }} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold leading-tight">{fabric.code} {fabric.name}</h1>
                <p className="text-sm text-gray-600">{fabric.color} · {fabric.composition}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {supplier.logoUrl && <img src={supplier.logoUrl} alt="" className="h-10 w-10 rounded-lg" />}
                <div className="text-right text-xs">
                  <div className="font-bold">{supplier.name}</div>
                  <div className="text-gray-500">{supplier.city}, {supplier.country}</div>
                </div>
              </div>
            </div>
            <table className="mt-3 w-full text-[11px]">
              <tbody>
                {[
                  [t.lots.lotNumber, lot.lotNumber, t.lots.po, lot.poNumber || "—"],
                  [t.lots.fiber, FIBER_MAP[fabric.fiber].name[locale], t.fabrics.construction, `${fabric.construction} · ${fabric.weightGsm ?? "—"} g/m²`],
                  [t.lots.program, lot.program || "—", t.lots.garment, GARMENTS[lot.garmentType][locale]],
                  [t.lots.lab, lot.labName || "—", t.lots.issued, fmtDate(new Date().toISOString(), locale)],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100">
                    <td className="py-1 pr-2 font-semibold text-gray-500">{row[0]}</td>
                    <td className="py-1 pr-4">{row[1]}</td>
                    <td className="py-1 pr-2 font-semibold text-gray-500">{row[2]}</td>
                    <td className="py-1">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verdict banner */}
        <div className="mt-6 grid overflow-hidden sm:grid-cols-3 print:grid-cols-3 rounded-xl ring-1 ring-fx-line">
          <div className="bg-fx-mist p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t.lots.decision}</div>
            <div className="mt-1"><StatusBadge status={lot.status} locale={locale} /></div>
            <div className="mt-1 text-[10px] text-gray-500">{lot.decidedBy ? `${t.lots.verifiedBy} ${lot.decidedBy} · ${fmtDate(lot.decidedAt, locale)}` : `${t.lots.suggested}: ${STATUS_MAP[ev.suggested].label[locale]}`}</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t.lots.maxSafe}</div>
            <div className="font-display text-3xl font-black italic text-fx-ink">{ev.maxSafeTempC ? `${ev.maxSafeTempC} °C` : "—"}</div>
          </div>
          <div className="p-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{t.lots.progress}</div>
            <div className="font-display text-3xl font-black italic text-fx-ink">{ev.completeness}%</div>
          </div>
        </div>
        {lot.decisionNotes && <p className="mt-3 rounded-lg border-l-4 border-fx-red bg-red-50/40 px-4 py-2 text-xs">{lot.decisionNotes}</p>}

        {perColor.length > 0 && (
          <Section n="C" title={locale === "es" ? "Colores ensayados" : "Colors tested"}>
            <ColorMatrix perColor={perColor} methods={lot.methods} results={results} locale={locale} t={t} />
          </Section>
        )}

        <Section n={1} title={t.lots.decorationReadiness}>
          <div className="mb-3 grid gap-3 text-xs sm:grid-cols-2 print:grid-cols-2">
            <div className="rounded-lg bg-emerald-50 p-3">
              <b className="text-emerald-700">✓ {t.lots.readyFor}:</b> {ready.map((m) => DECORATION_MAP[m.code].name[locale]).join(" · ") || "—"}
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <b className="text-red-700">✕ {t.lots.notReadyFor}:</b> {notReady.map((m) => DECORATION_MAP[m.code].name[locale]).join(" · ") || "—"}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {ev.requested.map((m) => (
              <MethodCard key={m.code} m={m} locale={locale} t={t} />
            ))}
          </div>
        </Section>

        <Section n={2} title={t.lots.conditions}>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-fx-line">
              {ev.requested.map((m) => (
                <tr key={m.code}>
                  <td className="w-1/3 py-2 pr-3 font-semibold">{DECORATION_MAP[m.code].name[locale]}</td>
                  <td className="py-2">{m.conditions.length ? m.conditions.map((c) => conditionText(c, locale, m.maxTempC)).join(" · ") : m.verdict === "approved" ? (locale === "es" ? "Sin condiciones especiales" : "No special conditions") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3"><FiberNote fabric={fabric} locale={locale} /></div>
        </Section>

        <Section n={3} title={t.lots.heatLadder}>
          {ladder ? <LadderCard result={ladder} fabric={fabric} reqs={reqs} maxSafe={ev.maxSafeTempC} t={t} locale={locale} /> : <p className="text-xs text-gray-400">{t.lots.pending}</p>}
        </Section>

        <Section n={4} title={t.lots.baseQualification}>
          <BaseTable evaluation={ev} results={results} locale={locale} t={t} />
        </Section>

        {trials.length > 0 && (
          <Section n="W" title={locale === "es" ? "Prueba de prenda terminada (antes / después del lavado)" : "Finished-garment wash trial (before / after)"}>
            <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
              {trials.map((tr) => (
                <GarmentTrialCard key={tr.id} trial={tr} evidence={evidence} color={lot.colors.find((c) => c.id === tr.colorId)} locale={locale} />
              ))}
            </div>
          </Section>
        )}

        {capas.length > 0 && (
          <Section n="!" title="CAPA">
            {capas.map((c) => (
              <div key={c.id} className="mb-3 rounded-xl border border-fx-line p-3 text-xs">
                <div className="mb-1 font-bold">{c.ref} · {c.status}</div>
                <p className="text-gray-600">{c.problem}</p>
                {c.rootCause && <p className="mt-1"><b>{locale === "es" ? "Causa raíz" : "Root cause"}:</b> {c.rootCause}</p>}
                {c.correctiveAction && <p><b>{locale === "es" ? "Correctiva" : "Corrective"}:</b> {c.correctiveAction}</p>}
                {c.preventiveAction && <p><b>{locale === "es" ? "Preventiva" : "Preventive"}:</b> {c.preventiveAction}</p>}
              </div>
            ))}
          </Section>
        )}

        <Section n={5} title={t.lots.placements} className="print-break">
          <PlacementSheet garment={lot.garmentType} locale={locale} approved={lot.status === "approved" || lot.status === "approved_concession"} />
        </Section>

        <Section n={6} title={t.lots.tips}>
          <div className="space-y-3">
            {ev.requested.map((m) => (
              <div key={m.code} className="text-xs">
                <b className="uppercase">{DECORATION_MAP[m.code].name[locale]}</b>
                <p className="text-gray-600">{DECORATION_MAP[m.code].description[locale]}</p>
                <p className="font-semibold">{DECORATION_MAP[m.code].tips[locale]}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section n={7} title={t.lots.rawData} className="print-break">
          <div className="space-y-2">
            {sorted.map((r) => (
              <ResultBlock key={r.id} result={r} fabric={fabric} reqs={reqs} evidence={[]} color={lot.colors.find((c) => c.id === r.colorId)} locale={locale} t={t} />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-500">{t.lots.gradeScale}</p>
        </Section>

        {photos.length > 0 && (
          <Section n={8} title={t.lots.evidence}>
            <EvidenceStrip items={photos.slice(0, 12)} large />
          </Section>
        )}

        <footer className="mt-10 border-t border-fx-line pt-3 text-[10px] text-gray-500">
          {t.lots.reportFooter} · {lot.ref} · {evidence.length} evidence file(s), SHA-256 fingerprinted · {fmtDate(new Date().toISOString(), locale)}
        </footer>
      </article>
    </div>
  );
}
