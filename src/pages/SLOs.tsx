import React, { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Gauge, Plus, RefreshCw, Target, Trash2, XCircle } from "lucide-react";
import type { AlertRule, AuthUser, Host, SLO, SLOStatus } from "../types/app.js";
import { api } from "../services/api.js";

const metrics: Array<{ key: AlertRule["metric"]; label: string }> = [
  { key: "latency_ms", label: "Latency" },
  { key: "error_rate", label: "Error rate" },
  { key: "cpu", label: "CPU" },
  { key: "memory", label: "Memory" },
  { key: "temperature", label: "Temperature" },
  { key: "network_mbps", label: "Network throughput" },
  { key: "requests_per_second", label: "Requests / sec" },
];

const operators: AlertRule["operator"][] = [">", ">=", "<", "<="];

function progressClass(percent: number): string {
  if (percent >= 90) return "bg-emerald-300";
  if (percent >= 50) return "bg-amber-300";
  return "bg-rose-300";
}

export const SLOs: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [slos, setSlos] = useState<SLO[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SLOStatus>>({});
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("Latency objective");
  const [hostId, setHostId] = useState("");
  const [metric, setMetric] = useState<AlertRule["metric"]>("latency_ms");
  const [operator, setOperator] = useState<AlertRule["operator"]>("<=");
  const [threshold, setThreshold] = useState("200");
  const [objective, setObjective] = useState("99");
  const [windowHours, setWindowHours] = useState("168");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [sloRows, hostRows] = await Promise.all([api.getSlos(), api.getHosts()]);
      setSlos(sloRows);
      setHosts(hostRows);
      setHostId((current) => current || hostRows[0]?.id || "");
      const results = await Promise.all(
        sloRows.map(async (slo) => {
          try {
            return [slo.id, await api.getSloStatus(slo.id)] as const;
          } catch {
            return null;
          }
        }),
      );
      const next: Record<string, SLOStatus> = {};
      for (const result of results) if (result) next[result[0]] = result[1];
      setStatuses(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load SLOs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const summaries = useMemo(() => {
    const values = Object.values(statuses);
    return {
      total: slos.length,
      compliant: values.filter((item) => item.compliant).length,
      budgetLow: values.filter((item) => item.error_budget_remaining_percent < 25).length,
    };
  }, [slos.length, statuses]);

  async function create() {
    if (!name.trim() || !hostId) return;
    const parsedThreshold = Number(threshold);
    const parsedObjective = Number(objective);
    const parsedWindow = Number(windowHours);
    if (!Number.isFinite(parsedThreshold) || !Number.isFinite(parsedObjective) || !Number.isFinite(parsedWindow)) {
      setError("Threshold, objective, and window must be valid numbers.");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.createSlo({
        name: name.trim(),
        host_id: hostId,
        metric,
        operator,
        threshold: parsedThreshold,
        objective_percent: parsedObjective,
        window_hours: parsedWindow,
        enabled: true,
      });
      setSlos((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
      const status = await api.getSloStatus(created.id);
      setStatuses((current) => ({ ...current, [created.id]: status }));
      setNotice("SLO created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create SLO.");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(slo: SLO) {
    try {
      const updated = await api.updateSlo(slo.id, { enabled: !slo.enabled });
      setSlos((rows) => rows.map((item) => item.id === slo.id ? updated : item));
      const status = await api.getSloStatus(slo.id);
      setStatuses((current) => ({ ...current, [slo.id]: status }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update SLO.");
    }
  }

  async function remove(slo: SLO) {
    if (!window.confirm("Delete SLO \"" + slo.name + "\"?")) return;
    setDeleting(slo.id);
    setError(null);
    try {
      await api.deleteSlo(slo.id);
      setSlos((rows) => rows.filter((item) => item.id !== slo.id));
      setStatuses((current) => {
        const next = { ...current };
        delete next[slo.id];
        return next;
      });
      setNotice("SLO deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete SLO.");
    } finally {
      setDeleting(null);
    }
  }

  const hostName = (id: string) => hosts.find((host) => host.id === id)?.name ?? id;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Reliability</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Service objectives</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Turn infrastructure signals into measurable reliability targets with a visible error budget.
          </p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40">
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Objectives", summaries.total, "text-white"],
          ["Compliant", summaries.compliant, "text-emerald-300"],
          ["Budget <25%", summaries.budgetLow, "text-amber-300"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={"mt-3 text-3xl font-semibold " + String(tone)}>{value}</div>
          </div>
        ))}
      </div>

      {(error || notice) && (
        <div role="alert" className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>
          {error || notice}
        </div>
      )}

      {user.role === "admin" && (
        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Define an SLO</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="99% latency objective" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
            <select value={hostId} onChange={(e) => setHostId(e.target.value)} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">
              {hosts.map((host) => <option key={host.id} value={host.id}>{host.name} · {host.environment}</option>)}
            </select>
            <select value={metric} onChange={(e) => setMetric(e.target.value as AlertRule["metric"])} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">
              {metrics.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <div className="grid grid-cols-[0.6fr_1fr] gap-2">
              <select value={operator} onChange={(e) => setOperator(e.target.value as AlertRule["operator"])} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-3 text-sm text-white">
                {operators.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input value={threshold} onChange={(e) => setThreshold(e.target.value)} type="number" min="0" step="0.01" placeholder="Threshold" className="rounded-xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={objective} onChange={(e) => setObjective(e.target.value)} type="number" min="0.01" max="100" step="0.01" placeholder="Objective %" className="rounded-xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
              <input value={windowHours} onChange={(e) => setWindowHours(e.target.value)} type="number" min="1" max="720" step="1" placeholder="Window h" className="rounded-xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
            </div>
            <button onClick={() => void create()} disabled={creating || !hostId || !name.trim() || Number(objective) <= 0 || Number(objective) > 100} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40 md:col-span-2 xl:col-span-1">
              {creating ? "Creating…" : "Create SLO"}
            </button>
          </div>
          {hosts.length === 0 && <div className="mt-3 text-xs text-amber-300">Create an active host first; an SLO is always tied to a monitored host.</div>}
        </div>
      )}

      {loading && slos.length === 0 ? (
        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-8 text-sm text-slate-500">Loading service objectives…</div>
      ) : slos.length === 0 ? (
        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-10 text-center">
          <Target className="mx-auto h-7 w-7 text-slate-700" />
          <div className="mt-3 text-sm font-medium text-white">No SLOs configured</div>
          <p className="mt-2 text-xs text-slate-600">An administrator can define an objective above. The evaluator uses stored samples for the selected host and time window.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {slos.map((slo) => {
            const status = statuses[slo.id];
            const budget = status?.error_budget_remaining_percent ?? 0;
            return (
              <article key={slo.id} className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/5"><Gauge className="h-4 w-4 text-cyan-300" /></div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">{slo.name}</h2>
                      <div className="mt-1 text-xs text-slate-600">{hostName(slo.host_id)} · {metrics.find((item) => item.key === slo.metric)?.label}</div>
                    </div>
                  </div>
                  <div className={"rounded-full border px-2.5 py-1 text-[10px] " + (slo.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/8 text-slate-500")}>{slo.enabled ? "Enabled" : "Paused"}</div>
                </div>

                {status ? (
                  <>
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["SLI", status.sli_percent.toFixed(3) + "%"],
                        ["Objective", status.objective_percent.toFixed(2) + "%"],
                        ["Budget", status.error_budget_remaining_percent.toFixed(2) + "%"],
                        ["Bad", status.bad_samples.toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-xl border border-white/7 bg-white/[0.02] p-3">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</div>
                          <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Remaining error budget</span>
                        <span className={budget >= 25 ? "text-emerald-300" : budget > 0 ? "text-amber-300" : "text-rose-300"}>{budget.toFixed(2)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                        <div className={"h-full rounded-full " + progressClass(budget)} style={{ width: Math.max(0, Math.min(100, budget)) + "%" }} />
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className={"inline-flex items-center gap-2 text-xs " + (status.compliant ? "text-emerald-300" : "text-rose-300")}>
                        {status.compliant ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {status.compliant ? "Within objective" : "Objective breached"}
                      </div>
                      {user.role === "admin" && (
                        <div className="flex gap-2">
                          <button onClick={() => void toggle(slo)} className="rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400">{slo.enabled ? "Pause" : "Enable"}</button>
                          <button disabled={deleting === slo.id} onClick={() => void remove(slo)} aria-label={"Delete " + slo.name} className="rounded-xl border border-rose-500/15 px-3 py-2 text-xs text-rose-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-xl border border-white/7 bg-white/[0.02] p-4 text-xs text-slate-600">
                    <Activity className="mb-2 h-4 w-4 text-slate-700" />No evaluation data available for this window.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default SLOs;
