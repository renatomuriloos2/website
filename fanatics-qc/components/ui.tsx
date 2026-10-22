import Link from "next/link";
import type { Tone } from "@/lib/domain/catalog";
import { Icon } from "./icons";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const TONES: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warn: "bg-orange-50 text-orange-700 ring-orange-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  bad: "bg-red-50 text-red-700 ring-red-600/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
  neutral: "bg-gray-100 text-gray-700 ring-gray-500/15",
};
const DOTS: Record<Tone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-orange-500",
  amber: "bg-amber-500",
  bad: "bg-red-500",
  info: "bg-blue-500",
  violet: "bg-violet-500",
  neutral: "bg-gray-400",
};
export const TONE_HEX: Record<Tone, string> = {
  ok: "#0E9F6E",
  warn: "#EA580C",
  amber: "#E8A317",
  bad: "#DC2626",
  info: "#2563EB",
  violet: "#7C3AED",
  neutral: "#9CA3AF",
};

export function Badge({ tone = "neutral", children, dot = true, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <div className="kicker mb-1">{kicker}</div>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-fx-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className, bodyClass }: { title?: React.ReactNode; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cx("card", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-fx-line px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-bold text-fx-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cx("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone, icon, trend }: { label: string; value: React.ReactNode; hint?: string; tone?: Tone; icon?: string; trend?: string }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        {icon && (
          <div className="rounded-lg p-1.5" style={{ background: `${TONE_HEX[tone ?? "neutral"]}14`, color: TONE_HEX[tone ?? "neutral"] }}>
            <Icon name={icon} className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold tracking-tight text-fx-ink">{value}</div>
      {(hint || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
          {hint}
        </div>
      )}
      {tone && <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: TONE_HEX[tone] }} />}
    </div>
  );
}

export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center">
      <div className="rounded-full bg-fx-mist p-3 text-gray-400">
        <Icon name="lots" />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
      {action}
    </div>
  );
}

export function Progress({ value, tone = "ok" }: { value: number; tone?: Tone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: TONE_HEX[tone] }} />
    </div>
  );
}

export function gradeTone(g: number | null | undefined, min?: number | null): Tone {
  if (g === null || g === undefined) return "neutral";
  if (min !== undefined && min !== null) return g >= min ? "ok" : g >= min - 0.5 ? "amber" : "bad";
  return g >= 4 ? "ok" : g >= 3 ? "amber" : "bad";
}

export function GradeChip({ value, min, unit }: { value: number | null | undefined; min?: number | null; unit?: string }) {
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>;
  const tone = gradeTone(value, min);
  return (
    <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums" style={{ background: `${TONE_HEX[tone]}18`, color: TONE_HEX[tone] }}>
      {value}
      {unit ? <span className="ml-0.5 font-medium opacity-70">{unit}</span> : null}
    </span>
  );
}

export function Avatar({ src, name, size = 36, rounded = "rounded-xl" }: { src?: string | null; name: string; size?: number; rounded?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cx("shrink-0 bg-white object-contain", rounded)} style={{ width: size, height: size }} />;
  }
  return (
    <div className={cx("flex shrink-0 items-center justify-center bg-fx-ink text-xs font-bold text-white", rounded)} style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export function LinkButton({ href, children, variant = "primary", icon }: { href: string; children: React.ReactNode; variant?: "primary" | "dark" | "ghost"; icon?: string }) {
  return (
    <Link href={href} className={variant === "primary" ? "btn-primary" : variant === "dark" ? "btn-dark" : "btn-ghost"}>
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </Link>
  );
}

export function Swatch({ hex, src, className }: { hex: string; src?: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cx("object-cover", className)} />;
  }
  return <div className={className} style={{ background: hex }} />;
}

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return <div className={cx("rounded-xl px-4 py-3 text-sm ring-1 ring-inset", TONES[tone])}>{children}</div>;
}
