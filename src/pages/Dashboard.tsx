import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Cpu,
  Flame,
  Globe,
  HardDrive,
  Radio,
  Server,
  Zap,
} from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { useTelemetry } from "../hooks/useTelemetry.js";
import { useSimulation } from "../hooks/useSimulation.js";
import { useAlerts } from "../hooks/useAlerts.js";
import { Header } from "../components/layout/Header.js";
import { MetricCard } from "../components/cards/MetricCard.js";
import { TelemetryCharts } from "../components/charts/TelemetryCharts.js";
import { AlertsPanel } from "../components/alerts/AlertsPanel.js";
import { SimulationControls } from "../components/simulation/SimulationControls.js";
import { StatsOverview } from "../components/common/StatsOverview.js";
import { HistoryViewer } from "../components/common/HistoryViewer.js";
import { WebSocketMessage } from "../types/websocket.js";
import { API_BASE_URL, api } from "../services/api.js";
import type { Host } from "../types/app.js";
import { LiveTelemetrySource } from "../components/telemetry/LiveTelemetrySource.js";
import { getTelemetryFreshness } from "../utils/hostHealth.js";

function preferredHostId(hosts: Host[]): string | null {
  const reportingAgent = hosts
    .filter((host) => host.is_active && Boolean(host.agent_version))
    .sort((a, b) => Date.parse(b.last_seen_at ?? "") - Date.parse(a.last_seen_at ?? ""));

  const freshAgent = reportingAgent.find((host) => {
    const freshness = getTelemetryFreshness(host.last_seen_at, host.is_active);
    return freshness.status === "online" || freshness.status === "stale";
  });
  if (freshAgent) return freshAgent.id;
  if (reportingAgent[0]) return reportingAgent[0].id;

  const activeHost = hosts.find((host) => host.is_active);
  return activeHost?.id ?? null;
}

