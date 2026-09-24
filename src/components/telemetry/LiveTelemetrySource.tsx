import React from "react";
import { Activity, Radio, Server, ShieldCheck, WifiOff } from "lucide-react";
import type { Host } from "../../types/app.js";
import type { TelemetryEvent } from "../../types/telemetry.js";
import type { ConnectionStatus } from "../../types/websocket.js";
import { getTelemetryFreshness } from "../../utils/hostHealth.js";

interface LiveTelemetrySourceProps {
  host: Host | null;
  current: TelemetryEvent | null;
  connectionStatus: ConnectionStatus;
  lastReceivedAt: number | null;
  onHostChange: (hostId: string) => void;
  hosts: Host[];
}

function sourceLabel(event: TelemetryEvent | null): { label: string; tone: string } {
  if (event?.source === "agent") {
    return { label: "REAL AGENT DATA", tone: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10" };
  }
  if (event?.source === "synthetic") {
    return { label: "SIMULATED DATA", tone: "text-amber-300 border-amber-500/20 bg-amber-500/10" };
  }
  if (event?.source === "api") {
    return { label: "API INGESTED", tone: "text-cyan-300 border-cyan-500/20 bg-cyan-500/10" };
  }
  return { label: "WAITING FOR DATA", tone: "text-slate-400 border-white/8 bg-white/[0.02]" };
}

export const LiveTelemetrySource: React.FC<LiveTelemetrySourceProps> = ({
  host,
  current,
  connectionStatus,
  lastReceivedAt,
  onHostChange,
  hosts,
}) => {
  const freshness = host
    ? getTelemetryFreshness(host.last_seen_at, host.is_active)
    : { status: "silent" as const, label: "No host selected", ageSeconds: null };
  const source = sourceLabel(current);

  const socketTone =
    connectionStatus === "LIVE"
      ? "text-emerald-300"
      : connectionStatus === "CONNECTING" || connectionStatus === "RECONNECTING"
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <section
      aria-label="Live telemetry source"
      className="rounded-2xl border border-white/8 bg-slate-900/50 p-5 shadow-xl shadow-black/10"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/5">
            {freshness.status === "online" ? (
              <Radio className="h-4 w-4 text-emerald-300" />
            ) : (
              <Server className="h-4 w-4 text-cyan-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Live source
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-white">
                {host?.name ?? "Waiting for a monitored host"}
              </h2>
              {host && (
                <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  {host.environment}
                </span>
              )}
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${source.tone}`}>
                {source.label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{freshness.label}{freshness.ageSeconds !== null ? ` · agent sample ${freshness.ageSeconds}s ago` : ""}</span>
              {host?.agent_version && <span>Agent {host.agent_version}</span>}
              {lastReceivedAt !== null && <span>UI received ${Math.max(0, Math.round((Date.now() - lastReceivedAt) / 1000))}s ago</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="telemetry-host-select">Telemetry host</label>
          <select
            id="telemetry-host-select"
            value={host?.id ?? ""}
            onChange={(event) => onHostChange(event.target.value)}
            className="min-w-0 rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/30"
          >
            <option value="" disabled>Select host</option>
            {hosts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.environment}{item.agent_version ? " · agent" : ""}
              </option>
            ))}
          </select>
          <div className={`inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-xs ${socketTone}`}>
            {connectionStatus === "LIVE" ? <ShieldCheck className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            WebSocket {connectionStatus}
          </div>
        </div>
      </div>

      {!host && (
        <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-200">
          No monitored host is selected. The dashboard will not label unscoped simulator data as live telemetry.
        </div>
      )}

      {host && !current && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
          <Activity className="h-3.5 w-3.5" />
          Waiting for telemetry from this host. Start the host agent to populate the live stream.
        </div>
      )}
    </section>
  );
};

export default LiveTelemetrySource;
