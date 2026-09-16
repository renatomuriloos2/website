export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  return date.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export type NextVisitStatus = "vencido" | "proximo" | "programado";

export function nextVisitStatus(dateStr: string | null): NextVisitStatus | null {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return "vencido";
  if (days <= 14) return "proximo";
  return "programado";
}

export function isOutOfRange(value: number, min: number | null, max: number | null): boolean {
  if (min !== null && value < min) return true;
  if (max !== null && value > max) return true;
  return false;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (val: string | number | null) => {
    const str = val === null || val === undefined ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
