import React, { useEffect, useMemo, useState } from "react";
import { Activity, Copy, Database, Gauge, KeyRound, Lock, Plus, RefreshCw, ShieldCheck, Trash2, XCircle } from "lucide-react";
import type { AlertRule, ApiKey, ApiKeyCreated, AuditLog, Host, PlatformMetrics } from "../types/app.js";
import { api } from "../services/api.js";

type Tab = "runtime" | "rules" | "agents" | "audit";

const metrics: Array<{ key: AlertRule["metric"]; label: string; defaultThreshold: string }> = [
  { key: "cpu", label: "CPU", defaultThreshold: "90" },
  { key: "memory", label: "Memory", defaultThreshold: "90" },
  { key: "temperature", label: "Temperature", defaultThreshold: "80" },
  { key: "network_mbps", label: "Network", defaultThreshold: "900" },
  { key: "requests_per_second", label: "Requests / sec", defaultThreshold: "100" },
  { key: "error_rate", label: "Error rate", defaultThreshold: "5" },
  { key: "latency_ms", label: "Latency", defaultThreshold: "200" },
];

const operators: AlertRule["operator"][] = [">", ">=", "<", "<="];

function metricLabel(metric: string): string {
  return metrics.find((item) => item.key === metric)?.label ?? metric;
}

