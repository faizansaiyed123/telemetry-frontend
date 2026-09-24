export interface SimulationStatus {
  running: boolean;
  simulation_enabled: boolean;
  source_mode: "synthetic" | "agent" | "hybrid";
  rate: number;
  sequence: number;
  events_generated: number;
  events_ingested: number;
  active_anomaly: string | null;
  connected_clients: number;
  uptime_seconds: number;
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  source_mode: "synthetic" | "agent" | "hybrid";
  simulation_enabled: boolean;
  stream_active: boolean;
  connected_clients: number;
  events_generated: number;
  events_ingested: number;
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
