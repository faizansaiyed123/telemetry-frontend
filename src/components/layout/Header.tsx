import React from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import { ConnectionStatus } from "../../types/websocket.js";
import { SimulationStatus, HealthResponse } from "../../types/simulation.js";
import { formatUptime } from "../../utils/formatters.js";
import { API_BASE_URL } from "../../services/api.js";

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  simulationStatus: SimulationStatus | null;
  health: HealthResponse | null;
  activeAlertCount: number;
  lastReceivedAt: number | null;
  onReconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  simulationStatus,
  health,
  activeAlertCount,
  lastReceivedAt,
  onReconnect,
}) => {
  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </span>
        );
      case "CONNECTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            CONNECTING
          </span>
        );
      case "RECONNECTING":
        return (
          <span
            onClick={onReconnect}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            title="Click to attempt reconnect now"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            RECONNECTING
          </span>
        );
      case "ERROR":
      case "DISCONNECTED":
      default:
        return (
          <span
            onClick={onReconnect}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            title="Click to reconnect"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            DISCONNECTED
          </span>
        );
    }
  };

  const getStaleSeconds = () => {
    if (!lastReceivedAt) return null;
    const diff = Math.max(0, (Date.now() - lastReceivedAt) / 1000);
    return diff.toFixed(1);
  };

  const staleSec = getStaleSeconds();

  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand and primary status */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-md shadow-cyan-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Telemetry Dashboard
              </h1>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-time infrastructure streaming & deterministic anomaly detection
            </p>
          </div>
        </div>

        {/* Live system pills */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Rate indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Rate:</span>
            <span className="font-semibold text-slate-200">
              {simulationStatus?.rate ?? (health?.stream_active ? 10 : 0)} events/s
            </span>
          </div>

          {/* Engine State */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Zap
              className={`w-3.5 h-3.5 ${
                simulationStatus?.running ? "text-emerald-400" : "text-amber-400"
              }`}
            />
            <span className="text-slate-400">Engine:</span>
            <span
              className={`font-semibold ${
                simulationStatus?.running ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {simulationStatus?.running ? "RUNNING" : "PAUSED"}
            </span>
          </div>

          {/* Active alerts count */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
              activeAlertCount > 0
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-slate-800/80 border-slate-700/60 text-slate-400"
            }`}
          >
            {activeAlertCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Alerts:</span>
            <span className="font-semibold text-slate-200">{activeAlertCount}</span>
          </div>

          {/* Uptime */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Uptime:</span>
            <span className="font-mono text-slate-200">
              {formatUptime(simulationStatus?.uptime_seconds ?? health?.uptime_seconds ?? 0)}
            </span>
          </div>

          {/* Sequence info */}
          {simulationStatus?.sequence !== undefined && (
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-400">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Seq:</span>
              <span className="font-mono text-slate-200">#{simulationStatus.sequence}</span>
            </div>
          )}

          {/* Swagger / Docs link */}
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors"
            title="Open OpenAPI & Swagger Documentation"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Swagger</span> Docs
          </a>
        </div>
      </div>

      {/* Reconnection or Stale data warning banner if disconnected */}
      {connectionStatus !== "LIVE" && (
        <div className="max-w-7xl mx-auto mt-2 py-1 px-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center justify-between">
          <span>
            Connection status: <strong>{connectionStatus}</strong>.
            {staleSec ? ` (Last telemetry packet received ${staleSec}s ago)` : " Connecting to WebSocket stream..."}
          </span>
          <button
            onClick={onReconnect}
            className="underline font-medium hover:text-amber-100 transition-colors ml-4 cursor-pointer"
          >
            Retry Now
          </button>
        </div>
      )}
    </header>
  );
};
