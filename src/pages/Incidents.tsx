import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Filter, RefreshCw, ShieldAlert } from "lucide-react";
import type { AuthUser, Incident } from "../types/app.js";
import { api } from "../services/api.js";

function formatDuration(start: string, end: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 1000));
  if (seconds < 60) return String(seconds) + "s";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return String(minutes) + "m " + String(seconds % 60) + "s";
  const hours = Math.floor(minutes / 60);
  return String(hours) + "h " + String(minutes % 60) + "m";
}

function severityClass(severity: Incident["severity"]): string {
  if (severity === "CRITICAL") return "border-rose-500/20 bg-rose-500/10 text-rose-300";
  if (severity === "WARNING") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}

function statusClass(status: Incident["status"]): string {
  if (status === "resolved") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "acknowledged") return "border-indigo-500/20 bg-indigo-500/10 text-indigo-300";
  return "border-rose-500/20 bg-rose-500/10 text-rose-300";
}

export const Incidents: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | Incident["status"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canAcknowledge = user.role === "admin" || user.role === "operator";

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const rows = await api.getIncidents(statusFilter === "all" ? undefined : statusFilter);
      setIncidents(rows);
      setSelectedId((current) => current && rows.some((item) => item.id === current) ? current : rows[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, [statusFilter]);

  const selected = useMemo(
    () => incidents.find((incident) => incident.id === selectedId) ?? null,
    [incidents, selectedId],
  );

  async function acknowledge(id: string) {
    setWorking(id);
    try {
      const updated = await api.acknowledgeIncident(id);
      setIncidents((rows) => rows.map((item) => item.id === id ? updated : item));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to acknowledge incident.");
    } finally {
      setWorking(null);
    }
  }

  const openCount = incidents.filter((item) => item.status === "open").length;
  const acknowledgedCount = incidents.filter((item) => item.status === "acknowledged").length;
  const resolvedCount = incidents.filter((item) => item.status === "resolved").length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Operations</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Incident timeline</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Correlated alerts are grouped into an incident so operators investigate one operational event instead of a noisy alert stream.
          </p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40">
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Open", openCount, "text-rose-300"],
          ["Acknowledged", acknowledgedCount, "text-indigo-300"],
          ["Resolved", resolvedCount, "text-emerald-300"],
          ["Visible", incidents.length, "text-cyan-300"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={"mt-3 text-3xl font-semibold " + String(tone)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-600" />
        {(["all", "open", "acknowledged", "resolved"] as const).map((value) => (
          <button key={value} onClick={() => setStatusFilter(value)} className={"rounded-full border px-3 py-1.5 text-xs " + (
            statusFilter === value
              ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
              : "border-white/8 text-slate-500 hover:text-slate-300"
          )}>
            {value === "all" ? "All incidents" : value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
          <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Incidents</div>
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading incident history…</div>
          ) : incidents.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-300" />
              <div className="mt-3 text-sm font-medium text-white">No correlated incidents</div>
              <p className="mt-2 text-xs leading-5 text-slate-600">When multiple alerts appear close together on the same host, the backend groups them here.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {incidents.map((incident) => (
                <button key={incident.id} onClick={() => setSelectedId(incident.id)} className={"w-full px-5 py-5 text-left transition hover:bg-white/[0.025] " + (selectedId === incident.id ? "bg-cyan-400/[0.035]" : "")}>
                  <div className="flex items-start gap-3">
                    <div className={"mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border " + severityClass(incident.severity)}>
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">{incident.title}</span>
                        <span className={"rounded-full border px-2 py-1 text-[10px] font-medium " + statusClass(incident.status)}>{incident.status}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span>{new Date(incident.first_seen_at).toLocaleString()}</span>
                        <span>{formatDuration(incident.first_seen_at, incident.last_seen_at)}</span>
                        <span>{incident.alert_ids.length} correlated alerts</span>
                        {incident.active_alert_count > 0 && <span className="text-rose-300">{incident.active_alert_count} active</span>}
                      </div>
                    </div>
                    <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-slate-700" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/7 bg-slate-900/50 p-6">
          {!selected ? (
            <div className="flex h-full min-h-72 items-center justify-center text-center">
              <div>
                <Clock3 className="mx-auto h-7 w-7 text-slate-700" />
                <div className="mt-3 text-sm text-slate-500">Select an incident to inspect its evidence window.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Incident</div>
                  <h2 className="mt-2 text-xl font-semibold text-white">{selected.title}</h2>
                </div>
                {canAcknowledge && selected.status !== "resolved" && (
                  <button disabled={working === selected.id} onClick={() => void acknowledge(selected.id)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-40">
                    <CheckCircle2 className="h-3.5 w-3.5" />{working === selected.id ? "Acknowledging…" : "Acknowledge"}
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Severity</div>
                  <div className={"mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs " + severityClass(selected.severity)}>{selected.severity}</div>
                </div>
                <div className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Status</div>
                  <div className={"mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs " + statusClass(selected.status)}>{selected.status}</div>
                </div>
                <div className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Host</div>
                  <div className="mt-2 break-all font-mono text-xs text-slate-300">{selected.host_id ?? "System"}</div>
                </div>
                <div className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Duration</div>
                  <div className="mt-2 text-sm text-slate-300">{formatDuration(selected.first_seen_at, selected.last_seen_at)}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Correlated alert IDs</div>
                <div className="mt-3 space-y-2">
                  {selected.alert_ids.map((id) => <div key={id} className="rounded-lg border border-white/7 bg-black/10 px-3 py-2 font-mono text-xs text-slate-500">{id}</div>)}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-cyan-200"><Clock3 className="h-3.5 w-3.5" />Evidence window</div>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  First signal: {new Date(selected.first_seen_at).toLocaleString()} · Last signal: {new Date(selected.last_seen_at).toLocaleString()}.
                  The incident remains open while one or more correlated alerts are active.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default Incidents;
