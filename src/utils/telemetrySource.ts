import type { Host } from "../types/app.js";
import { getTelemetryFreshness } from "./hostHealth.js";

export function selectPreferredTelemetryHost(
  hosts: Host[],
  nowMs: number = Date.now(),
): string | null {
  const active = hosts.filter((host) => host.is_active);
  if (active.length === 0) return null;

  const agents = active
    .filter((host) => Boolean(host.agent_version))
    .sort((a, b) => {
      const aSeen = Date.parse(a.last_seen_at ?? "");
      const bSeen = Date.parse(b.last_seen_at ?? "");
      return (Number.isFinite(bSeen) ? bSeen : 0) - (Number.isFinite(aSeen) ? aSeen : 0);
    });

  const reportingAgent = agents.find((host) => {
    const freshness = getTelemetryFreshness(host.last_seen_at, host.is_active, nowMs);
    return freshness.status === "online" || freshness.status === "stale";
  });

  if (reportingAgent) return reportingAgent.id;
  if (agents[0]) return agents[0].id;

  return active[0].id;
}
