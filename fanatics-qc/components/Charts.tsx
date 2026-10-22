"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 11, fill: "#8A8F98" };
const GRID = "#EEF0F3";

export interface Series {
  key: string;
  label: string;
  color: string;
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-xl border border-fx-line bg-white px-3 py-2 text-xs shadow-card">
      {label && <div className="mb-1 font-semibold text-fx-ink">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-gray-600">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums text-fx-ink">{p.value}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-1 flex justify-between border-t border-fx-line pt-1 font-semibold text-fx-ink">
          <span>Σ</span>
          <span className="tabular-nums">{total}</span>
        </div>
      )}
    </div>
  );
}

export function StackedBars({ data, series, xKey, height = 260 }: { data: Record<string, string | number>[]; series: Series[]; xKey: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(18,19,24,.04)" }} />
        <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#4b5060", paddingTop: 8 }} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} stroke="#fff" strokeWidth={1} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HBars({ data, color = "#E53D2E", height = 260, unit }: { data: { label: string; value: number }[]; color?: string; height?: number; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={{ ...AXIS, fill: "#4b5060" }} tickLine={false} axisLine={false} width={150} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(18,19,24,.04)" }} />
        <Bar dataKey="value" name={unit ?? ""} fill={color} radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: "#4b5060" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 220, center }: { data: { label: string; value: number; color: string }[]; height?: number; center?: { value: string; label: string } }) {
  const shown = data.filter((d) => d.value > 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={shown} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
            {shown.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-3xl font-extrabold">{center.value}</div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">{center.label}</div>
        </div>
      )}
    </div>
  );
}

/** Heat-ladder chart: grade per temperature with the minimum line. */
export function LadderChart({ points, min, maxSafe }: { points: { t: number; g: number | null }[]; min: number; maxSafe: number | null }) {
  return (
    <div className="flex h-44 items-end gap-1.5">
      {points.map((p) => {
        const h = p.g === null ? 0 : (p.g / 5) * 100;
        const color = p.g === null ? "#E5E7EB" : p.g >= min ? "#0E9F6E" : p.g >= min - 1 ? "#E8A317" : "#DC2626";
        return (
          <div key={p.t} className="group relative flex flex-1 flex-col items-center gap-1" title={`${p.t} °C · ${p.g ?? "—"}`}>
            <div className="text-[10px] font-bold tabular-nums text-gray-600">{p.g ?? "—"}</div>
            <div className="relative h-32 w-full rounded-t bg-gray-50">
              <div className="absolute inset-x-0 border-t border-dashed border-fx-ink/40" style={{ bottom: `${(min / 5) * 100}%` }} />
              <div className="absolute inset-x-0 bottom-0 rounded-t transition-all" style={{ height: `${h}%`, background: color }} />
            </div>
            <div className={`text-[10px] tabular-nums ${maxSafe === p.t ? "font-bold text-fx-ink" : "text-gray-400"}`}>{p.t}°</div>
          </div>
        );
      })}
    </div>
  );
}
