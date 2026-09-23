import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  GitBranch,
  History,
  LoaderCircle,
  Plus,
  RefreshCw,
  Server,
  Tag,
  Wrench,
} from "lucide-react";
import type { AuthUser, ChangeEvent, Host } from "../types/app.js";
import { api } from "../services/api.js";

const eventTypes: Array<{
  value: ChangeEvent["event_type"];
  label: string;
  icon: typeof GitBranch;
}> = [
  { value: "deployment", label: "Deployment", icon: GitBranch },
  { value: "rollback", label: "Rollback", icon: History },
  { value: "config", label: "Configuration", icon: Wrench },
  { value: "feature_flag", label: "Feature flag", icon: Tag },
  { value: "maintenance", label: "Maintenance", icon: CalendarClock },
  { value: "other", label: "Other", icon: Clock3 },
];

function typeMeta(value: ChangeEvent["event_type"]) {
  return eventTypes.find((item) => item.value === value) ?? eventTypes[eventTypes.length - 1];
}

function formatRelativeTime(value: string): string {
  const delta = Date.now() - Date.parse(value);
  const seconds = Math.max(0, Math.floor(delta / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days + "d ago";
}

export const Changes: React.FC<{ user: AuthUser }> = ({ user }) => {
  const canCreate = user.role === "admin" || user.role === "operator";
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostFilter, setHostFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<ChangeEvent["event_type"] | "all">("all");
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [eventType, setEventType] = useState<ChangeEvent["event_type"]>("deployment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [occurredAt, setOccurredAt] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setEvents(await api.getChangeEvents(hostFilter === "all" ? undefined : hostFilter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load change events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.getHosts()
      .then(setHosts)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load hosts."));
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [hostFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => typeFilter === "all" || event.event_type === typeFilter);
  }, [events, typeFilter]);

  async function createEvent() {
    if (!title.trim()) {
      setError("Give the change event a title.");
      return;
    }
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const created = await api.createChangeEvent({
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || undefined,
        host_id: hostFilter === "all" ? undefined : hostFilter,
        source: "manual",
        external_ref: externalRef.trim() || undefined,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      });
      setEvents((items) => [created, ...items]);
      setTitle("");
      setDescription("");
      setExternalRef("");
      setOccurredAt("");
      setNotice("Change event recorded and added to the operational timeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create change event.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Operational context</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Change events</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Record deployments, configuration changes, rollbacks, and maintenance so incidents can be investigated against what changed around the same time.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40"
        >
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label className="rounded-2xl border border-white/7 bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Host</div>
          <select
            value={hostFilter}
            onChange={(event) => setHostFilter(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/30"
          >
            <option value="all">All hosts</option>
            {hosts.map((host) => (
              <option key={host.id} value={host.id}>{host.name} · {host.environment}</option>
            ))}
          </select>
        </label>

        <label className="rounded-2xl border border-white/7 bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Event type</div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            className="mt-2 w-full rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/30"
          >
            <option value="all">All changes</option>
            {eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Visible</div>
          <div className="mt-2 text-2xl font-semibold text-cyan-300">{filteredEvents.length}</div>
          <div className="text-xs text-slate-600">of {events.length} loaded</div>
        </div>
      </div>

      {canCreate && (
        <section className="rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.025] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10">
              <Plus className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">Record a change</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                These events become part of incident evidence and are auditable operator actions.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value as ChangeEvent["event_type"])}
              className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"
            >
              {eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>

            <select
              value={hostFilter === "all" ? "" : hostFilter}
              onChange={(event) => setHostFilter(event.target.value || "all")}
              className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white"
            >
              <option value="">System-wide</option>
              {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
            </select>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Deploy telemetry-api v1.4.2"
              maxLength={200}
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30 xl:col-span-2"
            />

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What changed and why?"
              rows={3}
              maxLength={2000}
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30 md:col-span-2"
            />

            <input
              value={externalRef}
              onChange={(event) => setExternalRef(event.target.value)}
              placeholder="Release / ticket / commit reference"
              maxLength={256}
              className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30"
            />

            <label className="rounded-xl border border-white/8 bg-black/10 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">Occurred at</div>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className="mt-1 w-full bg-transparent text-xs text-slate-300 outline-none"
              />
            </label>

            <button
              onClick={() => void createEvent()}
              disabled={working || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
            >
              {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {working ? "Recording…" : "Record change"}
            </button>
          </div>
        </section>
      )}

      {(error || notice) && (
        <div
          role="alert"
          className={
            "rounded-xl border px-4 py-3 text-sm " +
            (error
              ? "border-rose-500/15 bg-rose-500/5 text-rose-300"
              : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")
          }
        >
          <div className="flex items-center gap-2">
            {error ? <RefreshCw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{error || notice}</span>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        <div className="border-b border-white/6 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <GitBranch className="h-4 w-4 text-cyan-300" />
                Operational timeline
              </div>
              <div className="mt-1 text-xs text-slate-600">Newest changes first · up to 200 events from the backend</div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Server className="h-3.5 w-3.5" />
              <span>Used by incident correlation</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-600">
            <LoaderCircle className="h-4 w-4 animate-spin" />Loading change history…
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <GitBranch className="mx-auto h-7 w-7 text-slate-700" />
            <div className="mt-3 text-sm font-medium text-white">No change events match the current filter</div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Record a deployment or configuration change here, then inspect it from an incident's evidence timeline.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {filteredEvents.map((event) => {
              const meta = typeMeta(event.event_type);
              const Icon = meta.icon;
              return (
                <article key={event.id} className="px-5 py-5">
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-300/[0.06]">
                      <Icon className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{event.title}</h3>
                        <span className="rounded-full border border-white/8 px-2 py-1 text-[10px] text-slate-400">{meta.label}</span>
                        <span className="rounded-full border border-white/8 px-2 py-1 text-[10px] text-slate-600">{event.source}</span>
                      </div>
                      {event.description && <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{event.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span>{new Date(event.occurred_at).toLocaleString()}</span>
                        <span>{formatRelativeTime(event.occurred_at)}</span>
                        {event.external_ref && <span className="rounded-full border border-white/7 px-2 py-1 font-mono text-[10px] text-slate-500">{event.external_ref}</span>}
                        {event.host_id && <span className="font-mono">host {event.host_id}</span>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Changes;
