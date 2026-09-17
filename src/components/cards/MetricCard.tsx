import React, { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatMetricNumber, getMetricUnit } from "../../utils/formatters.js";

interface MetricCardProps {
  id: string;
  title: string;
  metricKey: string;
  value: number | null | undefined;
  previousValue: number | null | undefined;
  history: number[];
  icon: React.ReactNode;
  isAnomaly?: boolean;
  min?: number | null;
  max?: number | null;
  avg?: number | null;
  accentColor?: "cyan" | "blue" | "emerald" | "amber" | "rose" | "purple";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  metricKey,
  value,
  previousValue,
  history,
  icon,
  isAnomaly = false,
  min,
  max,
  avg,
  accentColor = "cyan",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate delta from previous value
  const delta =
    value !== null && value !== undefined && previousValue !== null && previousValue !== undefined
      ? value - previousValue
      : 0;

  // Mini sparkline renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const minVal = Math.min(...history);
    const maxVal = Math.max(...history);
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    // Line gradient
    const strokeColor = isAnomaly
      ? "#f43f5e"
      : accentColor === "emerald"
      ? "#10b981"
      : accentColor === "amber"
      ? "#f59e0b"
      : accentColor === "rose"
      ? "#f43f5e"
      : accentColor === "purple"
      ? "#a855f7"
      : accentColor === "blue"
      ? "#3b82f6"
      : "#06b6d4";

    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    const step = w / (history.length - 1);
    history.forEach((val, idx) => {
      const x = idx * step;
      const y = h - ((val - minVal) / range) * (h - 8) - 4;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Subtle area fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${strokeColor}33`);
    grad.addColorStop(1, `${strokeColor}00`);
    ctx.fillStyle = grad;
    ctx.fill();
  }, [history, isAnomaly, accentColor]);

  const colorClasses = isAnomaly
    ? "border-rose-500/50 bg-rose-950/20 shadow-rose-950/30"
    : "border-slate-800 hover:border-slate-700 bg-slate-900/60 shadow-slate-950/40";

  return (
    <div
      id={id}
      className={`relative rounded-xl border p-4 transition-all duration-200 shadow-lg flex flex-col justify-between overflow-hidden group ${colorClasses}`}
    >
      {/* Glow on anomaly */}
      {isAnomaly && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
      )}

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-400 group-hover:text-slate-200 transition-colors">
              {icon}
            </span>
            {title}
          </span>
          {isAnomaly ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
              ANOMALY
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-500">
              {avg !== null && avg !== undefined ? `avg ${avg}` : "Normal"}
            </span>
          )}
        </div>

        {/* Big metric reading */}
        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
            {formatMetricNumber(metricKey, value)}
          </span>
          <span className="text-sm font-medium text-slate-400">
            {getMetricUnit(metricKey)}
          </span>
        </div>

        {/* Delta and Trend indicator */}
        <div className="flex items-center gap-2 text-xs mb-3">
          {Math.abs(delta) > 0.01 ? (
            <span
              className={`flex items-center font-mono font-medium ${
                delta > 0
                  ? metricKey === "error_rate" || metricKey === "latency_ms" || metricKey === "temperature"
                    ? "text-rose-400"
                    : "text-emerald-400"
                  : metricKey === "error_rate" || metricKey === "latency_ms" || metricKey === "temperature"
                  ? "text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {delta > 0 ? (
                <ArrowUp className="w-3 h-3 mr-0.5" />
              ) : (
                <ArrowDown className="w-3 h-3 mr-0.5" />
              )}
              {Math.abs(delta).toFixed(1)}
            </span>
          ) : (
            <span className="flex items-center font-mono text-slate-500">
              <Minus className="w-3 h-3 mr-0.5" /> 0.0
            </span>
          )}

          {min !== null && max !== null && min !== undefined && max !== undefined && (
            <span className="text-slate-500 text-[11px] font-mono">
              range {min} - {max}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline Canvas */}
      <div className="h-10 w-full mt-1">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
