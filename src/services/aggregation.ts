import { MetricStat, TelemetryEvent, TelemetryStats } from "../models/types.js";
import { METRICS_TO_MONITOR } from "./anomalyDetector.js";

export function computeStats(events: TelemetryEvent[]): TelemetryStats {
  const count = events.length;
  const stats: Record<string, MetricStat> = {};

  for (const field of METRICS_TO_MONITOR) {
    if (count === 0) {
      stats[field] = { min: null, max: null, avg: null, latest: null, pct_change: null };
      continue;
    }

    const values = events.map((e) => e[field]);
    const latest = values[values.length - 1];
    const first = values[0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / count;

    let pctChange: number | null = null;
    if (first !== 0) {
      pctChange = Number((((latest - first) / first) * 100).toFixed(2));
    }

    stats[field] = {
      min,
      max,
      avg: Number(avg.toFixed(2)),
      latest,
      pct_change: pctChange,
    };
  }

  return {
    count,
    cpu: stats["cpu"],
    memory: stats["memory"],
    temperature: stats["temperature"],
    network_mbps: stats["network_mbps"],
    requests_per_second: stats["requests_per_second"],
    error_rate: stats["error_rate"],
    latency_ms: stats["latency_ms"],
  };
}
