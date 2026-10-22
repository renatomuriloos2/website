"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      {label}
    </button>
  );
}
