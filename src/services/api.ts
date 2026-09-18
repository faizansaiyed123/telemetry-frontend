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

export const api = {
  login(email: string, password: string): Promise<AuthResponse> {
    const body = new URLSearchParams({ username: email, password });
    return fetch(API_BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }).then(async (res) => {
      if (!res.ok) {
        let message = "Invalid email or password";
        try {
          const data = await res.json();
          if (typeof data?.detail === "string") message = data.detail;
        } catch {
          // Keep the authentication fallback message when the response is not JSON.
        }
        throw new ApiError(message, res.status);
      }
      return res.json() as Promise<AuthResponse>;
    });
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

  getTelemetryHistory(limit = 100): Promise<TelemetryHistoryResponse> {
    const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)));
    return request<TelemetryHistoryResponse>("/api/telemetry/history?limit=" + safeLimit);
  },

  getTelemetryStats(): Promise<TelemetryStats> {
    return request<TelemetryStats>("/api/telemetry/stats");
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
