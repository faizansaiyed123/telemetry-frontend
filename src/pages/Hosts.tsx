import React, { useEffect, useState } from "react";
import { Boxes, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { AuthUser, Host } from "../types/app.js";
import { api } from "../services/api.js";

export const Hosts: React.FC<{ user: AuthUser }> = ({ user }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEnvironment, setEditingEnvironment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setHosts(await api.getHosts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load hosts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const host = await api.createHost({ name: name.trim(), environment: environment.trim() || "production" });
      setHosts((current) => [...current, host].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setEnvironment("production");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create host");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(host: Host) {
    setEditingId(host.id);
    setEditingName(host.name);
    setEditingEnvironment(host.environment);
    setError(null);
  }

  async function saveEdit(host: Host) {
    if (!editingName.trim() || !editingEnvironment.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateHost(host.id, {
        name: editingName.trim(),
        environment: editingEnvironment.trim(),
      });
      setHosts((current) => current.map((item) => item.id === host.id ? updated : item).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update host");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(host: Host) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateHost(host.id, { is_active: !host.is_active });
      setHosts((current) => current.map((item) => item.id === host.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update host");
    } finally {
      setSaving(false);
    }
  }

  async function remove(host: Host) {
    if (!window.confirm('Remove host "' + host.name + '"?')) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteHost(host.id);
      setHosts((current) => current.filter((item) => item.id !== host.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete host");
    } finally {
      setSaving(false);
    }
  }

  const canManage = user.role === "admin";

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Infrastructure</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Hosts</h1>
          <p className="mt-2 text-sm text-slate-500">Manage monitored sources registered with the platform.</p>
        </div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40" disabled={loading}>
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh
        </button>
      </div>

      {canManage && (
        <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Add host</div>
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="api-prod-01" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
            <input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="production" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
            <button disabled={saving || !name.trim()} onClick={() => void create()} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{saving ? "Adding…" : "Add host"}</button>
          </div>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
        {loading ? <div className="p-8 text-sm text-slate-500">Loading hosts…</div> :
          hosts.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No hosts registered yet.</div> :
          <div className="divide-y divide-white/6">
            {hosts.map((host) => (
              <div key={host.id} className="px-5 py-5">
                {editingId === host.id ? (
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/5"><Boxes className="h-4 w-4 text-cyan-300" /></div>
                    <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/8 bg-black/10 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/30" aria-label="Host name" />
                    <input value={editingEnvironment} onChange={(e) => setEditingEnvironment(e.target.value)} className="lg:w-48 rounded-xl border border-white/8 bg-black/10 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/30" aria-label="Host environment" />
                    <div className="flex gap-2">
                      <button disabled={saving || !editingName.trim() || !editingEnvironment.trim()} onClick={() => void saveEdit(host)} className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-40"><Save className="h-3.5 w-3.5" />Save</button>
                      <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-4 py-2.5 text-xs text-slate-400"><X className="h-3.5 w-3.5" />Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/5"><Boxes className="h-4 w-4 text-cyan-300" /></div>
                      <div><div className="text-sm font-medium text-white">{host.name}</div><div className="mt-1 text-xs text-slate-600">{host.environment}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={"rounded-full border px-3 py-1.5 text-xs " + (host.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/8 text-slate-500")}>{host.is_active ? "Active" : "Inactive"}</span>
                      {canManage && <button disabled={saving} onClick={() => startEdit(host)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-40"><Pencil className="h-3.5 w-3.5" />Edit</button>}
                      {canManage && <button disabled={saving} onClick={() => void toggle(host)} className="rounded-lg border border-white/8 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-40">{host.is_active ? "Deactivate" : "Activate"}</button>}
                      {canManage && <button disabled={saving} onClick={() => void remove(host)} className="rounded-lg p-2 text-slate-600 hover:text-rose-300 disabled:opacity-40" title="Delete host"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>}
      </div>
    </main>
  );
};

export default Hosts;
