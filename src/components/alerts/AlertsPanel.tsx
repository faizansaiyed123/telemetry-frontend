import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Info, ShieldAlert, Sparkles } from "lucide-react";
import { Alert, AlertSeverity } from "../../types/alerts.js";
import { formatTimestamp } from "../../utils/formatters.js";

interface AlertsPanelProps {
  alerts: Alert[];
  activeCount: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  activeCount,
  loading,
  error,
  onRefresh,
}) => {
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(false);

  const displayedAlerts = filterActiveOnly ? alerts.filter((a) => !a.resolved) : alerts;

  const getSeverityBadge = (severity: AlertSeverity, resolved: boolean) => {
    if (resolved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" />
          RESOLVED
        </span>
      );
    }
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div
      id="alerts-panel"
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg h-full"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                activeCount > 0 ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Anomaly Alerts Center
                {activeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-xs font-mono font-bold bg-rose-500 text-white">
                    {activeCount}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                Rolling z-score statistical anomaly monitoring
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterActiveOnly(!filterActiveOnly)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                filterActiveOnly
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              {filterActiveOnly ? "Showing Active" : "Showing All"}
            </button>
            <button
              onClick={onRefresh}
              title="Refresh alerts from backend"
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer"
            >
              <span className="sr-only">Refresh</span>
              ↻
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={onRefresh} className="underline hover:text-rose-100">
              Retry
            </button>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {displayedAlerts.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-300">No anomalies detected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                All telemetry metrics are currently within nominal statistical control limits (z &lt; 3.0).
              </p>
            </div>
          ) : (
            displayedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border text-xs transition-all ${
                  alert.resolved
                    ? "bg-slate-950/30 border-slate-800/80 text-slate-400 opacity-70"
                    : alert.severity === "CRITICAL"
                    ? "bg-rose-950/20 border-rose-500/40 text-rose-200 shadow-sm shadow-rose-950/20"
                    : alert.severity === "WARNING"
                    ? "bg-amber-950/20 border-amber-500/40 text-amber-200 shadow-sm shadow-amber-950/20"
                    : "bg-blue-950/20 border-blue-500/40 text-blue-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(alert.severity, alert.resolved)}
                    <span className="font-mono font-bold uppercase text-white">
                      {alert.metric}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </div>

                <p className="font-medium text-slate-200 mb-2">{alert.message}</p>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 font-mono text-[11px] text-slate-400">
                  <div className="flex gap-3">
                    <span>
                      Observed: <strong className="text-white">{alert.value.toFixed(1)}</strong>
                    </span>
                    <span>
                      Baseline: <strong className="text-slate-300">{alert.baseline.toFixed(1)}</strong>
                    </span>
                  </div>
                  {alert.resolved && alert.resolved_at && (
                    <span className="text-emerald-400">
                      Resolved: {formatTimestamp(alert.resolved_at)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
        <span>Authoritative backend anomaly detection</span>
        <span>Total historical alerts: {alerts.length}</span>
      </div>
    </div>
  );
};
