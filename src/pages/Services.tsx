import React, { useEffect, useMemo, useState } from "react";
import { Boxes, GitBranch, Network, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { Service, ServiceDependency, TopologyResponse } from "../types/app.js";
import { api } from "../services/api.js";

type Tab = "registry" | "topology";

export const Services: React.FC = () => {
  const [tab, setTab] = useState<Tab>("registry");
  const [services, setServices] = useState<Service[]>([]);
  const [topology, setTopology] = useState<TopologyResponse | null>(null);
  const [dependencies, setDependencies] = useState<Record<string, ServiceDependency[]>>({});
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [targetServiceId, setTargetServiceId] = useState("");
  const [relationship, setRelationship] = useState("depends_on");
  const [criticality, setCriticality] = useState<ServiceDependency["criticality"]>("normal");
  const [name, setName] = useState("Telemetry API");
  const [environment, setEnvironment] = useState("production");
  const [description, setDescription] = useState("Primary telemetry and observability service.");
  const [editing, setEditing] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadServices() {
    try {
      setLoading(true);
      setError(null);
      const rows = await api.getServices();
      setServices(rows);
      setSelectedService((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
      const entries = await Promise.all(rows.map(async (service) => [service.id, await api.getServiceDependencies(service.id)] as const));
      const next: Record<string, ServiceDependency[]> = {};
      for (const [id, items] of entries) next[id] = items;
      setDependencies(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load services.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTopology() {
    try {
      const result = await api.getTopology();
      setTopology(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load service topology.");
    }
  }

  useEffect(() => { void loadServices(); void loadTopology(); }, []);

  async function createService() {
    if (!name.trim()) return;
    setBusy("create");
    setError(null);
    try {
      const created = await api.createService({ name: name.trim(), environment: environment.trim() || "production", description: description.trim() || null });
      setServices((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedService(created.id);
      setName("");
      setEnvironment("production");
      setDescription("");
      setNotice("Service registered.");
      await loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create service.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy("edit:" + editing.id);
    setError(null);
    try {
      const updated = await api.updateService(editing.id, { name: editing.name.trim(), environment: editing.environment.trim(), description: editing.description ?? null });
      setServices((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setEditing(null);
      setNotice("Service updated.");
      await loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update service.");
    } finally {
      setBusy(null);
    }
  }

  async function removeService(service: Service) {
    if (!window.confirm('Delete service "' + service.name + '"?')) return;
    setBusy("delete:" + service.id);
    setError(null);
    try {
      await api.deleteService(service.id);
      setServices((rows) => rows.filter((row) => row.id !== service.id));
      setSelectedService((current) => current === service.id ? null : current);
      setNotice("Service deleted.");
      await loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete service.");
    } finally {
      setBusy(null);
    }
  }

  async function addDependency() {
    if (!selectedService || !targetServiceId || selectedService === targetServiceId) return;
    setBusy("dependency:add");
    setError(null);
    try {
      const created = await api.addServiceDependency(selectedService, { target_service_id: targetServiceId, relationship, criticality });
      setDependencies((current) => ({ ...current, [selectedService]: [...(current[selectedService] ?? []), created] }));
      setTargetServiceId("");
      setNotice("Dependency added.");
      await loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add dependency.");
    } finally {
      setBusy(null);
    }
  }

  async function removeDependency(dep: ServiceDependency) {
    setBusy("dependency:" + dep.target_service_id);
    setError(null);
    try {
      await api.deleteServiceDependency(dep.source_service_id, dep.target_service_id);
      setDependencies((current) => ({ ...current, [dep.source_service_id]: (current[dep.source_service_id] ?? []).filter((item) => item.target_service_id !== dep.target_service_id) }));
      setNotice("Dependency removed.");
      await loadTopology();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove dependency.");
    } finally {
      setBusy(null);
    }
  }

  const serviceLookup = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  function graphPoint(index: number, count: number) {
    const cx = 480;
    const cy = 210;
    const radius = count <= 1 ? 0 : Math.min(170, 48 + count * 16);
    const angle = -Math.PI / 2 + (index * (2 * Math.PI)) / Math.max(1, count);
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Service topology</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Services & dependencies</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Register services, model dependencies, and inspect the backend-generated dependency graph.</p></div>
        <button onClick={() => { void loadServices(); void loadTopology(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 disabled:opacity-40"><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh</button>
      </div>
      {(error || notice) && <div role="alert" className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>{error || notice}</div>}

      <div className="flex flex-wrap gap-2 border-b border-white/6 pb-3">
        <button onClick={() => setTab("registry")} className={"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs " + (tab === "registry" ? "bg-cyan-300 text-slate-950" : "border border-white/8 text-slate-400")}><Boxes className="h-3.5 w-3.5" />Service registry</button>
        <button onClick={() => setTab("topology")} className={"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs " + (tab === "topology" ? "bg-cyan-300 text-slate-950" : "border border-white/8 text-slate-400")}><Network className="h-3.5 w-3.5" />Topology graph</button>
      </div>

      {tab === "registry" && <>
        <section className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Register service</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_1.5fr_auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Checkout API" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
            <input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="production" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Service description" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" />
            <button onClick={() => void createService()} disabled={busy === "create"} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy === "create" ? "Registering…" : "Register"}</button>
          </div>
        </section>

        {editing && <section className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-5">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-white"><Pencil className="h-4 w-4 text-cyan-300" />Edit service</div><button onClick={() => setEditing(null)}><X className="h-4 w-4 text-slate-500" /></button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" /><input value={editing.environment} onChange={(e) => setEditing({ ...editing, environment: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" /><input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white" /></div>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded-xl border border-white/8 px-4 py-2.5 text-xs text-slate-400">Cancel</button><button onClick={() => void saveEdit()} disabled={busy === "edit:" + editing.id} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950"><Save className="h-3.5 w-3.5" />Save</button></div>
        </section>}

        <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
          <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Services</div>
          {loading ? <div className="p-8 text-sm text-slate-500">Loading services…</div> : services.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No services registered.</div> :
            <div className="divide-y divide-white/6">{services.map((service) => <div key={service.id} className={"px-5 py-5 " + (selectedService === service.id ? "bg-cyan-300/[0.025]" : "")}><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><button onClick={() => setSelectedService(service.id)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-cyan-300" /><span className="text-sm font-medium text-white">{service.name}</span><span className="rounded-full border border-white/8 px-2 py-1 text-[10px] text-slate-500">{service.environment}</span></div>{service.description && <div className="mt-2 text-xs text-slate-600">{service.description}</div>}<div className="mt-2 text-xs text-slate-600">{(dependencies[service.id] ?? []).length} outbound dependencies</div></button><div className="flex gap-2"><button onClick={() => setEditing(service)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400"><Pencil className="h-3.5 w-3.5" />Edit</button><button onClick={() => void removeService(service)} disabled={busy === "delete:" + service.id} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/15 px-3 py-2 text-xs text-rose-300"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></div></div>)}</div>}
        </section>

        {selectedService && <section className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-sm font-medium text-white">Dependencies from {serviceLookup.get(selectedService)?.name ?? selectedService}</div><div className="mt-1 text-xs text-slate-600">Cycle prevention is enforced by the backend.</div></div><div className="grid gap-2 sm:grid-cols-3"><select value={targetServiceId} onChange={(e) => setTargetServiceId(e.target.value)} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-xs text-white"><option value="">Target service</option>{services.filter((service) => service.id !== selectedService).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><input value={relationship} onChange={(e) => setRelationship(e.target.value)} className="rounded-xl border border-white/8 bg-black/10 px-3 py-2.5 text-xs text-white" placeholder="depends_on" /><select value={criticality} onChange={(e) => setCriticality(e.target.value as ServiceDependency["criticality"])} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-2.5 text-xs text-white"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select><button onClick={() => void addDependency()} disabled={!targetServiceId || busy === "dependency:add"} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950">Add dependency</button></div></div>
          <div className="mt-5">{(dependencies[selectedService] ?? []).length === 0 ? <div className="text-xs text-slate-600">No outbound dependencies.</div> : <div className="space-y-2">{dependencies[selectedService].map((dep) => <div key={dep.target_service_id} className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[0.02] px-4 py-3"><div className="text-xs text-slate-400">{serviceLookup.get(dep.target_service_id)?.name ?? dep.target_service_id} <span className="text-slate-600">· {dep.relationship} · {dep.criticality}</span></div><button onClick={() => void removeDependency(dep)} disabled={busy === "dependency:" + dep.target_service_id} className="text-slate-600 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div>
        </section>}
      </>}

      {tab === "topology" && <section className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
        {!topology ? <div className="p-8 text-sm text-slate-500">Loading topology…</div> : topology.nodes.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No services in the dependency graph.</div> :
          (() => {
            const points = new Map(topology.nodes.map((node, index) => [node.id, graphPoint(index, topology.nodes.length)]));
            return <div className="overflow-x-auto"><svg viewBox="0 0 960 420" className="min-w-[760px] w-full" role="img" aria-label="Service dependency topology">
              <defs><marker id="topology-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L8,3 z" className="fill-cyan-300/50" /></marker></defs>
              {topology.edges.map((edge, index) => { const from = points.get(edge.source); const to = points.get(edge.target); if (!from || !to) return null; return <line key={edge.source + edge.target + index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" className={edge.criticality === "critical" ? "text-rose-300/70" : edge.criticality === "high" ? "text-amber-300/70" : "text-cyan-300/35"} strokeWidth={edge.criticality === "critical" ? 2.5 : 1.5} markerEnd="url(#topology-arrow)" />; })}
              {topology.nodes.map((node, index) => { const point = points.get(node.id)!; return <g key={node.id} transform={"translate(" + point.x + "," + point.y + ")"}><circle r="34" className="fill-slate-950 stroke-cyan-300/30" strokeWidth="2" /><text y="-4" textAnchor="middle" className="fill-white text-[11px] font-semibold">{node.name.length > 16 ? node.name.slice(0, 15) + "…" : node.name}</text><text y="12" textAnchor="middle" className="fill-slate-500 text-[9px]">{node.environment}</text><text y="50" textAnchor="middle" className="fill-slate-600 text-[9px]">{node.incoming_dependencies} in · {node.outgoing_dependencies} out</text></g>; })}
            </svg></div>;
          })()}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600"><span><span className="inline-block h-2 w-2 rounded-full bg-cyan-300/60" /> normal</span><span><span className="inline-block h-2 w-2 rounded-full bg-amber-300" /> high</span><span><span className="inline-block h-2 w-2 rounded-full bg-rose-300" /> critical</span><span>Generated {topology && new Date(topology.generated_at).toLocaleString()}</span></div>
      </section>}
    </main>
  );
};

export default Services;
