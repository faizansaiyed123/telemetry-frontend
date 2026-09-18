import React, { useEffect, useState } from "react";
import { Activity, BarChart3, Clock3 } from "lucide-react";
import type { TelemetryEvent, TelemetryStats } from "../types/app.js";
import { api } from "../services/api.js";

const metrics = [["cpu","CPU","%"],["memory","Memory","%"],["temperature","Temperature","°C"],["network_mbps","Network","Mbps"],["requests_per_second","Requests","req/s"],["latency_ms","Latency","ms"],["error_rate","Error rate","%"]] as const;

export const Analytics: React.FC = () => {
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [history, setHistory] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    Promise.all([api.getTelemetryStats(), api.getTelemetryHistory(120)])
      .then(([s, h]) => {
        if (!mounted) return;
        setStats(s);
        setHistory(h.events);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const recent = history.slice(-30);
  const span = Math.max(0, (recent.at(-1)?.sequence ?? 0) - (recent[0]?.sequence ?? 0));
  return <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8"><div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Analytics</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">System trends</h1><p className="mt-2 text-sm text-slate-500">Aggregated telemetry statistics over the retained observation window.</p></div>
    {loading ? <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-8 text-sm text-slate-500">Loading analytics…</div> : error ? <div role="alert" className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-8 text-sm text-rose-300">{error}</div> : stats && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><BarChart3 className="h-4 w-4" />Samples</div><div className="mt-3 text-3xl font-semibold">{stats.count.toLocaleString()}</div></div><div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" />Recent span</div><div className="mt-3 text-3xl font-semibold text-cyan-300">{span.toLocaleString()}</div></div><div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 className="h-4 w-4" />Latest sequence</div><div className="mt-3 text-3xl font-semibold">#{(history.at(-1)?.sequence ?? 0).toLocaleString()}</div></div><div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5"><div className="flex items-center gap-2 text-xs text-slate-500"><BarChart3 className="h-4 w-4" />Metrics tracked</div><div className="mt-3 text-3xl font-semibold text-cyan-300">{metrics.length}</div></div></div>
      <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50"><div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Metric summary</div><div className="grid sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([key,label,unit]) => { const stat = stats[key]; return <div key={key} className="border-b border-r border-white/6 p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-white">{label}</span><span className="text-xs text-slate-600">{unit}</span></div><div className="mt-4 grid grid-cols-4 gap-3 text-xs"><div><div className="text-slate-600">Min</div><div className="mt-1 text-slate-300">{stat.min?.toFixed(1) ?? "—"}</div></div><div><div className="text-slate-600">Avg</div><div className="mt-1 text-slate-300">{stat.avg?.toFixed(1) ?? "—"}</div></div><div><div className="text-slate-600">Max</div><div className="mt-1 text-slate-300">{stat.max?.toFixed(1) ?? "—"}</div></div><div><div className="text-slate-600">Latest</div><div className="mt-1 text-cyan-300">{stat.latest?.toFixed(1) ?? "—"}</div></div></div></div>; })}</div></div></>}
  </main>;
};
export default Analytics;
