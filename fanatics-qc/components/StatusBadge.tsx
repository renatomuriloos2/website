import { STATUS_MAP, VERDICTS } from "@/lib/domain/catalog";
import type { Locale, LotStatus, Verdict } from "@/lib/domain/types";
import { Badge } from "./ui";

export function StatusBadge({ status, locale }: { status: LotStatus; locale: Locale }) {
  const s = STATUS_MAP[status];
  return <Badge tone={s.tone}>{s.label[locale]}</Badge>;
}

export function VerdictBadge({ verdict, locale }: { verdict: Verdict; locale: Locale }) {
  const v = VERDICTS[verdict];
  return <Badge tone={v.tone}>{v.label[locale]}</Badge>;
}
