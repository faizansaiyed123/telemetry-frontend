import React, { useMemo, useState } from "react";
import type { TelemetrySeriesPoint } from "../../types/app.js";

type Props = {
  points: TelemetrySeriesPoint[];
  unit: string;
  label: string;
  loading?: boolean;
};

function scale(value: number, min: number, max: number, height: number, pad: number) {
  if (max === min) return height / 2;
  return height - pad - ((value - min) / (max - min)) * (height - pad * 2);
}

export const TimeSeriesChart: React.FC<Props> = ({ points, unit, label, loading = false }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 960;
  const height = 320;
  const pad = 28;
  const values = useMemo(() => points.flatMap((p) => [p.min, p.max, p.p95]), [points]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  if (loading) {
    return <div className="h-[320px] animate-pulse rounded-2xl border border-white/7 bg-white/[0.02]" aria-label="Loading time series" />;
  }
  if (!points.length) {
    return <div className="flex h-[320px] items-center justify-center rounded-2xl border border-white/7 bg-white/[0.02] text-sm text-slate-500">No samples in this window.</div>;
  }

  const p95 = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (width - pad * 2);
    const y = scale(p.p95, min, max, height, pad);
    return [x, y] as const;
  });
  const avg = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (width - pad * 2);
    const y = scale(p.avg, min, max, height, pad);
    return [x, y] as const;
  });
  const path = (series: readonly (readonly [number, number])[]) =>
    series.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1)).join(" ");

  const active = hovered === null ? points.at(-1) : points[hovered];
  return (
    <div className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
          <div className="mt-1 text-xs text-slate-600">Average + p95 across database buckets</div>
        </div>
        {active && (
          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-3 py-2 text-right text-xs">
            <div className="text-slate-600">{new Date(active.timestamp).toLocaleString()}</div>
            <div className="mt-1 font-medium text-cyan-200">avg {active.avg.toFixed(2)} {unit} · p95 {active.p95.toFixed(2)} {unit}</div>
          </div>
        )}
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg viewBox={"0 0 " + width + " " + height} className="min-w-[680px] w-full" role="img" aria-label={label + " time series"}>
          {[0, 0.5, 1].map((fraction) => {
            const y = pad + fraction * (height - pad * 2);
            const value = max - fraction * (max - min);
            return (
              <g key={fraction}>
                <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="currentColor" className="text-white/5" />
                <text x={0} y={y + 4} className="fill-slate-700 text-[11px]">{value.toFixed(1)}</text>
              </g>
            );
          })}
          <path d={path(p95)} fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-300/70" />
          <path d={path(avg)} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-300" />
          {points.map((p, i) => {
            const x = pad + (i / Math.max(1, points.length - 1)) * (width - pad * 2);
            const y = scale(p.avg, min, max, height, pad);
            return (
              <circle
                key={p.timestamp + i}
                cx={x}
                cy={y}
                r={hovered === i ? 5 : 3}
                className="fill-cyan-300 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-slate-600">
        <span>{new Date(points[0].timestamp).toLocaleString()}</span>
        <span>{points.length.toLocaleString()} buckets · {points.reduce((sum, p) => sum + p.samples, 0).toLocaleString()} samples</span>
        <span>{new Date(points.at(-1)!.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default TimeSeriesChart;
