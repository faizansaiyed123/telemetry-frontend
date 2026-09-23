import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMetricNumber, formatMetricValue, formatUptime, formatTimestamp, getMetricUnit } from "../src/utils/formatters.js";
import { WebSocketMessage } from "../src/types/websocket.js";
import { Alert } from "../src/types/alerts.js";
import { TelemetryEvent } from "../src/types/telemetry.js";
import { api } from "../src/services/api.js";
import { getTelemetryFreshness } from "../src/utils/hostHealth.js";

describe("Frontend Utilities & Data Formatting", () => {
  it("formats metric numbers correctly without excessive decimals", () => {
    assert.equal(formatMetricNumber("cpu", 42.849), "42.8");
    assert.equal(formatMetricNumber("requests_per_second", 1234.56), "1,235");
    assert.equal(formatMetricNumber("error_rate", 0.8123), "0.81");
    assert.equal(formatMetricNumber("unknown", null), "--");
  });

  it("returns correct units for metrics", () => {
    assert.equal(getMetricUnit("cpu"), "%");
    assert.equal(getMetricUnit("temperature"), "°C");
    assert.equal(getMetricUnit("network_mbps"), "Mbps");
    assert.equal(getMetricUnit("requests_per_second"), "req/s");
    assert.equal(getMetricUnit("latency_ms"), "ms");
  });

  it("formats uptime human-readably", () => {
    assert.equal(formatUptime(45), "45s");
    assert.equal(formatUptime(125), "2m 5s");
    assert.equal(formatUptime(3665), "1h 1m 5s");
    assert.equal(formatUptime(0), "0s");
  });

  it("formats ISO timestamps", () => {
    const formatted = formatTimestamp("2026-09-17T04:00:00.000Z");
    assert.ok(formatted.length > 0);
  });
});

describe("WebSocket Message Parsing & Discriminated Unions", () => {
  it("parses telemetry stream packets correctly", () => {
    const rawJson = JSON.stringify({
      type: "telemetry",
      data: {
        timestamp: "2026-09-17T04:00:00.000Z",
        sequence: 42,
        cpu: 45.5,
        memory: 68.2,
        temperature: 51.0,
        network_mbps: 72.3,
        requests_per_second: 410,
        error_rate: 0.5,
        latency_ms: 12.4,
      },
    });

    const parsed = JSON.parse(rawJson) as WebSocketMessage;
    assert.equal(parsed.type, "telemetry");
    if (parsed.type === "telemetry") {
      assert.equal(parsed.data.sequence, 42);
      assert.equal(parsed.data.cpu, 45.5);
    }
  });

  it("parses alert packets with correct severity and resolution status", () => {
    const rawAlert: Alert = {
      id: "alert-101",
      timestamp: "2026-09-17T04:00:01.000Z",
      metric: "cpu",
      value: 94.2,
      baseline: 45.0,
      severity: "CRITICAL",
      message: "Anomalous cpu surge detected (94.2 > baseline 45.0)",
      resolved: false,
      resolved_at: null,
    };

    const rawJson = JSON.stringify({
      type: "alert",
      data: rawAlert,
    });

    const parsed = JSON.parse(rawJson) as WebSocketMessage;
    assert.equal(parsed.type, "alert");
    if (parsed.type === "alert") {
      assert.equal(parsed.data.id, "alert-101");
      assert.equal(parsed.data.severity, "CRITICAL");
      assert.equal(parsed.data.resolved, false);
    }
  });
});

describe("Production operations API surface", () => {
  it("exposes the frontend clients for the backend operations surface", () => {
    assert.equal(typeof api.getIncidents, "function");
    assert.equal(typeof api.acknowledgeIncident, "function");
    assert.equal(typeof api.getSlos, "function");
    assert.equal(typeof api.getSloStatus, "function");
    assert.equal(typeof api.createSlo, "function");
    assert.equal(typeof api.getAlertRules, "function");
    assert.equal(typeof api.createAlertRule, "function");
    assert.equal(typeof api.updateAlertRule, "function");
    assert.equal(typeof api.deleteAlertRule, "function");
    assert.equal(typeof api.getApiKeys, "function");
    assert.equal(typeof api.createApiKey, "function");
    assert.equal(typeof api.revokeApiKey, "function");
    assert.equal(typeof api.getPlatformMetrics, "function");
    assert.equal(typeof api.getAuditLogs, "function");
    assert.equal(typeof api.getIncidentEvidence, "function");
    assert.equal(typeof api.getChangeEvents, "function");
    assert.equal(typeof api.createChangeEvent, "function");
  });
});