export const Dashboard: React.FC<{ user: import("../types/app.js").AuthUser }> = ({ user }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);

  const loadHosts = useCallback(async () => {
    try {
      const nextHosts = await api.getHosts();
      setHosts(nextHosts);
      setSelectedHostId((current) => {
        if (current && nextHosts.some((host) => host.id === current)) return current;
        return preferredHostId(nextHosts);
      });
    } catch {
      setHosts([]);
      setSelectedHostId(null);
    }
  }, []);

  useEffect(() => {
    void loadHosts();
    const timer = setInterval(() => void loadHosts(), 5000);
    return () => clearInterval(timer);
  }, [loadHosts]);

  const telemetry = useTelemetry(selectedHostId);
  const alerts = useAlerts();
  const { handleIncomingTelemetry, fetchStats, fetchHistory, clearStream } = telemetry;
  const { handleIncomingAlert, refresh: refreshAlerts, clearAlerts } = alerts;

  // Reset callback
  const handleReset = useCallback(() => {
    clearStream();
    clearAlerts();
    setTimeout(() => {
      fetchStats();
      fetchHistory(50);
      refreshAlerts();
    }, 400);
  }, [clearStream, clearAlerts, fetchStats, fetchHistory, refreshAlerts]);

  const simulation = useSimulation(handleReset);
  const canControlSimulation = user.role === "admin" || user.role === "operator";
  const simulationEnabled = simulation.status?.simulation_enabled ?? simulation.health?.simulation_enabled ?? false;

  // Incoming WebSocket dispatcher
  const handleWsMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === "telemetry") {
        handleIncomingTelemetry(message.data);
      } else if (message.type === "alert") {
        handleIncomingAlert(message.data);
      } else if (message.type === "system") {
        console.log("[Backend System]", message.data);
      }
    },
    [handleIncomingTelemetry, handleIncomingAlert]
  );

  const { status: connectionStatus, reconnect } = useWebSocket(handleWsMessage);

  // Extract metric history arrays for sparklines
  const getMetricHistory = (key: keyof typeof telemetry.streamBuffer[0]) => {
    return telemetry.streamBuffer.map((d) => Number(d[key]) || 0);
  };

  const curr = telemetry.current;
  const prev = telemetry.previous;
  const stats = telemetry.stats;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header */}
      <Header
        connectionStatus={connectionStatus}
        simulationStatus={simulation.status}
        health={simulation.health}
        activeAlertCount={alerts.activeCount}
        lastReceivedAt={telemetry.lastReceivedAt}
        onReconnect={reconnect}
      />

      {/* Global Toast Notification */}
      {simulation.notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs font-medium ${
              simulation.notification.type === "success"
                ? "bg-emerald-950/90 border-emerald-500 text-emerald-200"
                : simulation.notification.type === "error"
                ? "bg-rose-950/90 border-rose-500 text-rose-200"
                : "bg-slate-900/95 border-cyan-500 text-cyan-200"
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{simulation.notification.message}</span>
          </div>
        </div>
      )}

      {telemetry.sequenceGapDetected && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
          <div role="status" className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div><div className="text-xs font-semibold text-amber-200">Stream sequence gap detected</div><div className="mt-1 text-xs text-slate-500">Live frames were skipped or reordered. Historical backfill remains available through Analytics.</div></div>
            </div>
            <a href="/app/analytics" className="shrink-0 text-xs font-semibold text-amber-200 hover:text-white">Inspect history →</a>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6">
        <LiveTelemetrySource
          hosts={hosts}
          host={selectedHostId ? hosts.find((host) => host.id === selectedHostId) ?? null : null}
          current={telemetry.current}
          connectionStatus={connectionStatus}
          lastReceivedAt={telemetry.lastReceivedAt}
          onHostChange={setSelectedHostId}
        />
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards Grid */}
        <section aria-label="Real-time Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
            <MetricCard
              id="card-metric-cpu"
              title="CPU Load"
              metricKey="cpu"
              value={curr?.cpu}
              previousValue={prev?.cpu}
              history={getMetricHistory("cpu")}
              icon={<Cpu className="w-4 h-4 text-cyan-400" />}
              isAnomaly={simulation.status?.active_anomaly === "cpu"}
              min={stats?.cpu.min}
              max={stats?.cpu.max}
              avg={stats?.cpu.avg}
              accentColor="cyan"
            />

            <MetricCard
              id="card-metric-memory"
              title="Memory"
              metricKey="memory"
              value={curr?.memory}
              previousValue={prev?.memory}
              history={getMetricHistory("memory")}
              icon={<HardDrive className="w-4 h-4 text-indigo-400" />}
              isAnomaly={simulation.status?.active_anomaly === "memory"}
              min={stats?.memory.min}
              max={stats?.memory.max}
              avg={stats?.memory.avg}
              accentColor="blue"
            />

            <MetricCard
              id="card-metric-temp"
              title="Temperature"
              metricKey="temperature"
              value={curr?.temperature}
              previousValue={prev?.temperature}
              history={getMetricHistory("temperature")}
              icon={<Flame className="w-4 h-4 text-orange-400" />}
              isAnomaly={simulation.status?.active_anomaly === "temperature"}
              min={stats?.temperature.min}
              max={stats?.temperature.max}
              avg={stats?.temperature.avg}
              accentColor="amber"
            />

            <MetricCard
              id="card-metric-network"
              title="Throughput"
              metricKey="network_mbps"
              value={curr?.network_mbps}
              previousValue={prev?.network_mbps}
              history={getMetricHistory("network_mbps")}
              icon={<Globe className="w-4 h-4 text-emerald-400" />}
              isAnomaly={false}
              min={stats?.network_mbps.min}
              max={stats?.network_mbps.max}
              avg={stats?.network_mbps.avg}
              accentColor="emerald"
            />

            <MetricCard
              id="card-metric-rps"
              title="Req / Sec"
              metricKey="requests_per_second"
              value={curr?.requests_per_second}
              previousValue={prev?.requests_per_second}
              history={getMetricHistory("requests_per_second")}
              icon={<Radio className="w-4 h-4 text-sky-400" />}
              isAnomaly={false}
              min={stats?.requests_per_second.min}
              max={stats?.requests_per_second.max}
              avg={stats?.requests_per_second.avg}
              accentColor="cyan"
            />

            <MetricCard
              id="card-metric-latency"
              title="Latency"
              metricKey="latency_ms"
              value={curr?.latency_ms}
              previousValue={prev?.latency_ms}
              history={getMetricHistory("latency_ms")}
              icon={<Activity className="w-4 h-4 text-amber-400" />}
              isAnomaly={simulation.status?.active_anomaly === "latency"}
              min={stats?.latency_ms.min}
              max={stats?.latency_ms.max}
              avg={stats?.latency_ms.avg}
              accentColor="amber"
            />

            <MetricCard
              id="card-metric-errors"
              title="Error Rate"
              metricKey="error_rate"
              value={curr?.error_rate}
              previousValue={prev?.error_rate}
              history={getMetricHistory("error_rate")}
              icon={<AlertOctagon className="w-4 h-4 text-rose-400" />}
              isAnomaly={simulation.status?.active_anomaly === "error_rate"}
              min={stats?.error_rate.min}
              max={stats?.error_rate.max}
              avg={stats?.error_rate.avg}
              accentColor="rose"
            />
          </div>
        </section>

        {/* Real-time Charts & Anomaly Alerts Grid */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6" aria-label="Visualizations and Alerts">
          <div className="xl:col-span-2">
            <TelemetryCharts
              streamBuffer={telemetry.streamBuffer}
              activeAnomalyMetric={simulation.status?.active_anomaly || null}
            />
          </div>

          <div className="xl:col-span-1">
            <AlertsPanel
              alerts={alerts.alerts}
              activeCount={alerts.activeCount}
              loading={alerts.loading}
              error={alerts.error}
              onRefresh={() => alerts.refresh()}
            />
          </div>
        </section>

        {/* Simulation Controls & Anomaly Injection */}
        {canControlSimulation && simulationEnabled && (
          <section aria-label="Simulation Controls">
            <SimulationControls
              status={simulation.status}
              actionLoading={simulation.actionLoading}
              onTogglePlayPause={simulation.togglePlayPause}
              onSetRate={simulation.setRate}
              onTriggerAnomaly={simulation.triggerAnomaly}
              onReset={simulation.resetSimulation}
            />
          </section>
        )}
        {canControlSimulation && simulation.status && !simulationEnabled && (
          <section aria-label="Live agent mode">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Live collection mode</div>
              <div className="mt-2 text-sm font-medium text-white">Synthetic simulation is disabled.</div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                This dashboard is configured to consume telemetry from real host agents. New samples enter through the authenticated ingestion API and are streamed to this UI after backend processing.
              </p>
            </div>
          </section>
        )}

        {/* Statistical Overview & Historical Telemetry Log */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Statistics and History">
          <StatsOverview
            stats={telemetry.stats}
            loading={telemetry.statsLoading}
            onRefresh={telemetry.fetchStats}
          />

          <HistoryViewer
            events={telemetry.historyEvents}
            loading={telemetry.historyLoading}
            onFetchHistory={telemetry.fetchHistory}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Telemetry Control Center &bull; Real-time infrastructure observability</span>
          <div className="flex items-center gap-4">
            <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer" className="hover:text-slate-400 underline">
              FastAPI OpenAPI Docs
            </a>
            <a href={`${API_BASE_URL}/health`} target="_blank" rel="noreferrer" className="hover:text-slate-400 underline">
              Health Check JSON
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
