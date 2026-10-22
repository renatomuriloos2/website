import { CAPA_STATUS, isOverdue } from "@/lib/domain/capa";
import type { Capa, Locale } from "@/lib/domain/types";
import { Badge } from "./ui";

export function CapaBadge({ capa, locale }: { capa: Capa; locale: Locale }) {
  const s = CAPA_STATUS[capa.status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={s.tone}>{s[locale]}</Badge>
      {isOverdue(capa) && <Badge tone="bad" dot={false}>{locale === "es" ? "Vencida" : "Overdue"}</Badge>}
    </span>
  );
}
