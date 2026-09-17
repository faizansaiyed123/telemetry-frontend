export enum Severity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

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
}

export interface AnomalyResult {
  metric: string;
  value: number;
  baseline: number;
  z_score: number;
  is_anomaly: boolean;
  severity: Severity;
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

export interface TriggerAnomalyRequest {
  metric: string;
  intensity?: number;
  duration_seconds?: number;
}
