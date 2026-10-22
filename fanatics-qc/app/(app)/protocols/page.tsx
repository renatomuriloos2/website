import Link from "next/link";
import { Icon } from "@/components/icons";
import { Badge, Card, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { saveRequirementAction } from "@/lib/actions/admin";
import { DECORATIONS, FIBERS, PRODUCT_TIERS, TEST_MAP, TEST_METHODS } from "@/lib/domain/catalog";
import { indexRequirements, specFor } from "@/lib/domain/engine";
import type { TestCategory } from "@/lib/domain/types";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Protocols" };

const TABS = ["decorations", "tests", "requirements", "scales"] as const;

export default async function ProtocolsPage({ searchParams }: { searchParams: { tab?: string; test?: string } }) {
  const ctx = await requireUser();
  const { t, locale } = getI18n();
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? "") ? searchParams.tab! : "decorations";
  const reqs = indexRequirements(await getRepo().listRequirements(ctx));
  const admin = ctx.user.role === "admin";
  const cats: TestCategory[] = ["migration", "colorfastness", "decoration", "physical", "shade", "chemical"];
  const selectedTest = TEST_MAP[searchParams.test ?? ""] ?? TEST_MAP.dye_migration;
  const tabLabel = { decorations: t.protocols.decorations, tests: t.protocols.tests, requirements: t.protocols.requirements, scales: t.protocols.scales };

  return (
    <div>
      <PageHeader kicker="AATCC · ISO · ASTM · Fanatics" title={t.protocols.title} subtitle={t.protocols.subtitle} />
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-fx-line">
        {TABS.map((k) => (
          <Link key={k} href={`/protocols?tab=${k}`} className={cx("whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold", tab === k ? "bg-fx-ink text-white" : "text-gray-500 hover:text-fx-ink")}>
            {tabLabel[k]}
          </Link>
        ))}
      </nav>

      {tab === "decorations" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={locale === "es" ? "Niveles de producto Fanatics y su decoración" : "Fanatics product tiers and how they are decorated"} className="lg:col-span-2" bodyClass="p-0">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <tbody className="divide-y divide-fx-line">
                  {PRODUCT_TIERS.map((p) => (
                    <tr key={p.tier}>
                      <td className="px-5 py-2.5 font-bold">{p.tier}</td>
                      <td className="px-2 py-2.5 text-xs text-gray-500">{p.league}</td>
                      <td className="px-5 py-2.5 text-gray-700">{p.decoration[locale]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {DECORATIONS.map((d) => (
            <Card key={d.code} title={d.name[locale]} subtitle={d.description[locale]}>
              <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                {[
                  [t.protocols.processTemp, d.processTempC ? `${d.processTempC} °C` : "—"],
                  [t.protocols.lowTemp, d.lowTempC ? `${d.lowTempC} °C` : "—"],
                  [t.protocols.dwell, d.dwellS ? `${d.dwellS} s` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-fx-mist p-3">
                    <div className="font-display text-xl font-extrabold">{v}</div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-500">{k}</div>
                  </div>
                ))}
              </div>
              <div className="label">{t.protocols.criticalTests}</div>
              <ul className="mb-4 space-y-1">
                {d.tests.map((x) => (
                  <li key={x.testId} className="flex items-center justify-between text-sm">
                    <Link href={`/protocols?tab=tests&test=${x.testId}`} className="hover:text-fx-red">
                      <b>{TEST_MAP[x.testId].code}</b> · {TEST_MAP[x.testId].name[locale]}
                    </Link>
                    {x.critical && <Badge tone="bad" dot={false}>{t.protocols.critical}</Badge>}
                  </li>
                ))}
              </ul>
              <div className="label">{t.protocols.fibers}</div>
              <div className="mb-4 flex flex-wrap gap-1">
                {FIBERS.map((f) => (
                  <span key={f.code} className={cx("rounded px-2 py-0.5 text-[11px] font-semibold", d.fibers.includes(f.code) ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-300 line-through")}>{f.short}</span>
                ))}
              </div>
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <b>{t.lots.tips}: </b>
                {d.tips[locale]}
              </p>
            </Card>
          ))}
        </div>
      )}

      {tab === "tests" && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="card h-fit p-2">
            {cats.map((c) => (
              <div key={c} className="mb-2">
                <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">{t.protocols[`cat_${c}` as keyof typeof t.protocols]}</div>
                {TEST_METHODS.filter((x) => x.category === c).map((x) => (
                  <Link key={x.id} href={`/protocols?tab=tests&test=${x.id}`} className={cx("block rounded-lg px-3 py-2 text-sm", selectedTest.id === x.id ? "bg-fx-ink text-white" : "hover:bg-fx-mist")}>
                    <b>{x.code}</b>
                    <span className={cx("block truncate text-xs", selectedTest.id === x.id ? "text-white/70" : "text-gray-500")}>{x.name[locale]}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <Card title={`${selectedTest.code} · ${selectedTest.name[locale]}`} subtitle={`${t.protocols.standards}: ${selectedTest.standards}`}>
            <p className="text-sm text-gray-700">{selectedTest.summary[locale]}</p>
            <div className="label mt-5">{t.protocols.procedure}</div>
            <ol className="space-y-2">
              {selectedTest.procedure.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fx-red text-xs font-bold text-white">{i + 1}</span>
                  {p[locale]}
                </li>
              ))}
            </ol>
            <div className="label mt-6">{t.protocols.requirements}</div>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-fx-line">
                    <th className="th pl-0">{t.protocols.reading}</th>
                    {FIBERS.map((f) => <th key={f.code} className="th text-center">{f.short}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-fx-line">
                  {selectedTest.readings.map((r) => (
                    <tr key={r.key}>
                      <td className="py-2 pr-2 font-medium">{r.label[locale]}</td>
                      {FIBERS.map((f) => {
                        const s = specFor(selectedTest, f.code, r.key, reqs);
                        return <td key={f.code} className="py-2 text-center tabular-nums">{s.min !== null ? `≥${s.min}` : ""}{s.max !== null ? `≤${s.max}` : ""}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {DECORATIONS.filter((d) => d.tests.some((x) => x.testId === selectedTest.id)).map((d) => (
                <Badge key={d.code} tone="info" dot={false}>{d.name[locale]}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "requirements" && (
        <Card title={t.protocols.requirements} subtitle={t.protocols.requirementsHint} bodyClass="p-0">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[1100px] text-xs">
              <thead className="sticky top-0 bg-fx-mist">
                <tr>
                  <th className="th">{t.lots.test}</th>
                  <th className="th">{t.protocols.reading}</th>
                  {FIBERS.map((f) => <th key={f.code} className="th text-center" title={f.name[locale]}>{f.short}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-fx-line">
                {TEST_METHODS.flatMap((test) =>
                  test.readings.map((r, i) => (
                    <tr key={`${test.id}-${r.key}`} className="hover:bg-fx-mist/40">
                      <td className="px-4 py-1.5 font-semibold">{i === 0 ? test.code : ""}</td>
                      <td className="px-4 py-1.5 text-gray-600">{r.label[locale]}{r.unit ? ` (${r.unit})` : ""}</td>
                      {FIBERS.map((f) => {
                        const s = specFor(test, f.code, r.key, reqs);
                        const field = s.min !== null || r.min !== undefined ? "min" : "max";
                        const value = field === "min" ? s.min : s.max;
                        return (
                          <td key={f.code} className="px-1 py-1 text-center">
                            {admin ? (
                              <form action={saveRequirementAction} className="flex items-center justify-center gap-0.5">
                                <input type="hidden" name="fiber" value={f.code} />
                                <input type="hidden" name="testId" value={test.id} />
                                <input type="hidden" name="key" value={r.key} />
                                {field === "max" && <input type="hidden" name="min" value="" />}
                                <span className="text-gray-400">{field === "min" ? "≥" : "≤"}</span>
                                <input name={field} defaultValue={value ?? ""} inputMode="decimal" className="w-12 rounded border border-transparent bg-transparent px-1 py-0.5 text-center tabular-nums hover:border-fx-line focus:border-fx-red focus:bg-white focus:outline-none" />
                                {field === "min" && <input type="hidden" name="max" value={s.max ?? ""} />}
                                <button className="hidden" aria-hidden>save</button>
                              </form>
                            ) : (
                              <span className="tabular-nums">{field === "min" ? "≥" : "≤"}{value ?? "—"}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {admin && <p className="flex items-center gap-2 border-t border-fx-line px-5 py-3 text-xs text-gray-500"><Icon name="key" className="h-4 w-4" /> Enter ↵ {locale === "es" ? "para guardar la celda. Cada cambio queda en la auditoría." : "to save a cell. Every change is written to the audit log."}</p>}
        </Card>
      )}

      {tab === "scales" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            { title: "AATCC EP1 — Gray Scale for Color Change", rows: [[5, "0.0"], ["4-5", "0.8"], [4, "1.7"], ["3-4", "2.5"], [3, "3.4"], ["2-3", "4.8"], [2, "6.8"], ["1-2", "9.6"], [1, "13.6"]], from: "#7a7a7a", fade: true },
            { title: "AATCC EP2 — Gray Scale for Staining", rows: [[5, "0.0"], ["4-5", "2.3"], [4, "4.5"], ["3-4", "6.8"], [3, "9.0"], ["2-3", "12.8"], [2, "18.1"], ["1-2", "25.6"], [1, "36.2"]], from: "#ffffff", fade: false },
          ].map((sc) => (
            <Card key={sc.title} title={sc.title} subtitle={locale === "es" ? "ΔE CIELAB nominal por grado — usado para convertir lecturas del espectrofotómetro (EP7 / EP12)" : "Nominal CIELAB ΔE per grade — used to convert spectrophotometer readings (EP7 / EP12)"}>
              <div className="space-y-1.5">
                {sc.rows.map(([g, de], i) => (
                  <div key={String(g)} className="flex items-center gap-3">
                    <span className="w-10 text-right text-sm font-bold">{g}</span>
                    <div className="flex h-7 flex-1 overflow-hidden rounded ring-1 ring-black/10">
                      <div className="flex-1" style={{ background: sc.from }} />
                      <div className="flex-1" style={{ background: sc.fade ? `hsl(0 0% ${48 + i * 5}%)` : `hsl(0 0% ${100 - i * 6}%)` }} />
                    </div>
                    <span className="w-14 text-right text-xs tabular-nums text-gray-500">ΔE {de}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <Card title={locale === "es" ? "Interpretación del manchado por migración (escala de grises)" : "Dye-migration staining interpretation (gray scale)"} className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["4 – 5", locale === "es" ? "Migración baja: tintas blancas estándar OK." : "Low migration: standard whites are fine.", "#0E9F6E"],
                ["3 – 3.5", locale === "es" ? "Usar tintas low-bleed (poly white) y verificar en producción." : "Use low-bleed (poly white) inks and verify in production.", "#E8A317"],
                ["≤ 2.5", locale === "es" ? "Riesgo alto: base bloqueadora gris/negra + tinta de bajo curado, o no decorar con calor." : "High risk: grey/black dye-blocker underbase + low-cure ink, or avoid heat decoration.", "#DC2626"],
              ].map(([g, text, c]) => (
                <div key={g} className="rounded-xl border-l-4 bg-fx-mist p-4" style={{ borderLeftColor: c }}>
                  <div className="font-display text-2xl font-extrabold">{g}</div>
                  <div className="text-xs text-gray-600">{text}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title={locale === "es" ? "Clasificación de temperatura (escalera de migración)" : "Temperature classification (migration ladder)"} className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ["A", "≥ 200 °C", locale === "es" ? "Apta para sublimación total y todos los procesos de calor" : "Fit for full sublimation and every heat process", "#0E9F6E"],
                ["B", "170 – 190 °C", locale === "es" ? "Plastisol / twill estándar; spot sublimation con restricciones" : "Standard plastisol / twill; spot sublimation restricted", "#2563EB"],
                ["C", "140 – 160 °C", locale === "es" ? "Solo tintas y adhesivos de bajo curado + bloqueador" : "Low-cure inks & adhesives + blocker only", "#E8A317"],
                ["D", "< 140 °C", locale === "es" ? "No apta para decoración con calor — bordado / tampografía" : "Not fit for heat decoration — embroidery / pad print", "#DC2626"],
              ].map(([k, range, text, c]) => (
                <div key={k} className="rounded-xl p-4 text-white" style={{ background: c }}>
                  <div className="font-display text-4xl font-black italic">{k}</div>
                  <div className="font-bold">{range}</div>
                  <div className="mt-1 text-xs text-white/85">{text}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