function formatUptime(seconds: number): string {
  const value = Math.max(0, Math.round(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = value % 60;
  if (hours) return String(hours) + "h " + String(minutes) + "m";
  if (minutes) return String(minutes) + "m " + String(secs) + "s";
  return String(secs) + "s";
}

function compactNumber(value: number): string {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export const Operations: React.FC = () => {
  const [tab, setTab] = useState<Tab>("runtime");
  const [platform, setPlatform] = useState<PlatformMetrics | null>(null);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedHost, setSelectedHost] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState<ApiKeyCreated | null>(null);
  const [keyName, setKeyName] = useState("Windows telemetry agent");
  const [ruleName, setRuleName] = useState("High latency");
  const [ruleMetric, setRuleMetric] = useState<AlertRule["metric"]>("latency_ms");
  const [ruleOperator, setRuleOperator] = useState<AlertRule["operator"]>(">");
  const [ruleThreshold, setRuleThreshold] = useState("200");
  const [ruleDuration, setRuleDuration] = useState("15");
  const [ruleCooldown, setRuleCooldown] = useState("300");
  const [ruleSeverity, setRuleSeverity] = useState<AlertRule["severity"]>("WARNING");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadRuntime() {
    try {
      setPlatform(await api.getPlatformMetrics());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load runtime metrics.");
    }
  }

  async function loadRules() {
    try {
      setRules(await api.getAlertRules());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load alert rules.");
    }
  }

  async function loadAgents() {
    try {
      const [hostRows, keyRows] = await Promise.all([api.getHosts(), api.getApiKeys()]);
      setHosts(hostRows);
      setKeys(keyRows);
      setSelectedHost((current) => current || hostRows[0]?.id || "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load agent access.");
    }
  }

  async function loadAudit() {
    try {
      setAuditLogs(await api.getAuditLogs(200));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit history.");
    }
  }

  useEffect(() => {
    void loadRuntime();
    const timer = window.setInterval(() => void loadRuntime(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setError(null);
    if (tab === "rules") void loadRules();
    if (tab === "agents") void loadAgents();
    if (tab === "audit") void loadAudit();
  }, [tab]);

  const selectedKeys = useMemo(
    () => keys.filter((key) => !selectedHost || key.host_id === selectedHost),
    [keys, selectedHost],
  );

  async function createRule() {
    if (!ruleName.trim()) return;
    const threshold = Number(ruleThreshold);
    const duration = Number(ruleDuration);
    const cooldown = Number(ruleCooldown);
    if (![threshold, duration, cooldown].every(Number.isFinite)) {
      setError("Rule threshold, duration, and cooldown must be valid numbers.");
      return;
    }
    setBusy("rule:create");
    setError(null);
    setNotice(null);
    try {
      const created = await api.createAlertRule({
        name: ruleName.trim(),
        metric: ruleMetric,
        operator: ruleOperator,
        threshold,
        duration_seconds: duration,
        cooldown_seconds: cooldown,
        severity: ruleSeverity,
        enabled: true,
      });
      setRules((rows) => [...rows, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice("Alert rule created and loaded into the live evaluator.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create alert rule.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleRule(rule: AlertRule) {
    setBusy(rule.id);
    try {
      const updated = await api.updateAlertRule(rule.id, { enabled: !rule.enabled });
      setRules((rows) => rows.map((item) => item.id === rule.id ? updated : item));
      setNotice(rule.enabled ? "Rule paused." : "Rule enabled.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update rule.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteRule(rule: AlertRule) {
    if (!window.confirm("Delete alert rule \"" + rule.name + "\"?")) return;
    setBusy(rule.id);
    try {
      await api.deleteAlertRule(rule.id);
      setRules((rows) => rows.filter((item) => item.id !== rule.id));
      setNotice("Rule deleted.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete rule.");
    } finally {
      setBusy(null);
    }
  }

  async function createKey() {
    if (!selectedHost || !keyName.trim()) return;
    setBusy("key:create");
    setError(null);
    setNotice(null);
    setOneTimeSecret(null);
    try {
      const created = await api.createApiKey(selectedHost, keyName.trim());
      setKeys((rows) => [created, ...rows]);
      setOneTimeSecret(created);
      setNotice("Agent key created. The secret is only available in this response.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create agent key.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeKey(key: ApiKey) {
    if (!window.confirm("Revoke agent key \"" + key.name + "\"?")) return;
    setBusy(key.id);
    try {
      const updated = await api.revokeApiKey(key.id);
      setKeys((rows) => rows.map((item) => item.id === key.id ? updated : item));
      setOneTimeSecret(null);
      setNotice("Agent key revoked.");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke agent key.");
    } finally {
      setBusy(null);
    }
  }

  async function copySecret() {
    if (!oneTimeSecret) return;
    try {
      await navigator.clipboard.writeText(oneTimeSecret.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was unavailable. Copy the secret manually.");
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Platform operations</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Production control plane</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage the runtime itself: watch service health, tune alert rules, issue agent credentials, and inspect an operational audit trail.</p>
        </div>
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-2.5 text-xs text-amber-200">Administrator access</div>
      </div>

      {oneTimeSecret && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200"><Lock className="h-4 w-4" />New agent secret</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Shown once. Store it securely in the agent environment; it will not be returned by the listing API.</p>
              <div className="mt-3 break-all rounded-xl border border-white/8 bg-black/15 px-4 py-3 font-mono text-xs text-white">{oneTimeSecret.secret}</div>
            </div>
            <button onClick={() => void copySecret()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-semibold text-slate-950">
              <Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy secret"}
            </button>
          </div>
        </div>
      )}

      {(error || notice) && (
        <div role="alert" className={"rounded-xl border px-4 py-3 text-sm " + (error ? "border-rose-500/15 bg-rose-500/5 text-rose-300" : "border-emerald-500/15 bg-emerald-500/5 text-emerald-300")}>
          {error || notice}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/6 pb-3">
        {([
          ["runtime", "Runtime", Gauge],
          ["rules", "Alert rules", Activity],
          ["agents", "Agent access", KeyRound],
          ["audit", "Audit log", Database],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={"inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium " + (tab === key ? "bg-cyan-300 text-slate-950" : "border border-white/8 text-slate-400 hover:bg-white/[0.04]")}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === "runtime" && (
        platform ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Service uptime", formatUptime(platform.uptime_seconds), "text-cyan-300"],
                ["HTTP requests", compactNumber(platform.counters.http_requests_total ?? 0), "text-white"],
                ["Generated telemetry", compactNumber(platform.counters.telemetry_generated_total ?? 0), "text-white"],
                ["Open incidents", compactNumber(platform.gauges.open_incidents ?? 0), "text-rose-300"],
              ].map(([label, value, tone]) => (
                <div key={String(label)} className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4" />{label}</div>
                  <div className={"mt-3 text-3xl font-semibold " + String(tone)}>{value}</div>
                </div>
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
                <div><div className="text-sm font-semibold text-white">Pipeline throughput</div><div className="mt-1 text-xs text-slate-600">Ingestion and persistence counters</div></div>
                <div className="mt-5 space-y-3">
                  {[
                    ["Ingested", platform.counters.telemetry_ingested_total ?? 0],
                    ["Batches", platform.counters.telemetry_ingestion_batches_total ?? 0],
                    ["Rejected", platform.counters.telemetry_ingestion_rejected_total ?? 0],
                    ["Persisted", platform.counters.telemetry_persisted_total ?? 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs text-slate-500">{label}</span><span className="font-mono text-xs text-slate-300">{Number(value).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
                <div><div className="text-sm font-semibold text-white">Runtime pressure</div><div className="mt-1 text-xs text-slate-600">Signals that indicate backpressure or noisy operation</div></div>
                <div className="mt-5 space-y-3">
                  {[
                    ["Telemetry queue", platform.gauges.telemetry_persistence_queue_depth ?? 0],
                    ["Alert queue", platform.gauges.alert_persistence_queue_depth ?? 0],
                    ["Incident queue", platform.gauges.incident_persistence_queue_depth ?? 0],
                    ["WebSocket clients", platform.gauges.websocket_clients ?? 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                      <span className="text-xs text-slate-500">{label}</span><span className="font-mono text-xs text-cyan-200">{Number(value).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/7 bg-slate-900/50 p-5">
                <div><div className="text-sm font-semibold text-white">Realtime fan-out</div><div className="mt-1 text-xs text-slate-600">Cross-worker WebSocket transport health</div></div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {[
                    ["Publisher", platform.gauges.event_bus_publisher_connected ?? 0],
                    ["Listener", platform.gauges.event_bus_listener_connected ?? 0],
                    ["Queue", platform.gauges.event_bus_queue_depth ?? 0],
                  ].map(([label, value]) => {
                    const connected = Number(value) > 0;
                    const queue = label === "Queue";
                    const disabled = !connected && Number(platform.runtime.event_bus_connected ?? 0) === 0 && Number(platform.runtime.event_bus_queue ?? 0) === 0;
                    return (
                      <div key={String(label)} className="rounded-xl border border-white/6 bg-white/[0.02] p-3">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-600">{label}</div>
                        <div className={"mt-2 text-sm font-semibold " + (queue ? "text-cyan-200" : disabled ? "text-slate-500" : connected ? "text-emerald-300" : "text-amber-300")}>
                          {queue ? Number(value).toLocaleString() : disabled ? "Local only" : connected ? "Connected" : "Degraded"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[10px] leading-4 text-slate-600">Distributed fan-out is optional and disabled by default. When enabled, worker health is visible here without exposing database credentials or deployment settings.</p>
              </section>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-8 text-sm text-slate-500">Loading runtime metrics…</div>
        )
      )}

      {tab === "rules" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><Plus className="h-4 w-4 text-cyan-300" />Create stateful threshold rule</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="High latency" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
              <select value={ruleMetric} onChange={(e) => {
                const next = e.target.value as AlertRule["metric"];
                setRuleMetric(next);
                const item = metrics.find((metric) => metric.key === next);
                if (item) setRuleThreshold(item.defaultThreshold);
              }} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">
                {metrics.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <div className="grid grid-cols-[0.6fr_1fr] gap-2">
                <select value={ruleOperator} onChange={(e) => setRuleOperator(e.target.value as AlertRule["operator"])} className="rounded-xl border border-white/8 bg-slate-950 px-3 py-3 text-sm text-white">{operators.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                <input value={ruleThreshold} onChange={(e) => setRuleThreshold(e.target.value)} type="number" step="0.01" placeholder="Threshold" className="rounded-xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
              </div>
              <select value={ruleSeverity} onChange={(e) => setRuleSeverity(e.target.value as AlertRule["severity"])} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">
                {(["INFO", "WARNING", "CRITICAL"] as const).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <input value={ruleDuration} onChange={(e) => setRuleDuration(e.target.value)} type="number" min="0" max="86400" step="1" placeholder="Duration seconds" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
              <input value={ruleCooldown} onChange={(e) => setRuleCooldown(e.target.value)} type="number" min="0" max="86400" step="1" placeholder="Cooldown seconds" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
              <button onClick={() => void createRule()} disabled={busy === "rule:create" || !ruleName.trim()} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy === "rule:create" ? "Creating…" : "Create rule"}</button>
            </div>
            <p className="mt-3 text-xs text-slate-600">Duration prevents one-sample spikes from paging; cooldown prevents repeated firing after an alert resolves.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
            <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Configured rules</div>
            <div className="divide-y divide-white/6">
              {rules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{rule.name}</span>
                      <span className={"rounded-full border px-2 py-1 text-[10px] " + (rule.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-white/8 text-slate-500")}>{rule.enabled ? "Enabled" : "Paused"}</span>
                      <span className="rounded-full border border-white/7 px-2 py-1 text-[10px] text-slate-500">{rule.severity}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">{metricLabel(rule.metric)} {rule.operator} {rule.threshold} · sustained {rule.duration_seconds}s · cooldown {rule.cooldown_seconds}s</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={busy === rule.id} onClick={() => void toggleRule(rule)} className="rounded-xl border border-white/8 px-3 py-2 text-xs text-slate-400 disabled:opacity-40">{rule.enabled ? "Pause" : "Enable"}</button>
                    <button disabled={busy === rule.id} onClick={() => void deleteRule(rule)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/15 px-3 py-2 text-xs text-rose-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                  </div>
                </div>
              ))}
              {rules.length === 0 && <div className="p-8 text-sm text-slate-500">No rules configured yet.</div>}
            </div>
          </div>
        </section>
      )}

      {tab === "agents" && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/7 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white"><KeyRound className="h-4 w-4 text-cyan-300" />Provision a telemetry agent</div>
            <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_auto]">
              <select value={selectedHost} onChange={(e) => setSelectedHost(e.target.value)} className="rounded-xl border border-white/8 bg-slate-950 px-4 py-3 text-sm text-white">
                {hosts.map((host) => <option key={host.id} value={host.id}>{host.name} · {host.environment}</option>)}
              </select>
              <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Windows telemetry agent" className="rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30" />
              <button onClick={() => void createKey()} disabled={busy === "key:create" || !selectedHost || !keyName.trim()} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy === "key:create" ? "Creating…" : "Create key"}</button>
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />Secrets are hashed at rest, scoped to one host, and never returned by the listing endpoint.</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
            <div className="border-b border-white/6 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Agent credentials</div>
            <div className="divide-y divide-white/6">
              {selectedKeys.map((key) => (
                <div key={key.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white"><KeyRound className="h-4 w-4 text-cyan-300" />{key.name}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      <span>{key.key_prefix}••••••</span>
                      <span>Created {new Date(key.created_at).toLocaleString()}</span>
                      {key.last_used_at && <span>Last used {new Date(key.last_used_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  {key.revoked_at ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><XCircle className="h-4 w-4" />Revoked {new Date(key.revoked_at).toLocaleString()}</span>
                  ) : (
                    <button disabled={busy === key.id} onClick={() => void revokeKey(key)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/15 px-3 py-2 text-xs text-rose-300 disabled:opacity-40"><Lock className="h-3.5 w-3.5" />Revoke</button>
                  )}
                </div>
              ))}
              {selectedKeys.length === 0 && <div className="p-8 text-sm text-slate-500">No agent keys for this host.</div>}
            </div>
          </div>
        </section>
      )}

      {tab === "audit" && (
        <section className="overflow-hidden rounded-2xl border border-white/7 bg-slate-900/50">
          <div className="border-b border-white/6 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit trail</div>
            <div className="mt-1 text-xs text-slate-700">Security-sensitive configuration changes and operator actions recorded by the backend.</div>
          </div>
          <div className="divide-y divide-white/6">
            {auditLogs.map((log) => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{log.action}</span>
                      <span className={"rounded-full border px-2 py-1 text-[10px] " + (log.outcome === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300")}>{log.outcome}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{log.resource_type}{log.resource_id ? " · " + log.resource_id : ""}</div>
                  </div>
                  <div className="text-xs text-slate-600">{new Date(log.created_at).toLocaleString()}</div>
                </div>
                {log.details && <pre className="mt-3 overflow-x-auto rounded-xl border border-white/6 bg-black/10 p-3 text-[11px] leading-5 text-slate-600">{log.details}</pre>}
              </div>
            ))}
            {auditLogs.length === 0 && <div className="p-8 text-sm text-slate-500">No audit events recorded yet.</div>}
          </div>
        </section>
      )}
    </main>
  );
};

export default Operations;
