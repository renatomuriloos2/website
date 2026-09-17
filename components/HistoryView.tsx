"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PriorityBadge } from "@/components/Badge";
import { Priority } from "@/types/database";
import { downloadCsv, formatDate, toCsv } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export interface ParamOption {
  param_key: string;
  label: string;
  unit: string | null;
  min_value: number | null;
  max_value: number | null;
}

export interface VisitRow {
  id: string;
  visit_date: string;
  technician: string | null;
  priority: Priority;
  recommendation: string | null;
}

export interface HistoryViewProps {
  params: ParamOption[];
  seriesByParam: Record<string, { date: string; value: number }[]>;
  visits: VisitRow[];
  systemLabel: string;
}

export function HistoryView({ params, seriesByParam, visits, systemLabel }: HistoryViewProps) {
  const { theme } = useTheme();
  const axisColor = theme === "dark" ? "rgba(255,252,224,0.4)" : "rgba(23,16,11,0.45)";
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const tooltipBg = theme === "dark" ? "#17100B" : "#FFFCE0";
  const tooltipBorder = theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = theme === "dark" ? "#FFFCE0" : "#17100B";

  const [selectedParam, setSelectedParam] = useState(params[0]?.param_key ?? "");
  const current = params.find((p) => p.param_key === selectedParam);
  const series = useMemo(() => seriesByParam[selectedParam] ?? [], [seriesByParam, selectedParam]);

  const yDomain = useMemo((): [number, number] | undefined => {
    if (!current) return undefined;
    const values = series.map((s) => s.value);
    const min = Math.min(...(values.length ? values : [0]), current.min_value ?? Infinity);
    const max = Math.max(...(values.length ? values : [0]), current.max_value ?? -Infinity);
    if (!isFinite(min) || !isFinite(max)) return undefined;
    const pad = (max - min) * 0.15 || 1;
    return [min - pad, max + pad];
  }, [series, current]);

  function handleExport() {
    const csv = toCsv(
      ["Fecha", "Técnico", "Prioridad", "Recomendación"],
      visits.map((v) => [formatDate(v.visit_date), v.technician, v.priority, v.recommendation])
    );
    downloadCsv(`historial-${systemLabel.toLowerCase()}.csv`, csv);
  }

  return (
    <div>
      {params.length > 0 && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="label" htmlFor="param">
              Parámetro
            </label>
            <select
              id="param"
              className="input"
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value)}
            >
              {params.map((p) => (
                <option key={p.param_key} value={p.param_key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleExport} className="btn-secondary">
            Exportar CSV
          </button>
        </div>
      )}

      {current && (
        <div className="card mb-6">
          <h3 className="mb-4 text-sm font-medium text-rethink-cream">
            Tendencia · {current.label}
            {current.unit ? ` (${current.unit})` : ""}
          </h3>
          {series.length === 0 ? (
            <p className="text-sm text-rethink-cream/50">Sin lecturas registradas todavía.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDate(v)}
                  stroke={axisColor}
                  fontSize={12}
                />
                <YAxis domain={yDomain} stroke={axisColor} fontSize={12} />
                <Tooltip
                  labelFormatter={(v) => formatDate(v as string)}
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` }}
                  labelStyle={{ color: tooltipText }}
                  itemStyle={{ color: tooltipText }}
                />
                {current.min_value !== null && current.max_value !== null && (
                  <ReferenceArea
                    y1={current.min_value}
                    y2={current.max_value}
                    fill="#82B534"
                    fillOpacity={0.15}
                    stroke="none"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#F08421"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#F08421" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <h3 className="mb-4 text-sm font-medium text-rethink-cream">Visitas</h3>
        {visits.length === 0 ? (
          <p className="text-sm text-rethink-cream/50">Sin visitas registradas todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-rethink-cream/50">
                <th className="py-2 pr-4 font-normal">Fecha</th>
                <th className="py-2 pr-4 font-normal">Técnico</th>
                <th className="py-2 pr-4 font-normal">Prioridad</th>
                <th className="py-2 font-normal">Recomendación</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-rethink-cream/80">{formatDate(v.visit_date)}</td>
                  <td className="py-2 pr-4 text-rethink-cream/80">{v.technician ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <PriorityBadge priority={v.priority} />
                  </td>
                  <td className="py-2 text-rethink-cream/80">{v.recommendation ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
