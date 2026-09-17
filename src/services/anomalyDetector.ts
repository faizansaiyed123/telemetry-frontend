import { AnomalyResult, Severity, TelemetryEvent } from "../models/types.js";

export const METRICS_TO_MONITOR = [
  "cpu",
  "memory",
  "temperature",
  "network_mbps",
  "requests_per_second",
  "error_rate",
  "latency_ms",
] as const;

export type MonitoredMetric = (typeof METRICS_TO_MONITOR)[number];

export const MIN_HISTORY = 30;

export class AnomalyDetector {
  threshold: number;
  windowSize: number;
  minHistory: number;
  private history: Map<string, number[]>;

  constructor(threshold = 3.0, windowSize = 100, minHistory = MIN_HISTORY) {
    this.threshold = threshold;
    this.windowSize = windowSize;
    this.minHistory = minHistory;
    this.history = new Map();
    for (const metric of METRICS_TO_MONITOR) {
      this.history.set(metric, []);
    }
  }

  update(event: TelemetryEvent): AnomalyResult[] {
    const results: AnomalyResult[] = [];

    for (const metric of METRICS_TO_MONITOR) {
      const value = event[metric];
      const list = this.history.get(metric) || [];
      list.push(value);
      if (list.length > this.windowSize) {
        list.shift();
      }
      this.history.set(metric, list);

      if (list.length < this.minHistory) {
        results.push({
          metric,
          value,
          baseline: value,
          z_score: 0.0,
          is_anomaly: false,
          severity: Severity.INFO,
        });
        continue;
      }

      const mean = list.reduce((a, b) => a + b, 0) / list.length;
      const variance = list.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / list.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) {
        results.push({
          metric,
          value,
          baseline: Number(mean.toFixed(2)),
          z_score: 0.0,
          is_anomaly: false,
          severity: Severity.INFO,
        });
        continue;
      }

      const zScore = (value - mean) / stdDev;
      const isAnomaly = Math.abs(zScore) > this.threshold;

      let severity = Severity.INFO;
      if (isAnomaly) {
        severity = Math.abs(zScore) > this.threshold * 2 ? Severity.CRITICAL : Severity.WARNING;
      }

      results.push({
        metric,
        value,
        baseline: Number(mean.toFixed(2)),
        z_score: Number(zScore.toFixed(2)),
        is_anomaly: isAnomaly,
        severity,
      });
    }

    return results;
  }

  reset(): void {
    for (const metric of METRICS_TO_MONITOR) {
      this.history.set(metric, []);
    }
  }
}
