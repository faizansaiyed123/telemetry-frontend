import {
  AuthResponse,
  AuthUser,
  CurrentTelemetryResponse,
  HealthResponse,
  SimulationControlResponse,
  SimulationStatus,
  TelemetryHistoryResponse,
  TelemetryStats,
  TriggerAnomalyPayload,
  TriggerAnomalyResponse,
  AlertsResponse,
  Host,
  UserRecord,
  ApiKey, ApiKeyCreated, AlertRule, Incident, IncidentEvidence, AuditLog, PlatformMetrics, SLO, SLOStatus,
  TelemetrySeriesResponse,
  WebSocketTokenResponse,
} from "../types/app.js";

export const API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")
    : "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = window.localStorage.getItem("telemetry_access_token");
  if (token) headers.set("Authorization", "Bearer " + token);

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, { ...options, headers });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0);
  }

  if (response.status === 401) {
    window.localStorage.removeItem("telemetry_access_token");
    window.localStorage.removeItem("telemetry_user");
    if (window.location.pathname.startsWith("/app")) {
      window.location.replace("/login");
    }
  }

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    const message =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : "Request failed with status " + response.status;
    throw new ApiError(message, response.status, data);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function authRequest<T>(
  path: string,
  options: RequestInit,
  fallbackMessage: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, options);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0);
  }

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }

    let message = fallbackMessage;
    if (typeof data === "object" && data && "detail" in data) {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        const messages = detail
          .map((item) => (typeof item === "object" && item && "msg" in item ? String((item as { msg?: unknown }).msg) : null))
          .filter((item): item is string => Boolean(item));
        if (messages.length > 0) message = messages.join(". ");
      }
    }
    throw new ApiError(message, response.status, data);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string): Promise<AuthResponse> {
    const body = new URLSearchParams({ username: email, password });
    return authRequest<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
      "Invalid email or password",
    );
  },

  signup(email: string, password: string): Promise<AuthResponse> {
    return authRequest<AuthResponse>(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      },
      "Unable to create your account",
    );
  },

  getWebSocketToken(): Promise<WebSocketTokenResponse> {
    return request<WebSocketTokenResponse>("/api/auth/ws-token", { method: "POST" });
  },

  me(): Promise<AuthUser> {
    return request<AuthUser>("/api/auth/me");
  },

  changePassword(payload: { current_password: string; new_password: string }): Promise<{ status: string }> {
    return request<{ status: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  getCurrentTelemetry(): Promise<CurrentTelemetryResponse> {
    return request<CurrentTelemetryResponse>("/api/telemetry/current");
  },

  getTelemetryHistory(limit = 100, hostId?: string): Promise<TelemetryHistoryResponse> {
    const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)));
    const params = new URLSearchParams({ limit: String(safeLimit) });
    if (hostId) params.set("host_id", hostId);
    return request<TelemetryHistoryResponse>("/api/telemetry/history?" + params.toString());
  },

  getTelemetryStats(hostId?: string): Promise<TelemetryStats> {
    const params = hostId ? "?host_id=" + encodeURIComponent(hostId) : "";
    return request<TelemetryStats>("/api/telemetry/stats" + params);
  },

  getTelemetrySeries(params: {
    metric: AlertRule["metric"];
    hostId?: string;
    start?: string;
    end?: string;
    bucketSeconds?: number;
  }): Promise<TelemetrySeriesResponse> {
    const query = new URLSearchParams({ metric: params.metric });
    if (params.hostId) query.set("host_id", params.hostId);
    if (params.start) query.set("start", params.start);
    if (params.end) query.set("end", params.end);
    if (params.bucketSeconds) query.set("bucket_seconds", String(params.bucketSeconds));
    return request<TelemetrySeriesResponse>("/api/telemetry/series?" + query.toString());
  },

  getAlerts(activeOnly = false): Promise<AlertsResponse> {
    return request<AlertsResponse>("/api/alerts?active_only=" + activeOnly);
  },

  acknowledgeAlert(alertId: string): Promise<{ status: string; alert_id: string }> {
    return request<{ status: string; alert_id: string }>(
      "/api/alerts/" + encodeURIComponent(alertId) + "/acknowledge",
      { method: "POST" }
    );
  },

  getSimulationStatus(): Promise<SimulationStatus> {
    return request<SimulationStatus>("/api/simulation/status");
  },

  startSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/start", { method: "POST" });
  },

  pauseSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/pause", { method: "POST" });
  },

  resumeSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/resume", { method: "POST" });
  },

  resetSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/reset", { method: "POST" });
  },

  setSimulationRate(rate: number): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/rate?rate=" + encodeURIComponent(rate), {
      method: "POST",
    });
  },

  triggerAnomaly(payload: TriggerAnomalyPayload): Promise<TriggerAnomalyResponse> {
    return request<TriggerAnomalyResponse>("/api/simulation/trigger", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getHosts(): Promise<Host[]> {
    return request<Host[]>("/api/hosts");
  },

  getApiKeys(hostId?: string): Promise<ApiKey[]> {
    const params = hostId ? "?host_id=" + encodeURIComponent(hostId) : "";
    return request<ApiKey[]>("/api/api-keys" + params);
  },
  createApiKey(hostId: string, name: string): Promise<ApiKeyCreated> {
    return request<ApiKeyCreated>("/api/api-keys/hosts/" + encodeURIComponent(hostId), {
      method: "POST", body: JSON.stringify({ name }),
    });
  },
  revokeApiKey(id: string): Promise<ApiKey> {
    return request<ApiKey>("/api/api-keys/" + encodeURIComponent(id) + "/revoke", { method: "POST" });
  },

  getAlertRules(): Promise<AlertRule[]> { return request<AlertRule[]>("/api/alert-rules"); },
  createAlertRule(payload: Omit<AlertRule, "id"|"created_by"|"created_at"|"updated_at">): Promise<AlertRule> {
    return request<AlertRule>("/api/alert-rules", { method: "POST", body: JSON.stringify(payload) });
  },
  updateAlertRule(id: string, payload: Partial<Omit<AlertRule, "id"|"created_by"|"created_at"|"updated_at">>): Promise<AlertRule> {
    return request<AlertRule>("/api/alert-rules/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteAlertRule(id: string): Promise<void> {
    return request<void>("/api/alert-rules/" + encodeURIComponent(id), { method: "DELETE" });
  },

  getIncidents(status?: string): Promise<Incident[]> {
    const params = status ? "?status=" + encodeURIComponent(status) : "";
    return request<Incident[]>("/api/incidents" + params);
  },
  getIncident(id: string): Promise<Incident> {
    return request<Incident>("/api/incidents/" + encodeURIComponent(id));
  },
  getIncidentEvidence(id: string): Promise<IncidentEvidence> {
    return request<IncidentEvidence>("/api/incidents/" + encodeURIComponent(id) + "/evidence");
  },
  acknowledgeIncident(id: string): Promise<Incident> {
    return request<Incident>("/api/incidents/" + encodeURIComponent(id) + "/acknowledge", { method: "POST" });
  },

  getSlos(): Promise<SLO[]> { return request<SLO[]>("/api/slos"); },
  getSloStatus(id: string): Promise<SLOStatus> { return request<SLOStatus>("/api/slos/" + encodeURIComponent(id) + "/status"); },
  createSlo(payload: Omit<SLO, "id"|"created_by"|"created_at"|"updated_at">): Promise<SLO> {
    return request<SLO>("/api/slos", { method: "POST", body: JSON.stringify(payload) });
  },
  updateSlo(id: string, payload: Partial<Omit<SLO, "id"|"created_by"|"created_at"|"updated_at">>): Promise<SLO> {
    return request<SLO>("/api/slos/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteSlo(id: string): Promise<void> {
    return request<void>("/api/slos/" + encodeURIComponent(id), { method: "DELETE" });
  },

  getPlatformMetrics(): Promise<PlatformMetrics> {
    return request<PlatformMetrics>("/api/observability/metrics");
  },
  getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const safe = Math.max(1, Math.min(500, Math.floor(limit)));
    return request<AuditLog[]>("/api/observability/audit-logs?limit=" + safe);
  },

  createHost(payload: { name: string; environment: string }): Promise<Host> {
    return request<Host>("/api/hosts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateHost(id: string, payload: Partial<Pick<Host, "name" | "environment" | "is_active">>): Promise<Host> {
    return request<Host>("/api/hosts/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteHost(id: string): Promise<void> {
    return request<void>("/api/hosts/" + encodeURIComponent(id), { method: "DELETE" });
  },

  getUsers(): Promise<UserRecord[]> {
    return request<UserRecord[]>("/api/users");
  },

  createUser(payload: { email: string; password: string; role: string }): Promise<UserRecord> {
    return request<UserRecord>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateUser(id: string, payload: Partial<{ role: string; is_active: boolean; password: string }>): Promise<UserRecord> {
    return request<UserRecord>("/api/users/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
