import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, GitBranch, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import type { AuthUser, ChangeEvent, ChangeEventCreate, ChangeEventType, Host } from "../types/app.js";
import { api } from "../services/api.js";

const eventTypes: Array<{ value: ChangeEventType; label: string }> = [
  { value: "deployment", label: "Deployment" },
  { value: "config", label: "Configuration" },
  { value: "feature_flag", label: "Feature flag" },
  { value: "maintenance", label: "Maintenance" },
  { value: "rollback", label: "Rollback" },
  { value: "other", label: "Other" },
];

function eventTypeLabel(value: string): string {
  return eventTypes.find((item) => item.value === value)?.label ?? value;
}

function relativeAge(timestamp: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(timestamp)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return String(minutes) + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return String(hours) + "h ago";
  const days = Math.floor(hours / 24);
  return String(days) + "d ago";
}

export const Changes: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostId, setHostId] = useState("");
  const [filterHostId, setFilterHostId] = useState("");
  const [eventType, setEventType] = useState<ChangeEventType>("deployment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("manual");
  const [externalRef, setExternalRef] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canCreate = user.role === "admin" || user.role === "operator";

  async function loadEvents(nextHostId = filterHostId) {
    try {
      setLoading(true);
      setError(null);
      setEvents(await api.getChangeEvents(nextHostId || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load change events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([
      api.getHosts().then(setHosts),
      api.getChangeEvents(),
    ])
      .then(([, rows]) => setEvents(rows))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load change history."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadEvents(filterHostId);
  }, [filterHostId]);

  const hostName = useMemo(
    () => new Map(hosts.map((host) => [host.id, host.name])),
    [hosts],
  );

  async function create() {
    if (title.trim().length < 3) {
      setError("Change title must be at least 3 characters.");
      return;
    }

    const payload: ChangeEventCreate = {
      event_type: eventType,
      title: title.trim(),
      description: description.trim() || null,
      host_id: hostId || null,
      source: source.trim() || "manual",
      external_ref: externalRef.trim() || null,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
    };

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.createChangeEvent(payload);
      if (!filterHostId || filterHostId === created.host_id) {
        setEvents((current) => [created, ...current]);
      }
      setTitle("");
      setDescription("");
      setExternalRef("");
      setOccurredAt("");
      setNotice("Change event recorded and available for incident correlation.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record change event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Operations</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Change journal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Record deployments, configuration changes, maintenance, and rollbacks so incidents have operational context instead of isolated metrics.
          </p>
        </div>
        <button
          onClick={() => void loadEvents()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40"
        >
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh
        </button>
      </div>

      {canCreate ? (
        <section className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4 text-cyan-300" />Record a change
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Deploy payments-api v2.4.1"
              aria-label="Change title"
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30 xl:col-span-2"
            />
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value as ChangeEventType)}
              aria-label="Change type"
              className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"
            >
              {eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select
              value={hostId}
              onChange={(event) => setHostId(event.target.value)}
              aria-label="Affected host"
              className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"
            >
              <option value="">Platform-wide</option>
              {hosts.filter((host) => host.is_active).map((host) => <option key={host.id} value={host.id}>{host.name} · {host.environment}</option>)}
            </select>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What changed and why?"
              aria-label="Change description"
              rows={3}
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30 md:col-span-2"
            />
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="manual / ci / deploy"
              aria-label="Change source"
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30"
            />
            <input
              value={externalRef}
              onChange={(event) => setExternalRef(event.target.value)}
              placeholder="PR-184 / release-2.4.1"
              aria-label="External reference"
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30"
            />
            <input
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              type="datetime-local"
              aria-label="Change occurred time"
              className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
              Operator/admin actions are written to the backend audit trail and become eligible for incident correlation.
            </div>
            <button
              onClick={() => void create()}
              disabled={saving || title.trim().length < 3}
              className="rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
            >
              {saving ? "Recording…" : "Record change"}
            </button>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.03] px-5 py-4 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mr-2 inline h-3.5 w-3.5 text-cyan-300" />
          Viewer access is read-only. Operators and administrators can record operational changes.
        </div>
      )}

      {(error || notice) && (
        <div className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>
          {error || notice}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        <div className="flex flex-col gap-3 border-b border-white/6 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent changes</div>
            <div className="mt-1 text-xs text-slate-700">Newest operational context first · capped by the backend for bounded queries.</div>
          </div>
          <select
            value={filterHostId}
            onChange={(event) => setFilterHostId(event.target.value)}
            aria-label="Filter changes by host"
            className="rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-xs text-white"
          >
            <option value="">All hosts</option>
            {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading change journal…</div>
        ) : events.length === 0 ? (
          <div className="p-10 text-center">
            <GitBranch className="mx-auto h-7 w-7 text-slate-700" />
            <div className="mt-3 text-sm font-medium text-white">No change events recorded</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Record a deployment, configuration change, or rollback to give future incidents better operational context.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {events.map((event) => (
              <article key={event.id} className="px-5 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/5 text-cyan-300">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium text-white">{event.title}</h2>
                        <span className="rounded-full border border-white/8 px-2 py-1 text-[10px] text-slate-500">{eventTypeLabel(event.event_type)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span>{event.host_id ? (hostName.get(event.host_id) ?? event.host_id) : "Platform-wide"}</span>
                        <span>{event.source}</span>
                        <span>{relativeAge(event.occurred_at)}</span>
                        <span>{new Date(event.occurred_at).toLocaleString()}</span>
                      </div>
                      {event.description && <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">{event.description}</p>}
                      {event.external_ref && <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/7 bg-black/10 px-3 py-2 font-mono text-[11px] text-slate-500"><CalendarClock className="h-3.5 w-3.5" />{event.external_ref}</div>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-slate-700">
                    Recorded {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 text-[11px] leading-5 text-slate-700">
        <Check className="h-3.5 w-3.5 text-emerald-300" />
        Change timestamps are correlated server-side with incident windows; they are context signals, not automatic root-cause assertions.
      </div>
    </main>
  );
};

export default Changes;
