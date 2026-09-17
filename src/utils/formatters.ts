export function formatMetricValue(metric: string, value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "--";
  switch (metric) {
    case "cpu":
    case "memory":
      return `${value.toFixed(1)}%`;
    case "temperature":
      return `${value.toFixed(1)}°C`;
    case "network_mbps":
      return `${value.toFixed(1)} Mbps`;
    case "requests_per_second":
      return `${Math.round(value).toLocaleString()} req/s`;
    case "error_rate":
      return `${value.toFixed(2)}%`;
    case "latency_ms":
      return `${value.toFixed(1)} ms`;
    default:
      return String(value);
  }
}

export function formatMetricNumber(metric: string, value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "--";
  switch (metric) {
    case "requests_per_second":
      return Math.round(value).toLocaleString();
    case "error_rate":
      return value.toFixed(2);
    default:
      return value.toFixed(1);
  }
}

export function getMetricUnit(metric: string): string {
  switch (metric) {
    case "cpu":
    case "memory":
      return "%";
    case "temperature":
      return "°C";
    case "network_mbps":
      return "Mbps";
    case "requests_per_second":
      return "req/s";
    case "error_rate":
      return "%";
    case "latency_ms":
      return "ms";
    default:
      return "";
  }
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoString;
  }
}
