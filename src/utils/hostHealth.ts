/** Telemetry freshness helpers for monitored hosts. */

export type TelemetryFreshness = "online" | "stale" | "silent" | "inactive";

export interface TelemetryFreshnessResult {
  status: TelemetryFreshness;
  label: string;
  ageSeconds: number | null;
}

export function getTelemetryFreshness(
  lastSeenAt: string | null | undefined,
  isActive: boolean,
  nowMs: number = Date.now(),
): TelemetryFreshnessResult {
  if (!isActive) {
    return { status: "inactive", label: "Inactive", ageSeconds: null };
  }
  if (!lastSeenAt) {
    return { status: "silent", label: "No telemetry", ageSeconds: null };
  }

  const timestamp = Date.parse(lastSeenAt);
  if (!Number.isFinite(timestamp)) {
    return { status: "silent", label: "Invalid heartbeat", ageSeconds: null };
  }

  const ageSeconds = Math.max(0, Math.round((nowMs - timestamp) / 1000));
  if (ageSeconds <= 30) {
    return { status: "online", label: "Reporting", ageSeconds };
  }
  if (ageSeconds <= 120) {
    return { status: "stale", label: "Stale", ageSeconds };
  }
  return { status: "silent", label: "Silent", ageSeconds };
}
