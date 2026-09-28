import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Edit3, Globe, Pause, Play, Plus, RefreshCw, Save, Trash2, X, XCircle } from "lucide-react";
import type { Service, SyntheticCheck, SyntheticCheckRun } from "../types/app.js";
import { api } from "../services/api.js";

type Draft = {
  name: string;
  url: string;
  service_id: string;
  method: "GET" | "HEAD";
  interval_seconds: number;
  timeout_seconds: number;
  expected_status: number;
  enabled: boolean;
};

const defaultDraft: Draft = {
  name: "Public health check",
  url: "https://example.com/health",
  service_id: "",
  method: "GET",
  interval_seconds: 30,
  timeout_seconds: 10,
  expected_status: 200,
  enabled: true,
};

function statusTone(run?: SyntheticCheckRun | null) {
  if (!run) return "border-white/8 bg-white/[0.02] text-slate-500";
  return run.success ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300";
}

export const SyntheticChecks: React.FC = () => {
  const [checks, setChecks] = useState<SyntheticCheck[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [runs, setRuns] = useState<SyntheticCheckRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [editing, setEditing] = useState<SyntheticCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const serviceName = useMemo(() => (id?: string | null) => services.find((item) => item.id === id)?.name ?? "Unassigned", [services]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [checkRows, serviceRows] = await Promise.all([api.getSyntheticChecks(), api.getServices()]);
      setChecks(checkRows);
      setServices(serviceRows);
      setSelectedId((current) => current && checkRows.some((item) => item.id === current) ? current : checkRows[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load synthetic checks.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRuns(id: string) {
    try {
      setRunsLoading(true);
      const data = await api.getSyntheticCheckRuns(id, 100);
      setRuns(data.runs);
    } catch (err) {
      setRuns([]);
      setError(err instanceof Error ? err.message : "Unable to load synthetic run history.");
    } finally {
      setRunsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (selectedId) void loadRuns(selectedId); else setRuns([]); }, [selectedId]);

  async function create() {
    if (!draft.name.trim() || !draft.url.trim()) {
      setError("Check name and URL are required.");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const created = await api.createSyntheticCheck({ ...draft, name: draft.name.trim(), url: draft.url.trim(), service_id: draft.service_id || null });
      setChecks((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(created.id);
      setNotice("Synthetic check created and scheduled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create synthetic check.");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(check: SyntheticCheck) {
    setEditing(check);
    setError(null);
    setNotice(null);
  }

  async function saveEdit() {
    if (!editing || !editing.name.trim() || !editing.url.trim()) return;
    setBusy("edit:" + editing.id);
    setError(null);
    try {
      const updated = await api.updateSyntheticCheck(editing.id, {
        name: editing.name.trim(),
        url: editing.url.trim(),
        service_id: editing.service_id ?? null,
        method: editing.method,
        interval_seconds: editing.interval_seconds,
        timeout_seconds: editing.timeout_seconds,
        expected_status: editing.expected_status,
        enabled: editing.enabled,
      });
      setChecks((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setEditing(null);
      setNotice("Synthetic check updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update synthetic check.");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(check: SyntheticCheck) {
    setBusy("toggle:" + check.id);
    setError(null);
    try {
      const updated = await api.updateSyntheticCheck(check.id, { enabled: !check.enabled });
      setChecks((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setNotice(check.enabled ? "Synthetic check paused." : "Synthetic check enabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update synthetic check.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(check: SyntheticCheck) {
    if (!window.confirm('Delete synthetic check "' + check.name + '"?')) return;
    setBusy("delete:" + check.id);
    setError(null);
    try {
      await api.deleteSyntheticCheck(check.id);
      setChecks((rows) => rows.filter((row) => row.id !== check.id));
      setSelectedId((current) => current === check.id ? null : current);
      setNotice("Synthetic check deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete synthetic check.");
    } finally {
      setBusy(null);
    }
  }

  async function runNow(check: SyntheticCheck) {
    setBusy("run:" + check.id);
    setError(null);
    try {
      const run = await api.runSyntheticCheck(check.id);
      setChecks((rows) => rows.map((row) => row.id === check.id ? { ...row, last_run: run } : row));
      setSelectedId(check.id);
      setRuns((items) => [...items.filter((item) => item.id !== run.id), run].sort((a, b) => a.checked_at.localeCompare(b.checked_at)).slice(-100));
      setNotice("Synthetic check executed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run synthetic check.");
    } finally {
      setBusy(null);
    }
  }

  const draftUpdate = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Synthetic monitoring</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">External checks</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Schedule safe HTTP/HEAD probes, correlate them with services, and inspect every recorded run.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40"><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh</button>
      </div>
      {(error || notice) && <div role="alert" className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>{error || notice}</div>}

      <section className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Create synthetic check</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={draft.name} onChange={(e) => draftUpdate({ name: e.target.value })} placeholder="API health check" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
          <input value={draft.url} onChange={(e) => draftUpdate({ url: e.target.value })} placeholder="https://example.com/health" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white xl:col-span-2" />
          <select value={draft.service_id} onChange={(e) => draftUpdate({ service_id: e.target.value })} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">No service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.environment}</option>)}</select>
          <select value={draft.method} onChange={(e) => draftUpdate({ method: e.target.value as Draft["method"] })} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"><option value="GET">GET</option><option value="HEAD">HEAD</option></select>
          <input type="number" min="10" max="3600" value={draft.interval_seconds} onChange={(e) => draftUpdate({ interval_seconds: Number(e.target.value) })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" aria-label="Check interval seconds" />
          <input type="number" min="1" max="60" step="0.5" value={draft.timeout_seconds} onChange={(e) => draftUpdate({ timeout_seconds: Number(e.target.value) })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" aria-label="Check timeout seconds" />
          <input type="number" min="100" max="599" value={draft.expected_status} onChange={(e) => draftUpdate({ expected_status: Number(e.target.value) })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" aria-label="Expected HTTP status" />
          <button onClick={() => void create()} disabled={busy === "create"} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy === "create" ? "Creating…" : "Create check"}</button>
        </div>
      </section>

      {editing && <section className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-5">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-white"><Edit3 className="h-4 w-4 text-cyan-300" />Edit {editing.name}</div><button onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
          <input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white xl:col-span-2" />
          <select value={editing.service_id ?? ""} onChange={(e) => setEditing({ ...editing, service_id: e.target.value || null })} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"><option value="">No service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>
          <select value={editing.method} onChange={(e) => setEditing({ ...editing, method: e.target.value as SyntheticCheck["method"] })} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"><option value="GET">GET</option><option value="HEAD">HEAD</option></select>
          <input type="number" min="10" max="3600" value={editing.interval_seconds} onChange={(e) => setEditing({ ...editing, interval_seconds: Number(e.target.value) })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
          <input type="number" min="1" max="60" step="0.5" value={editing.timeout_seconds} onChange={(e) => setEditing({ ...editing, timeout_seconds: Number(e.target.value) })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
          <input type="number" min="100" max="599" value={editing.expected_status} onChange={(e) => setEditing({ ...editing, expected_status: Number(e.target.value) })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />Enabled</label>
        <div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-xs text-slate-400"><X className="h-3.5 w-3.5" />Cancel</button><button onClick={() => void saveEdit()} disabled={busy === "edit:" + editing.id} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950"><Save className="h-3.5 w-3.5" />Save</button></div>
      </section>}

      <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Checks</div>
        {loading ? <div className="p-8 text-sm text-slate-500">Loading synthetic checks…</div> : checks.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No synthetic checks configured.</div> :
          <div className="divide-y divide-white/6">{checks.map((check) => <div key={check.id} className={"px-5 py-5 transition " + (selectedId === check.id ? "bg-cyan-300/[0.025]" : "")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(check.id)}>
                <div className="flex flex-wrap items-center gap-2"><Globe className="h-4 w-4 text-cyan-300" /><span className="text-sm font-medium text-white">{check.name}</span><span className={"rounded-full border px-2 py-1 text-[10px] " + (check.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/8 text-slate-500")}>{check.enabled ? "Enabled" : "Paused"}</span>{check.last_run && <span className={"rounded-full border px-2 py-1 text-[10px] " + statusTone(check.last_run)}>{check.last_run.success ? "Healthy" : "Failed"}</span>}</div>
                <div className="mt-2 break-all font-mono text-xs text-slate-600">{check.method} {check.url}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600"><span>{serviceName(check.service_id)}</span><span>every {check.interval_seconds}s</span><span>timeout {check.timeout_seconds}s</span><span>expect {check.expected_status}</span>{check.last_run && <span>last {new Date(check.last_run.checked_at).toLocaleString()}</span>}</div>
              </button>
              <div className="flex flex-wrap gap-2"><button onClick={() => void runNow(check)} disabled={busy === "run:" + check.id} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"><Play className="h-3.5 w-3.5" />{busy === "run:" + check.id ? "Running…" : "Run now"}</button><button onClick={() => void toggle(check)} disabled={busy === "toggle:" + check.id} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400"><Pause className="h-3.5 w-3.5" />{check.enabled ? "Pause" : "Enable"}</button><button onClick={() => startEdit(check)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400"><Edit3 className="h-3.5 w-3.5" />Edit</button><button onClick={() => void remove(check)} disabled={busy === "delete:" + check.id} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/15 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div>
            </div>
          </div>)}</div>}
      </section>

      {selectedId && <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        <div className="border-b border-white/6 px-5 py-4"><div className="flex items-center gap-2 text-sm font-medium text-white"><Clock3 className="h-4 w-4 text-cyan-300" />Run history</div><div className="mt-1 text-xs text-slate-600">Most recent 100 persisted executions.</div></div>
        {runsLoading ? <div className="p-8 text-sm text-slate-500">Loading run history…</div> : runs.length === 0 ? <div className="p-8 text-sm text-slate-500">No runs recorded yet.</div> :
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-white/6 text-slate-600"><tr><th className="px-5 py-3 font-medium">Checked</th><th className="px-5 py-3 font-medium">Result</th><th className="px-5 py-3 font-medium">Duration</th><th className="px-5 py-3 font-medium">HTTP</th><th className="px-5 py-3 font-medium">Failures</th><th className="px-5 py-3 font-medium">Error</th></tr></thead><tbody className="divide-y divide-white/6">{runs.map((run) => <tr key={run.id}><td className="px-5 py-3 text-slate-400">{new Date(run.checked_at).toLocaleString()}</td><td className="px-5 py-3">{run.success ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Success</span> : <span className="inline-flex items-center gap-1 text-rose-300"><XCircle className="h-3.5 w-3.5" />Failed</span>}</td><td className="px-5 py-3 font-mono text-slate-500">{run.duration_ms.toFixed(1)}ms</td><td className="px-5 py-3 font-mono text-slate-500">{run.status_code ?? "—"}</td><td className="px-5 py-3 font-mono text-slate-500">{run.consecutive_failures}</td><td className="px-5 py-3 text-rose-300">{run.error ?? "—"}</td></tr>)}</tbody></table></div>}
      </section>}
    </main>
  );
};

export default SyntheticChecks;
