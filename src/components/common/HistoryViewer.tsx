import React, { useState } from "react";
import { Clock, Download, RefreshCw } from "lucide-react";
import { TelemetryEvent } from "../../types/telemetry.js";
import { formatTimestamp } from "../../utils/formatters.js";

interface HistoryViewerProps {
  events: TelemetryEvent[];
  loading: boolean;
  onFetchHistory: (limit: number) => void;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  events,
  loading,
  onFetchHistory,
}) => {
  const [selectedLimit, setSelectedLimit] = useState<number>(50);

  const handleLimitChange = (limit: number) => {
    setSelectedLimit(limit);
    onFetchHistory(limit);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telemetry-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="history-viewer"
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-100">Historical Telemetry Log</h3>
          <span className="text-[11px] font-mono text-slate-500">
            ({events.length} records fetched from backend)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Limit:</span>
          {[25, 50, 100, 200].map((lim) => (
            <button
              key={lim}
              onClick={() => handleLimitChange(lim)}
              className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
                selectedLimit === lim
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              {lim}
            </button>
          ))}

          <button
            onClick={() => onFetchHistory(selectedLimit)}
            disabled={loading}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Refresh historical logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          {events.length > 0 && (
            <button
              onClick={exportJson}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Export as JSON"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          Loading historical events from REST API...
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 font-mono">
          No historical events in backend buffer yet.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-2 px-2 font-medium">Seq</th>
                <th className="py-2 px-2 font-medium">Timestamp</th>
                <th className="py-2 px-2 font-medium">CPU</th>
                <th className="py-2 px-2 font-medium">Memory</th>
                <th className="py-2 px-2 font-medium">Temp</th>
                <th className="py-2 px-2 font-medium">Throughput</th>
                <th className="py-2 px-2 font-medium">Req/s</th>
                <th className="py-2 px-2 font-medium">Latency</th>
                <th className="py-2 px-2 font-medium">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {events.slice().reverse().map((ev) => (
                <tr key={ev.sequence} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-1.5 px-2 text-cyan-400 font-semibold">#{ev.sequence}</td>
                  <td className="py-1.5 px-2 text-slate-400">{formatTimestamp(ev.timestamp)}</td>
                  <td className="py-1.5 px-2 text-slate-200">{ev.cpu.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-slate-200">{ev.memory.toFixed(1)}%</td>
                  <td className="py-1.5 px-2 text-slate-200">{ev.temperature.toFixed(1)}°C</td>
                  <td className="py-1.5 px-2 text-slate-200">{ev.network_mbps.toFixed(1)} Mb</td>
                  <td className="py-1.5 px-2 text-slate-200">{Math.round(ev.requests_per_second)}</td>
                  <td className="py-1.5 px-2 text-amber-300">{ev.latency_ms.toFixed(1)} ms</td>
                  <td className="py-1.5 px-2 text-rose-300">{ev.error_rate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
