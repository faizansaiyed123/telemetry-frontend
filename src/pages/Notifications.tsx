import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Edit3, FlaskConical, Plus, RefreshCw, RotateCcw, Save, Trash2, X, Zap } from "lucide-react";
import type { NotificationChannel, NotificationDelivery, Severity } from "../types/app.js";
import { api } from "../services/api.js";

const EVENT_TYPES = ["alert.created", "alert.resolved", "incident.created", "incident.resolved"] as const;
const SEVERITIES: Severity[] = ["INFO", "WARNING", "CRITICAL"];

type Draft = {
  name: string;
  url: string;
  event_types: string[];
  min_severity: Severity;
  enabled: boolean;
};

const emptyDraft: Draft = {
  name: "Production webhook",
  url: "https://example.com/webhooks/telemetry",
  event_types: [...EVENT_TYPES],
  min_severity: "WARNING",
  enabled: true,
};

function DeliveryStatus({ status }: { status: NotificationDelivery["status"] }) {
  const tone = status === "delivered"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    : status === "failed"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
      : "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return <span className={"rounded-full border px-2 py-1 text-[10px] " + tone}>{status}</span>;
}

export const Notifications: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<NotificationChannel | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<NotificationDelivery["status"] | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [channelRows, deliveryRows] = await Promise.all([
        api.getNotificationChannels(),
        api.getNotificationDeliveries({
          status: deliveryFilter === "all" ? undefined : deliveryFilter,
          limit: 200,
        }),
      ]);
      setChannels(channelRows);
      setDeliveries(deliveryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notification channels.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [deliveryFilter]);

  function toggleEvent(eventType: string) {
    setDraft((current) => ({
      ...current,
      event_types: current.event_types.includes(eventType)
        ? current.event_types.filter((item) => item !== eventType)
        : [...current.event_types, eventType],
    }));
  }

  async function create() {
    if (!draft.name.trim() || !draft.url.trim() || draft.event_types.length === 0) {
      setError("Name, webhook URL, and at least one event type are required.");
      return;
    }
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      const created = await api.createNotificationChannel({
        ...draft,
        name: draft.name.trim(),
        url: draft.url.trim(),
      });
      setChannels((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(emptyDraft);
      setNotice("Notification channel created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create notification channel.");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(channel: NotificationChannel) {
    setEditing(channel);
    setError(null);
    setNotice(null);
  }

  async function saveEdit() {
    if (!editing || !editing.name.trim() || !editing.url.trim() || editing.event_types.length === 0) return;
    setBusy("edit:" + editing.id);
    setError(null);
    try {
      const updated = await api.updateNotificationChannel(editing.id, {
        name: editing.name.trim(),
        url: editing.url.trim(),
        event_types: editing.event_types,
        min_severity: editing.min_severity,
        enabled: editing.enabled,
      });
      setChannels((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setEditing(null);
      setNotice("Notification channel updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification channel.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(channel: NotificationChannel) {
    if (!window.confirm('Delete notification channel "' + channel.name + '"?')) return;
    setBusy("delete:" + channel.id);
    setError(null);
    try {
      await api.deleteNotificationChannel(channel.id);
      setChannels((rows) => rows.filter((row) => row.id !== channel.id));
      setNotice("Notification channel deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete notification channel.");
    } finally {
      setBusy(null);
    }
  }

  async function test(channel: NotificationChannel) {
    setBusy("test:" + channel.id);
    setError(null);
    setNotice(null);
    try {
      const result = await api.testNotificationChannel(channel.id);
      setNotice("Test notification queued as delivery " + result.delivery_id + ".");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to queue test notification.");
    } finally {
      setBusy(null);
    }
  }

  async function retry(delivery: NotificationDelivery) {
    setBusy("retry:" + delivery.id);
    setError(null);
    try {
      await api.retryNotificationDelivery(delivery.id);
      setNotice("Failed delivery queued for retry.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retry delivery.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Automation</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Notification channels</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage signed webhook destinations and inspect durable delivery history.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40">
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh
        </button>
      </div>

      {(error || notice) && <div role="alert" className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>{error || notice}</div>}

      <section className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Create webhook channel</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Production alerts" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
          <input value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://example.com/webhook" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30 xl:col-span-2" />
          <select value={draft.min_severity} onChange={(e) => setDraft((d) => ({ ...d, min_severity: e.target.value as Severity }))} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">
            {SEVERITIES.map((value) => <option key={value} value={value}>Minimum {value}</option>)}
          </select>
          <div className="md:col-span-2 xl:col-span-3">
            <div className="mb-2 text-xs text-slate-500">Events</div>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((value) => <button type="button" key={value} onClick={() => toggleEvent(value)} className={"rounded-full border px-3 py-1.5 text-xs " + (draft.event_types.includes(value) ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : "border-white/8 text-slate-500")}>{value}</button>)}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} />Enabled after creation</label><button onClick={() => void create()} disabled={busy === "create"} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy === "create" ? "Creating…" : "Create channel"}</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">The backend validates webhook destinations, signs payloads, and persists delivery attempts.</p>
      </section>

      {editing && (
        <section className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-5">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-white"><Edit3 className="h-4 w-4 text-cyan-300" />Edit {editing.name}</div><button onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
            <input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white xl:col-span-2" />
            <select value={editing.min_severity} onChange={(e) => setEditing({ ...editing, min_severity: e.target.value as Severity })} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">{SEVERITIES.map((value) => <option key={value} value={value}>Minimum {value}</option>)}</select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{EVENT_TYPES.map((value) => <button type="button" key={value} onClick={() => setEditing({ ...editing, event_types: editing.event_types.includes(value) ? editing.event_types.filter((v) => v !== value) : [...editing.event_types, value] })} className={"rounded-full border px-3 py-1.5 text-xs " + (editing.event_types.includes(value) ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : "border-white/8 text-slate-500")}>{value}</button>)}</div>
          <label className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />Enabled</label>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="inline-flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-xs text-slate-400"><X className="h-3.5 w-3.5" />Cancel</button><button onClick={() => void saveEdit()} disabled={busy === "edit:" + editing.id} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950"><Save className="h-3.5 w-3.5" />Save</button></div>
        </section>
      )}

      <section className="rounded-2xl border border-white/7 bg-slate-900/50 overflow-hidden">
        <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Channels</div>
        {loading ? <div className="p-8 text-sm text-slate-500">Loading notification channels…</div> : channels.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No notification channels configured.</div> :
          <div className="divide-y divide-white/6">{channels.map((channel) => <div key={channel.id} className="px-5 py-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Bell className="h-4 w-4 text-cyan-300" /><span className="text-sm font-medium text-white">{channel.name}</span><span className={"rounded-full border px-2 py-1 text-[10px] " + (channel.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/8 text-slate-500")}>{channel.enabled ? "Enabled" : "Disabled"}</span></div><div className="mt-2 break-all font-mono text-xs text-slate-600">{channel.url}</div><div className="mt-2 flex flex-wrap gap-2">{channel.event_types.map((event) => <span key={event} className="rounded-full border border-white/7 px-2 py-1 text-[10px] text-slate-500">{event}</span>)}<span className="rounded-full border border-white/7 px-2 py-1 text-[10px] text-slate-500">min {channel.min_severity}</span></div></div><div className="flex flex-wrap gap-2"><button onClick={() => void test(channel)} disabled={!channel.enabled || busy === "test:" + channel.id} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"><FlaskConical className="h-3.5 w-3.5" />{busy === "test:" + channel.id ? "Queueing…" : "Test"}</button><button onClick={() => startEdit(channel)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400"><Edit3 className="h-3.5 w-3.5" />Edit</button><button onClick={() => void remove(channel)} disabled={busy === "delete:" + channel.id} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/15 px-3 py-2 text-xs text-rose-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></div></div>)}</div>}
      </section>

      <section className="rounded-2xl border border-white/7 bg-slate-900/50 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4"><div><div className="flex items-center gap-2 text-sm font-medium text-white"><Zap className="h-4 w-4 text-cyan-300" />Delivery history</div><div className="mt-1 text-xs text-slate-600">Durable webhook delivery attempts and replayable failures.</div></div><select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value as typeof deliveryFilter)} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-2 text-xs text-white"><option value="all">All</option><option value="pending">Pending</option><option value="delivering">Delivering</option><option value="delivered">Delivered</option><option value="failed">Failed</option></select></div>
        {loading ? <div className="p-8 text-sm text-slate-500">Loading delivery history…</div> : deliveries.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No deliveries match the current filter.</div> :
          <div className="divide-y divide-white/6">{deliveries.map((delivery) => <div key={delivery.id} className="px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><DeliveryStatus status={delivery.status} /><span className="font-mono text-xs text-slate-400">{delivery.event_type}</span><span className="text-xs text-slate-600">{delivery.event_id}</span></div><div className="mt-2 text-xs text-slate-600">Attempts {delivery.attempts}{delivery.last_status_code != null ? " · HTTP " + delivery.last_status_code : ""}{delivery.delivered_at ? " · delivered " + new Date(delivery.delivered_at).toLocaleString() : ""}</div>{delivery.last_error && <div className="mt-2 text-xs text-rose-300">{delivery.last_error}</div>}</div>{delivery.status === "failed" && <button onClick={() => void retry(delivery)} disabled={busy === "retry:" + delivery.id} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-xs text-amber-200 disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" />{busy === "retry:" + delivery.id ? "Queueing…" : "Retry"}</button>}</div></div>)}</div>}
      </section>
    </main>
  );
};

export default Notifications;
