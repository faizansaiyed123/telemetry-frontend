export interface SimulationStatus {
  running: boolean;
  rate: number;
  sequence: number;
  events_generated: number;
  active_anomaly: string | null;
  connected_clients: number;
  uptime_seconds: number;
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  stream_active: boolean;
  connected_clients: number;
  events_generated: number;
}

export type AnomalyMetric = "cpu" | "memory" | "temperature" | "latency" | "error_rate";

export interface TriggerAnomalyPayload {
  metric: AnomalyMetric;
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

export interface SimulationControlResponse {
  status: string;
  message?: string;
  rate?: number;
}
