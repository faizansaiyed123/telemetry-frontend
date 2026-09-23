export type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface TelemetryEvent {
  timestamp: string;
  sequence: number;
  cpu: number;
  memory: number;
  temperature: number;
  network_mbps: number;
  requests_per_second: number;
  error_rate: number;
  latency_ms: number;
  host_id?: string | null;
  source?: "synthetic" | "agent" | "api";
  agent_version?: string | null;
}

export interface MetricStat {
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  pct_change: number | null;
}

export interface TelemetryStats {
  count: number;
  cpu: MetricStat;
  memory: MetricStat;
  temperature: MetricStat;
  network_mbps: MetricStat;
  requests_per_second: MetricStat;
  error_rate: MetricStat;
  latency_ms: MetricStat;
}

export interface Alert {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  baseline: number;
  severity: Severity;
  message: string;
  resolved: boolean;
  resolved_at?: string | null;
  acknowledged?: boolean;
  host_id?: string | null;
  source?: "anomaly" | "rule";
  rule_id?: string | null;
  incident_id?: string | null;
}

export interface AlertsResponse {
  alerts: Alert[];
  active_count: number;
  total_count: number;
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  stream_active: boolean;
  connected_clients: number;
  events_generated: number;
}

export interface SimulationStatus {
  running: boolean;
  rate: number;
  sequence: number;
  events_generated: number;
  active_anomaly: string | null;
  connected_clients: number;
  uptime_seconds: number;
}

export interface SimulationControlResponse {
  status: string;
  message: string;
  rate?: number;
}

export interface TriggerAnomalyPayload {
  metric: string;
  intensity?: number;
  duration_seconds?: number;
}

export interface TriggerAnomalyResponse {
  status: string;
  metric: string;
  intensity: number;
  duration_seconds: number;
  message: string;
}

export interface CurrentTelemetryResponse {
  event: TelemetryEvent | null;
  available: boolean;
}

export interface TelemetryHistoryResponse {
  events: TelemetryEvent[];
  count: number;
  limit: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface Host {
  id: string;
  name: string;
  environment: string;
  is_active: boolean;
  last_seen_at?: string | null;
  agent_version?: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}


export interface ApiKey {
  id: string;
  host_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
}
export interface ApiKeyCreated extends ApiKey { secret: string; }

export interface AlertRule {
  id: string;
  name: string;
  metric: keyof Pick<TelemetryEvent, "cpu"|"memory"|"temperature"|"network_mbps"|"requests_per_second"|"error_rate"|"latency_ms">;
  operator: ">" | ">=" | "<" | "<=";
  threshold: number;
  duration_seconds: number;
  cooldown_seconds: number;
  severity: Severity;
  enabled: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}
export interface Incident {
  id: string;
  host_id: string | null;
  title: string;
  status: "open" | "acknowledged" | "resolved";
  severity: Severity;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at?: string | null;
  alert_ids: string[];
  active_alert_count: number;
}

export interface IncidentTimelineItem {
  kind: "alert" | "change";
  timestamp: string;
  title: string;
  severity?: Severity | null;
  status?: string | null;
  reference_id: string;
  source?: string | null;
}

export interface IncidentEvidence {
  incident: Incident;
  timeline: IncidentTimelineItem[];
  alert_count: number;
  metric_count: number;
  change_count: number;
  correlation_window_minutes: number;
  findings: string[];
  metric_findings?: string[];
}

export type ChangeEventType = "deployment" | "config" | "feature_flag" | "maintenance" | "rollback" | "other";

export interface ChangeEvent {
  id: string;
  host_id: string | null;
  event_type: ChangeEventType;
  title: string;
  description: string | null;
  source: string;
  actor_user_id: string | null;
  external_ref: string | null;
  occurred_at: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: string;
  ip_address: string | null;
  user_agent: string | null;
  details: string | null;
  created_at: string;
}
export interface SLO {
  id: string;
  name: string;
  host_id: string;
  metric: AlertRule["metric"];
  operator: AlertRule["operator"];
  threshold: number;
  objective_percent: number;
  window_hours: number;
  enabled: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}
export interface SLOStatus {
  slo_id: string;
  name: string;
  host_id: string;
  metric: AlertRule["metric"];
  operator: AlertRule["operator"];
  threshold: number;
  objective_percent: number;
  window_hours: number;
  window_start: string;
  window_end: string;
  total_samples: number;
  good_samples: number;
  bad_samples: number;
  sli_percent: number;
  error_budget_percent: number;
  error_budget_remaining_percent: number;
  compliant: boolean;
}
export interface PlatformMetrics {
  uptime_seconds: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  runtime: Record<string, number>;
}

export interface TelemetrySeriesPoint {
  timestamp: string;
  samples: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
}

export interface TelemetrySeriesResponse {
  host_id: string;
  metric: AlertRule["metric"];
  start: string;
  end: string;
  bucket_seconds: number;
  points: TelemetrySeriesPoint[];
}


export interface WebSocketTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
