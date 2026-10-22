"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/session";
import { useI18n } from "@/lib/i18n/client";

export function LocaleSwitch({ dark = false }: { dark?: boolean }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex rounded-lg p-0.5 text-xs font-bold ${dark ? "bg-white/10" : "bg-fx-mist"}`} aria-busy={pending}>
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => start(async () => { await setLocaleAction(l); router.refresh(); })}
          className={`rounded-md px-2.5 py-1 uppercase transition ${locale === l ? (dark ? "bg-white text-fx-ink" : "bg-white text-fx-ink shadow") : dark ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-fx-ink"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
