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
}

export interface MetricStat {
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  pct_change?: number | null;
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
}

export interface UserRecord {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}
