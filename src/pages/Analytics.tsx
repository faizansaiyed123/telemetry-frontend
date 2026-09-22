import React, { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Clock3, Database, RefreshCw } from "lucide-react";
import type { AlertRule, Host, TelemetryEvent, TelemetrySeriesPoint, TelemetryStats } from "../types/app.js";
import { api } from "../services/api.js";
import { TimeSeriesChart } from "../components/charts/TimeSeriesChart.js";

const metrics: Array<{ key: AlertRule["metric"]; label: string; unit: string }> = [
  { key: "cpu", label: "CPU", unit: "%" },
  { key: "memory", label: "Memory", unit: "%" },
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "network_mbps", label: "Network", unit: "Mbps" },
  { key: "requests_per_second", label: "Requests", unit: "req/s" },
  { key: "latency_ms", label: "Latency", unit: "ms" },
  { key: "error_rate", label: "Error rate", unit: "%" },
];

const windows = [
  { key: "1h", label: "1h", milliseconds: 60 * 60 * 1000, bucketSeconds: 30 },
  { key: "6h", label: "6h", milliseconds: 6 * 60 * 60 * 1000, bucketSeconds: 120 },
  { key: "24h", label: "24h", milliseconds: 24 * 60 * 60 * 1000, bucketSeconds: 300 },
  { key: "7d", label: "7d", milliseconds: 7 * 24 * 60 * 60 * 1000, bucketSeconds: 900 },
] as const;

export const Analytics: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostId, setHostId] = useState<string>();
  const [metric, setMetric] = useState<AlertRule["metric"]>("latency_ms");
  const [windowKey, setWindowKey] = useState<(typeof windows)[number]["key"]>("24h");
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [history, setHistory] = useState<TelemetryEvent[]>([]);
  const [points, setPoints] = useState<TelemetrySeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWindow = useMemo(() => windows.find((item) => item.key === windowKey) ?? windows[2], [windowKey]);

  useEffect(() => {
    let mounted = true;
    api.getHosts()
      .then((items) => {
        if (!mounted) return;
        setHosts(items);
        if (items.length > 0) setHostId((current) => current ?? items[0].id);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load hosts.");
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const end = new Date();
    const start = new Date(end.getTime() - selectedWindow.milliseconds);
    setRefreshing(true);
    setError(null);
    Promise.all([
      api.getTelemetryStats(hostId),
      api.getTelemetryHistory(120, hostId),
      api.getTelemetrySeries({
        metric,
        hostId,
        start: start.toISOString(),
        end: end.toISOString(),
        bucketSeconds: selectedWindow.bucketSeconds,
      }),
    ])
      .then(([s, h, series]) => {
        if (!mounted) return;
        setStats(s);
        setHistory(h.events);
        setPoints(series.points);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Unable to load analytics.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => { mounted = false; };
  }, [hostId, metric, selectedWindow]);

  const recent = history.slice(-30);
  const span = Math.max(0, (recent.at(-1)?.sequence ?? 0) - (recent[0]?.sequence ?? 0));
  const selectedMetric = metrics.find((item) => item.key === metric) ?? metrics[5];

  async function refresh() {
    const end = new Date();
    const start = new Date(end.getTime() - selectedWindow.milliseconds);
    setRefreshing(true);
    try {
      const [s, h, series] = await Promise.all([
        api.getTelemetryStats(hostId),
        api.getTelemetryHistory(120, hostId),
        api.getTelemetrySeries({
          metric,
          hostId,
          start: start.toISOString(),
          end: end.toISOString(),
          bucketSeconds: selectedWindow.bucketSeconds,
        }),
      ]);
      setStats(s);
      setHistory(h.events);
      setPoints(series.points);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh analytics.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Analytics</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Queryable system history</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Long-range trends are aggregated in PostgreSQL before they reach the browser, keeping charts bounded as telemetry volume grows.</p>
        </div>
        <button onClick={() => void refresh()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40">
          <RefreshCw className={"h-4 w-4 " + (refreshing ? "animate-spin" : "")} />Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
        <label className="rounded-2xl border border-white/7 bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Host</div>
          <select value={hostId ?? ""} onChange={(e) => setHostId(e.target.value || undefined)} className="mt-2 w-full rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/30">
            {hosts.map((host) => <option key={host.id} value={host.id}>{host.name} · {host.environment}</option>)}
          </select>
        </label>
        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-3">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Window</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {windows.map((item) => <button key={item.key} onClick={() => setWindowKey(item.key)} className={"rounded-lg px-3 py-2 text-xs font-medium " + (windowKey === item.key ? "bg-cyan-300 text-slate-950" : "border border-white/8 text-slate-400 hover:bg-white/[0.04]")}>{item.label}</button>)}
          </div>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}

      {loading && !stats ? <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-8 text-sm text-slate-500">Loading analytics…</div> :
        stats && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><Database className="h-4 w-4" />Stored samples</div><div className="mt-3 text-3xl font-semibold text-white">{stats.count.toLocaleString()}</div></div>
            <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" />Recent sequence span</div><div className="mt-3 text-3xl font-semibold text-cyan-300">{span.toLocaleString()}</div></div>
            <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" />Latest sequence</div><div className="mt-3 text-3xl font-semibold text-white">#{(history.at(-1)?.sequence ?? 0).toLocaleString()}</div></div>
            <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><BarChart3 className="h-4 w-4" />Chart buckets</div><div className="mt-3 text-3xl font-semibold text-cyan-300">{points.length.toLocaleString()}</div></div>
          </div>

          <div className="flex flex-wrap gap-2">
            {metrics.map((item) => <button key={item.key} onClick={() => setMetric(item.key)} className={"rounded-full border px-3 py-1.5 text-xs " + (metric === item.key ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : "border-white/8 text-slate-500 hover:text-slate-300")}>{item.label}</button>)}
          </div>

          <TimeSeriesChart points={points} unit={selectedMetric.unit} label={selectedMetric.label} loading={refreshing && points.length === 0} />

          <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
            <div className="border-b border-white/6 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metric summary</div>
              <div className="mt-1 text-xs text-slate-700">Current host statistics from the persisted observation window.</div>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((item) => {
                const stat = stats[item.key];
                return <div key={item.key} className="border-b border-r border-white/6 p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{item.label}</span><span className="text-xs text-slate-600">{item.unit}</span></div><div className="mt-4 grid grid-cols-4 gap-3 text-xs"><div><div className="text-slate-600">Min</div><div className="mt-1 text-slate-300">{stat.min?.toFixed(1) ?? "—"}</div></div><div><div className="text-slate-600">Avg</div><div className="mt-1 text-slate-300">{stat.avg?.toFixed(1) ?? "—"}</div></div><div><div className="text-slate-600">Max</div><div className="mt-1 text-slate-300">{stat.max?.toFixed(1) ?? "—"}</div></div><div><div className="text-slate-600">Latest</div><div className="mt-1 text-cyan-300">{stat.latest?.toFixed(1) ?? "—"}</div></div></div></div>;
              })}
            </div>
          </div>
        </>
      }
    </main>
  );
};

export default Analytics;
