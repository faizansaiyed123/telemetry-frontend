import React, { useCallback } from "react";
import {
  Activity,
  AlertOctagon,
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
import { getStoredUser } from "../lib/session.js";
import { API_BASE_URL } from "../services/api.js";

export const Dashboard: React.FC = () => {
  const telemetry = useTelemetry();
  const alerts = useAlerts();

  // Reset callback
  const handleReset = useCallback(() => {
    telemetry.clearStream();
    alerts.clearAlerts();
    setTimeout(() => {
      telemetry.fetchStats();
      telemetry.fetchHistory(50);
      alerts.refresh();
    }, 400);
  }, [telemetry, alerts]);

  const simulation = useSimulation(handleReset);
  const user = getStoredUser();
  const canControlSimulation = user?.role === "admin" || user?.role === "operator";

  // Incoming WebSocket dispatcher
  const handleWsMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === "telemetry") {
        telemetry.handleIncomingTelemetry(message.data);
      } else if (message.type === "alert") {
        alerts.handleIncomingAlert(message.data);
      } else if (message.type === "system") {
        console.log("[Backend System]", message.data);
      }
    },
    [telemetry, alerts]
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
        {canControlSimulation && <section aria-label="Simulation Controls">
          <SimulationControls
            status={simulation.status}
            actionLoading={simulation.actionLoading}
            onTogglePlayPause={simulation.togglePlayPause}
            onSetRate={simulation.setRate}
            onTriggerAnomaly={simulation.triggerAnomaly}
            onReset={simulation.resetSimulation}
          />
        </section>}

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
          <span>Telemetry Backend Observability System &bull; Port 3000 &bull; WebSocket Stream</span>
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
