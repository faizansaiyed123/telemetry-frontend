export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface Alert {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  baseline: number;
  severity: AlertSeverity;
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
