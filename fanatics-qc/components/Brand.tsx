// Fanatics brand lock-up. The mark is loaded from /public/brand so Fanatics can
// replace it with the official artwork without touching code.
export function FanaticsMark({ className = "h-8 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/fanatics-mark.svg" alt="Fanatics" className={className} />;
}

export function Brand({ compact = false, light = true }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <FanaticsMark className="h-8 w-auto shrink-0" />
      {!compact && (
        <div className="leading-none">
          <div className={`font-brand text-[21px] font-bold tracking-[-0.02em] ${light ? "text-white" : "text-fx-ink"}`}>Fanatics</div>
          <div className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.26em] text-fx-red">Decoration QC Lab</div>
        </div>
      )}
    </div>
  );
}
