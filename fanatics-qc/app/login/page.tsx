import { Brand } from "@/components/Brand";
import { Icon } from "@/components/icons";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Avatar } from "@/components/ui";
import { demoSignInAction, enterDemoAction, exitDemoAction } from "@/lib/actions/session";
import { demoDb } from "@/lib/data/demo";
import { DECORATIONS } from "@/lib/domain/catalog";
import { canSwitchMode, isDemo } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  const { t, locale } = getI18n();
  const demo = isDemo();
  const switchable = canSwitchMode();
  const db = demo ? demoDb() : null;
  const demoUsers = db
    ? [
        { u: db.users.find((x) => x.id === "u_admin")!, label: t.auth.demoAdmin, icon: "shield" },
        { u: db.users.find((x) => x.id === "u_reviewer")!, label: t.auth.demoReviewer, icon: "protocol" },
        { u: db.users.find((x) => x.id === "u_tegra")!, label: `${t.auth.demoSupplier} · Tegra`, icon: "supplier" },
        { u: db.users.find((x) => x.id === "u_texpasa")!, label: `${t.auth.demoSupplier} · Texpasa`, icon: "supplier" },
      ]
    : [];
  const heroCopy =
    locale === "es"
      ? { h: "Cada tela. Cada decoración.", h2: "Probada antes de producción.", p: "Protocolos AATCC · ISO · ASTM, escalera térmica de migración, evidencias de laboratorio y dossiers de aptitud para todos los proveedores de Fanatics." }
      : { h: "Every fabric. Every decoration.", h2: "Proven before production.", p: "AATCC · ISO · ASTM protocols, dye-migration heat ladders, lab evidence and decoration-readiness dossiers for every Fanatics supplier." };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="fx-stripes relative hidden overflow-hidden bg-fx-black p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-fx-red/30 blur-[120px]" />
        <div className="absolute -bottom-52 -left-24 h-[420px] w-[420px] rounded-full bg-fx-red/10 blur-[100px]" />
        <div className="relative flex items-center justify-between">
          <Brand />
          <LocaleSwitch dark />
        </div>
        <div className="relative max-w-xl">
          <div className="kicker mb-4">{t.app.tagline}</div>
          <h1 className="font-display text-5xl font-black italic leading-[1.02] tracking-tight xl:text-6xl">
            {heroCopy.h}
            <br />
            <span className="text-fx-red">{heroCopy.h2}</span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-white/65">{heroCopy.p}</p>
          <div className="mt-10 flex flex-wrap gap-2">
            {DECORATIONS.slice(0, 10).map((d) => (
              <span key={d.code} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
                {d.name[locale]}
              </span>
            ))}
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-6 border-t border-white/10 pt-6 text-sm">
          {[
            ["23", locale === "es" ? "métodos de ensayo" : "test methods"],
            ["16", locale === "es" ? "procesos de decoración" : "decoration processes"],
            ["8", locale === "es" ? "familias de fibra" : "fiber families"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-black italic">{n}</div>
              <div className="text-white/50">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-center bg-white px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <div className="rounded-xl bg-fx-black p-3">
              <Brand />
            </div>
            <LocaleSwitch />
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">{t.auth.title}</h2>
          <p className="mb-6 mt-1 text-sm text-gray-500">{t.auth.subtitle}</p>

          {switchable && (
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-fx-mist p-1 text-sm font-semibold">
                <form action={exitDemoAction}>
                  <button className={`w-full rounded-lg px-3 py-2.5 transition ${!demo ? "bg-white text-fx-ink shadow" : "text-gray-500 hover:text-fx-ink"}`}>
                    🔒 {t.auth.modeReal}
                  </button>
                </form>
                <form action={enterDemoAction}>
                  <button className={`w-full rounded-lg px-3 py-2.5 transition ${demo ? "bg-fx-ink text-white shadow" : "text-gray-500 hover:text-fx-ink"}`}>
                    ✨ {t.auth.modeDemo}
                  </button>
                </form>
              </div>
              {demo && <p className="mt-2 text-xs text-gray-500">{t.auth.modeDemoHint}</p>}
            </div>
          )}

          {demo ? (
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-bold">{t.auth.demoTitle}</h3>
                <span className="text-xs text-gray-400">{t.auth.demoSubtitle}</span>
              </div>
              <div className="space-y-2.5">
                {demoUsers.map(({ u, label, icon }) => (
                  <form key={u.id} action={demoSignInAction}>
                    <input type="hidden" name="uid" value={u.id} />
                    <button className="group flex w-full items-center gap-3 rounded-xl border border-fx-line p-3 text-left transition hover:border-fx-red hover:shadow-glow">
                      <Avatar name={u.fullName} src={u.supplierId ? db!.suppliers.find((s) => s.id === u.supplierId)?.logoUrl : null} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{label}</div>
                        <div className="truncate text-xs text-gray-500">
                          {u.fullName} · {u.email}
                        </div>
                      </div>
                      <Icon name={icon} className="h-4 w-4 text-gray-300 group-hover:text-fx-red" />
                    </button>
                  </form>
                ))}
              </div>
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">{t.app.demo}</p>
            </div>
          ) : (
            <LoginForm />
          )}

          <p className="mt-10 flex items-center gap-2 text-xs text-gray-400">
            <Icon name="lock" className="h-3.5 w-3.5" />
            {t.auth.secureNote}
          </p>
        </div>
      </section>
    </main>
  );
}
