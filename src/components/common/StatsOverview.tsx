import React from "react";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { TelemetryStats } from "../../types/telemetry.js";
import { getMetricUnit } from "../../utils/formatters.js";

interface StatsOverviewProps {
  stats: TelemetryStats | null;
  loading: boolean;
  onRefresh: () => void;
}

interface StatRowConfig {
  key: keyof Omit<TelemetryStats, "count">;
  label: string;
}

const metricConfigs: StatRowConfig[] = [
  { key: "cpu", label: "CPU Usage" },
  { key: "memory", label: "Memory" },
  { key: "temperature", label: "Core Temp" },
  { key: "network_mbps", label: "Throughput" },
  { key: "requests_per_second", label: "Requests/sec" },
  { key: "latency_ms", label: "Latency" },
  { key: "error_rate", label: "Error Rate" },
];

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  loading,
  onRefresh,
}) => {
  return (
    <div
      id="stats-overview"
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Statistical Aggregations (Backend Computed)
          </h3>
          {stats && (
            <span className="text-[11px] font-mono text-slate-500">
              (Sample size: {stats.count})
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
        >
          {loading ? "Syncing..." : "Sync Stats"}
        </button>
      </div>

      {!stats ? (
        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          Gathering statistical samples...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2 font-medium">Metric</th>
                <th className="pb-2 font-medium">Min</th>
                <th className="pb-2 font-medium">Max</th>
                <th className="pb-2 font-medium">Average</th>
                <th className="pb-2 font-medium">Latest</th>
                <th className="pb-2 font-medium">Pct Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {metricConfigs.map((cfg) => {
                const metricData = stats[cfg.key];
                const unit = getMetricUnit(cfg.key);
                const pct = metricData?.pct_change;

                return (
                  <tr key={cfg.key} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">{cfg.label}</td>
                    <td className="py-2.5 text-slate-400">
                      {metricData?.min !== null ? `${metricData.min.toFixed(1)}${unit}` : "--"}
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {metricData?.max !== null ? `${metricData.max.toFixed(1)}${unit}` : "--"}
                    </td>
                    <td className="py-2.5 text-cyan-300 font-semibold">
                      {metricData?.avg !== null ? `${metricData.avg.toFixed(1)}${unit}` : "--"}
                    </td>
                    <td className="py-2.5 text-white font-bold">
                      {metricData?.latest !== null ? `${metricData.latest.toFixed(1)}${unit}` : "--"}
                    </td>
                    <td className="py-2.5">
                      {pct !== null && pct !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            pct > 0
                              ? "text-emerald-400"
                              : pct < 0
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        >
                          {pct > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : pct < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-500">0.0%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
