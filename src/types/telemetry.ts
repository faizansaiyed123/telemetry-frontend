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

export interface CurrentTelemetryResponse {
  event: TelemetryEvent | null;
  available: boolean;
}

export interface TelemetryHistoryResponse {
  events: TelemetryEvent[];
  count: number;
  limit: number;
}
