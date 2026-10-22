import "server-only";
import { cookies } from "next/headers";
import { DICTS } from "./dict";
import type { Locale } from "@/lib/domain/types";

export const LOCALE_COOKIE = "fx_locale";

export function getLocale(): Locale {
  const v = cookies().get(LOCALE_COOKIE)?.value;
  return v === "es" ? "es" : "en";
}

export function getI18n() {
  const locale = getLocale();
  return { locale, t: DICTS[locale] };
}
