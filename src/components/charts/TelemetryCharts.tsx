import React, { useEffect, useRef, useState } from "react";
import { TelemetryEvent } from "../../types/telemetry.js";
import { Cpu, Globe, Gauge, Maximize2 } from "lucide-react";

interface TelemetryChartsProps {
  streamBuffer: TelemetryEvent[];
  activeAnomalyMetric: string | null;
}

interface ChartDataset {
  label: string;
  key: keyof TelemetryEvent;
  color: string;
  unit: string;
  maxExpected: number;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  streamBuffer,
  activeAnomalyMetric,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "compute" | "traffic" | "latency">("all");

  const computeDatasets: ChartDataset[] = [
    { label: "CPU Usage", key: "cpu", color: "#38bdf8", unit: "%", maxExpected: 100 },
    { label: "Memory", key: "memory", color: "#818cf8", unit: "%", maxExpected: 100 },
    { label: "Temperature", key: "temperature", color: "#fb923c", unit: "°C", maxExpected: 110 },
  ];

  const trafficDatasets: ChartDataset[] = [
    { label: "Throughput", key: "network_mbps", color: "#34d399", unit: "Mbps", maxExpected: 400 },
    { label: "Req / Sec", key: "requests_per_second", color: "#22d3ee", unit: "req/s", maxExpected: 1500 },
  ];

  const latencyDatasets: ChartDataset[] = [
    { label: "Latency", key: "latency_ms", color: "#f59e0b", unit: "ms", maxExpected: 120 },
    { label: "Error Rate", key: "error_rate", color: "#f43f5e", unit: "%", maxExpected: 15 },
  ];

  return (
    <div className="space-y-4">
      {/* Chart Section Header with Tab Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            Real-Time Streaming Telemetry
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            ({streamBuffer.length} pts window)
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            id="tab-all-charts"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Views
          </button>
          <button
            id="tab-compute"
            onClick={() => setActiveTab("compute")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "compute"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Compute
          </button>
          <button
            id="tab-traffic"
            onClick={() => setActiveTab("traffic")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "traffic"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Traffic
          </button>
          <button
            id="tab-latency"
            onClick={() => setActiveTab("latency")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "latency"
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Latency & Errors
          </button>
        </div>
      </div>

      {/* Grid of charts */}
      <div
        className={`grid gap-4 ${
          activeTab === "all" ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {(activeTab === "all" || activeTab === "compute") && (
          <MultiStreamCanvasCard
            id="chart-compute"
            title="Compute & Thermal State"
            subtitle="CPU, Memory & Core Temp"
            icon={<Cpu className="w-4 h-4 text-cyan-400" />}
            datasets={computeDatasets}
            data={streamBuffer}
            height={activeTab === "all" ? 220 : 340}
            activeAnomalyMetric={activeAnomalyMetric}
          />
        )}

        {(activeTab === "all" || activeTab === "traffic") && (
          <MultiStreamCanvasCard
            id="chart-traffic"
            title="Traffic & Throughput"
            subtitle="Network bandwidth & req/sec"
            icon={<Globe className="w-4 h-4 text-emerald-400" />}
            datasets={trafficDatasets}
            data={streamBuffer}
            height={activeTab === "all" ? 220 : 340}
            activeAnomalyMetric={activeAnomalyMetric}
          />
        )}

        {(activeTab === "all" || activeTab === "latency") && (
          <MultiStreamCanvasCard
            id="chart-latency"
            title="Response Time & Error Rate"
            subtitle="End-to-end latency & error spikes"
            icon={<Gauge className="w-4 h-4 text-amber-400" />}
            datasets={latencyDatasets}
            data={streamBuffer}
            height={activeTab === "all" ? 220 : 340}
            activeAnomalyMetric={activeAnomalyMetric}
          />
        )}
      </div>
    </div>
  );
};

interface MultiStreamCanvasCardProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  datasets: ChartDataset[];
  data: TelemetryEvent[];
  height: number;
  activeAnomalyMetric: string | null;
}

const MultiStreamCanvasCard: React.FC<MultiStreamCanvasCardProps> = ({
  id,
  title,
  subtitle,
  icon,
  datasets,
  data,
  height,
  activeAnomalyMetric,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const latestEvent = data.length > 0 ? data[data.length - 1] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
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

    // Draw horizontal grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 1; i <= gridLines; i++) {
      const y = (h / (gridLines + 1)) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Determine scale for each dataset and draw
    datasets.forEach((ds) => {
      if (data.length < 2) return;

      const values = data.map((d) => Number(d[ds.key]) || 0);
      const maxInSample = Math.max(...values);
      const scaleMax = Math.max(ds.maxExpected, maxInSample * 1.15, 1);

      ctx.beginPath();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = ds.key === activeAnomalyMetric ? 3 : 2;
      ctx.lineJoin = "round";

      const step = w / Math.max(1, data.length - 1);
      values.forEach((v, idx) => {
        const x = idx * step;
        const normalized = Math.max(0, Math.min(1, v / scaleMax));
        const y = h - normalized * (h - 24) - 12;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Subtle shaded area for primary line
      if (ds === datasets[0]) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `${ds.color}25`);
        grad.addColorStop(1, `${ds.color}00`);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    });
  }, [data, datasets, height, activeAnomalyMetric]);

  return (
    <div
      id={id}
      ref={containerRef}
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Legend & Current Readings */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 my-2">
          {datasets.map((ds) => {
            const val = latestEvent ? latestEvent[ds.key] : null;
            const isAnomaly = ds.key === activeAnomalyMetric;

            return (
              <div
                key={String(ds.key)}
                className={`flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded border transition-colors ${
                  isAnomaly
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                    : "bg-slate-950/50 border-slate-800/80 text-slate-300"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ds.color }}
                />
                <span className="text-slate-400 text-[11px]">{ds.label}:</span>
                <span className="font-bold text-white">
                  {val !== null && val !== undefined ? Number(val).toFixed(1) : "--"}
                </span>
                <span className="text-slate-500 text-[10px]">{ds.unit}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full relative mt-2 rounded-lg overflow-hidden bg-slate-950/70 border border-slate-800/50">
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px` }}
          className="w-full block"
        />
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
            Waiting for telemetry stream...
          </div>
        )}
      </div>
    </div>
  );
};