describe("Host telemetry freshness", () => {
  const now = Date.parse("2026-09-22T10:00:00.000Z");

  it("classifies a recent host as reporting", () => {
    const result = getTelemetryFreshness("2026-09-22T09:59:31.000Z", true, now);
    assert.equal(result.status, "online");
    assert.equal(result.label, "Reporting");
    assert.equal(result.ageSeconds, 29);
  });

  it("classifies a delayed host as stale", () => {
    const result = getTelemetryFreshness("2026-09-22T09:58:00.000Z", true, now);
    assert.equal(result.status, "stale");
    assert.equal(result.ageSeconds, 120);
  });

  it("classifies a silent host with no recent sample", () => {
    const result = getTelemetryFreshness("2026-09-22T09:55:00.000Z", true, now);
    assert.equal(result.status, "silent");
    assert.equal(result.label, "Silent");
  });

  it("distinguishes inactive hosts from silent hosts", () => {
    const result = getTelemetryFreshness("2026-09-22T09:59:59.000Z", false, now);
    assert.equal(result.status, "inactive");
    assert.equal(result.label, "Inactive");
    assert.equal(result.ageSeconds, null);
  });

  it("does not treat missing telemetry as healthy", () => {
    const result = getTelemetryFreshness(null, true, now);
    assert.equal(result.status, "silent");
    assert.equal(result.label, "No telemetry");
    assert.equal(result.ageSeconds, null);
  });
});

describe("Alert Deduplication and Resolution Lifecycle Logic", () => {
  it("deduplicates alerts using alert ID as stable key", () => {
    const alertList: Alert[] = [];

    const alert1: Alert = {
      id: "alert-1",
      timestamp: "2026-09-17T04:00:00.000Z",
      metric: "cpu",
      value: 85.0,
      baseline: 40.0,
      severity: "WARNING",
      message: "High CPU",
      resolved: false,
    };

    // First arrival
    const idx1 = alertList.findIndex((a) => a.id === alert1.id);
    if (idx1 >= 0) {
      alertList[idx1] = alert1;
    } else {
      alertList.unshift(alert1);
    }
    assert.equal(alertList.length, 1);
    assert.equal(alertList[0].resolved, false);

    // Repeated update for the same active alert
    const alert1Updated: Alert = {
      ...alert1,
      value: 92.5,
      severity: "CRITICAL",
    };
    const idx2 = alertList.findIndex((a) => a.id === alert1Updated.id);
    if (idx2 >= 0) {
      alertList[idx2] = alert1Updated;
    } else {
      alertList.unshift(alert1Updated);
    }
    assert.equal(alertList.length, 1, "Alert count should remain 1 without duplicates");
    assert.equal(alertList[0].value, 92.5);
    assert.equal(alertList[0].severity, "CRITICAL");

    // Resolution update
    const alert1Resolved: Alert = {
      ...alert1Updated,
      resolved: true,
      resolved_at: "2026-09-17T04:00:05.000Z",
    };
    const idx3 = alertList.findIndex((a) => a.id === alert1Resolved.id);
    if (idx3 >= 0) {
      alertList[idx3] = alert1Resolved;
    } else {
      alertList.unshift(alert1Resolved);
    }
    assert.equal(alertList.length, 1);
    assert.equal(alertList[0].resolved, true);
    assert.ok(alertList[0].resolved_at);
  });
});

describe("WebSocket authentication handoff", () => {
  it("requests the scoped token through the authenticated API client", async () => {
    const originalWindow = globalThis.window;
    const originalFetch = globalThis.fetch;

    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.window = {
      localStorage: {
        getItem: (key: string) => key === "telemetry_access_token" ? "long-lived-jwt" : null,
        removeItem: () => undefined,
      },
      location: { pathname: "/app", replace: () => undefined },
    } as unknown as Window & typeof globalThis;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      return new Response(
        JSON.stringify({
          access_token: "short-lived-ws-token",
          token_type: "bearer",
          expires_in: 60,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    try {
      const response = await api.getWebSocketToken();
      assert.equal(response.access_token, "short-lived-ws-token");
      assert.equal(response.expires_in, 60);
      assert.equal(requests.length, 1);
      assert.match(requests[0].url, /\/api\/auth\/ws-token$/);
      assert.equal(requests[0].init?.method, "POST");
      assert.equal(
        new Headers(requests[0].init?.headers).get("Authorization"),
        "Bearer long-lived-jwt",
      );
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.window = originalWindow;
    }
  });
});
