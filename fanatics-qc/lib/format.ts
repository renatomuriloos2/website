import type { Locale } from "@/lib/domain/types";

export function fmtDate(iso: string | null | undefined, locale: Locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "es" ? "es-ES" : "en-US", { year: "numeric", month: "short", day: "2-digit" });
}

export function fmtDateTime(iso: string | null | undefined, locale: Locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale === "es" ? "es-ES" : "en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function ago(iso: string, t: { minutesAgo: string; hoursAgo: string; daysAgo: string; justNow: string }) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${mins} ${t.minutesAgo}`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} ${t.hoursAgo}`;
  return `${Math.round(h / 24)} ${t.daysAgo}`;
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
