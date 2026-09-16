import { cn } from "@/lib/utils";
import { Priority } from "@/types/database";
import { NextVisitStatus } from "@/lib/utils";

const PRIORITY_STYLES: Record<Priority, string> = {
  normal: "bg-rethink-green/20 text-rethink-green",
  atencion: "bg-rethink-amber/20 text-rethink-amber",
  urgente: "bg-red-500/20 text-red-400",
};

const PRIORITY_TEXT: Record<Priority, string> = {
  normal: "Normal",
  atencion: "Atención",
  urgente: "Urgente",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("badge", PRIORITY_STYLES[priority])}>
      {PRIORITY_TEXT[priority]}
    </span>
  );
}

const STATUS_STYLES: Record<NextVisitStatus, string> = {
  vencido: "bg-red-500/20 text-red-400",
  proximo: "bg-rethink-amber/20 text-rethink-amber",
  programado: "bg-rethink-green/20 text-rethink-green",
};

const STATUS_TEXT: Record<NextVisitStatus, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  programado: "Programado",
};

export function StatusBadge({ status }: { status: NextVisitStatus }) {
  return <span className={cn("badge", STATUS_STYLES[status])}>{STATUS_TEXT[status]}</span>;
}

export function RangeBadge({ outOfRange }: { outOfRange: boolean }) {
  return (
    <span
      className={cn(
        "badge",
        outOfRange ? "bg-red-500/20 text-red-400" : "bg-rethink-green/20 text-rethink-green"
      )}
    >
      {outOfRange ? "Fuera de rango" : "En rango"}
    </span>
  );
}
