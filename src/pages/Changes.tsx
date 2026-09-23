import React, { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, ExternalLink, GitBranch, Plus, RefreshCw, Search, Wrench, X } from "lucide-react";
import type { AuthUser, ChangeEvent, ChangeEventType, Host } from "../types/app.js";
import { api } from "../services/api.js";

const changeTypes: ChangeEventType[] = ["deployment", "config", "feature_flag", "maintenance", "rollback", "other"];

const typeLabels: Record<ChangeEventType, string> = {
  deployment: "Deployment",
  config: "Configuration",
  feature_flag: "Feature flag",
  maintenance: "Maintenance",
  rollback: "Rollback",
  other: "Other",
};

function typeClass(type: ChangeEventType): string {
  if (type === "deployment") return "border-cyan-400/15 bg-cyan-400/5 text-cyan-200";
  if (type === "rollback") return "border-rose-400/15 bg-rose-400/5 text-rose-200";
  if (type === "maintenance") return "border-amber-400/15 bg-amber-400/5 text-amber-200";
  return "border-white/8 bg-white/[0.02] text-slate-400";
}

function formatRelative(date: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(date)) / 1000));
  if (seconds < 60) return seconds + "s ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + "h ago";
  return new Date(date).toLocaleDateString();
}

function ChangeIcon({ type }: { type: ChangeEventType }) {
  if (type === "deployment" || type === "rollback") return <GitBranch className="h-4 w-4" />;
  if (type === "maintenance" || type === "config") return <Wrench className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export const Changes: React.FC<{ user: AuthUser }> = ({ user }) => {
  const canCreate = user.role === "admin" || user.role === "operator";
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | ChangeEventType>("all");
  const [hostFilter, setHostFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [eventType, setEventType] = useState<ChangeEventType>("deployment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostId, setHostId] = useState("");
  const [source, setSource] = useState("manual");
  const [externalRef, setExternalRef] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [rows, hostRows] = await Promise.all([
        api.getChanges(hostFilter === "all" ? undefined : hostFilter),
        api.getHosts(),
      ]);
      setChanges(rows);
      setHosts(hostRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load change events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [hostFilter]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return changes.filter((item) => {
      const matchesType = typeFilter === "all" || item.event_type === typeFilter;
      const matchesQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        (item.description ?? "").toLowerCase().includes(needle) ||
        item.source.toLowerCase().includes(needle) ||
        (item.external_ref ?? "").toLowerCase().includes(needle);
      return matchesType && matchesQuery;
    });
  }, [changes, query, typeFilter]);

  const summary = useMemo(() => ({
    total: changes.length,
    deployments: changes.filter((item) => item.event_type === "deployment").length,
    rollbacks: changes.filter((item) => item.event_type === "rollback").length,
    automated: changes.filter((item) => item.source !== "manual").length,
  }), [changes]);

  const hostName = (id: string | null) => hosts.find((host) => host.id === id)?.name ?? "All hosts";

  async function createChange() {
    if (!title.trim()) {
      setError("A change title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.createChange({
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || null,
        host_id: hostId || null,
        source: source.trim() || "manual",
        external_ref: externalRef.trim() || null,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
      });
      setChanges((rows) => [created, ...rows]);
      setTitle("");
      setDescription("");
      setExternalRef("");
      setOccurredAt("");
      setShowCreate(false);
      setNotice("Change event recorded. Future incidents can correlate it automatically.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create change event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Reliability</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Change events</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Record deployments and operational changes so incident investigation has a concrete change timeline instead of guesswork.
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950">
            <Plus className="h-4 w-4" />Record change
          </button>
        )}
      </div>

      {(error || notice) && (
        <div role="alert" className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>
          {error || notice}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["Tracked changes", summary.total, "text-cyan-300"],
          ["Deployments", summary.deployments, "text-white"],
          ["Rollbacks", summary.rollbacks, "text-rose-300"],
          ["External sources", summary.automated, "text-emerald-300"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={"mt-3 text-3xl font-semibold " + String(tone)}>{value}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/7 bg-white/[0.02] p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, source, release reference…" className="w-full rounded-xl border border-white/8 bg-black/10 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | ChangeEventType)} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All change types</option>
          {changeTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}
        </select>
        <select value={hostFilter} onChange={(e) => setHostFilter(e.target.value)} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none">
          <option value="all">All hosts</option>
          {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
        </select>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-sm text-slate-400 disabled:opacity-40">
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operational timeline</div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading change history…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Clock3 className="mx-auto h-7 w-7 text-slate-700" />
            <div className="mt-3 text-sm font-medium text-white">No change events match the current filters</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">Record deployments and maintenance here, or emit events from your CI/CD pipeline through the backend API.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {visible.map((item) => (
              <article key={item.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start">
                <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border " + typeClass(item.event_type)}>
                  <ChangeIcon type={item.event_type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                    <span className={"rounded-full border px-2 py-1 text-[10px] font-medium " + typeClass(item.event_type)}>{typeLabels[item.event_type]}</span>
                    <span className="rounded-full border border-white/7 px-2 py-1 text-[10px] text-slate-600">{item.source}</span>
                  </div>
                  {item.description && <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{item.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                    <span title={new Date(item.occurred_at).toLocaleString()}>{formatRelative(item.occurred_at)} · {new Date(item.occurred_at).toLocaleString()}</span>
                    <span>{hostName(item.host_id)}</span>
                    {item.external_ref && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/10 bg-cyan-400/5 px-2 py-1 font-mono text-cyan-300">
                        <ExternalLink className="h-3 w-3" />{item.external_ref}
                      </span>
                    )}
                  </div>
                </div>
                {item.external_ref && item.source !== "manual" && (
                  <div className="shrink-0 text-[11px] text-slate-600">Source: {item.source}</div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-white">Record operational change</div>
                <div className="mt-1 text-xs text-slate-600">This event becomes available to incident evidence correlation.</div>
              </div>
              <button onClick={() => setShowCreate(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-2 block text-xs text-slate-500">Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deploy API release 2026.09.23" className="w-full rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30" /></label>
              <label><span className="mb-2 block text-xs text-slate-500">Type</span><select value={eventType} onChange={(e) => setEventType(e.target.value as ChangeEventType)} className="w-full rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none">{changeTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
              <label><span className="mb-2 block text-xs text-slate-500">Host</span><select value={hostId} onChange={(e) => setHostId(e.target.value)} className="w-full rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none"><option value="">System / all hosts</option>{hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}</select></label>
              <label><span className="mb-2 block text-xs text-slate-500">Source</span><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="github-actions" className="w-full rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30" /></label>
              <label><span className="mb-2 block text-xs text-slate-500">External reference</span><input value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="run-8421 / PR-123 / release-id" className="w-full rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-xs text-slate-500">Occurred at (optional)</span><input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="w-full rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-300/30" /></label>
              <label className="sm:col-span-2"><span className="mb-2 block text-xs text-slate-500">Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What changed and why?" className="w-full resize-none rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-cyan-300/30" /></label>
              <div className="sm:col-span-2 flex justify-end gap-2 border-t border-white/6 pt-4">
                <button onClick={() => setShowCreate(false)} className="rounded-xl border border-white/8 px-4 py-2.5 text-sm text-slate-400">Cancel</button>
                <button disabled={saving || !title.trim()} onClick={() => void createChange()} className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40">{saving ? "Recording…" : "Record change"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Changes;
