import { cn } from "@/lib/utils";

/**
 * Placeholder del isotipo de Rethink (círculos de color + wordmark).
 * Reemplazar por el archivo oficial de marca cuando esté disponible
 * (ver README, sección "Marca").
 */
export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="#F08421" />
        <circle cx="21" cy="11" r="7" fill="#FFB000" opacity="0.9" />
        <circle cx="16" cy="20" r="7" fill="#82B534" opacity="0.9" />
      </svg>
      <span className="font-semibold text-lg tracking-wide text-rethink-cream">
        Rethink
      </span>
    </div>
  );
}
