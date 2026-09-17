import {
  CurrentTelemetryResponse,
  TelemetryHistoryResponse,
  TelemetryStats,
} from "../types/telemetry.js";
import { AlertsResponse } from "../types/alerts.js";
import {
  HealthResponse,
  SimulationControlResponse,
  SimulationStatus,
  TriggerAnomalyPayload,
  TriggerAnomalyResponse,
} from "../types/simulation.js";

// Configurable API base URL with fallback to current origin
export const API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")
    : "";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch {
        errorData = await res.text();
      }
      throw new ApiError(
        errorData?.detail || errorData?.message || `Request failed with status ${res.status}`,
        res.status,
        errorData
      );
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err?.message || "Network request failed", 0);
  }
}

export const api = {
  getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>("/health");
  },

  getCurrentTelemetry(): Promise<CurrentTelemetryResponse> {
    return request<CurrentTelemetryResponse>("/api/telemetry/current");
  },

  getTelemetryHistory(limit = 100): Promise<TelemetryHistoryResponse> {
    return request<TelemetryHistoryResponse>(`/api/telemetry/history?limit=${Math.max(1, limit)}`);
  },

  getTelemetryStats(): Promise<TelemetryStats> {
    return request<TelemetryStats>("/api/telemetry/stats");
  },

  getAlerts(activeOnly = false): Promise<AlertsResponse> {
    return request<AlertsResponse>(`/api/alerts?active_only=${activeOnly}`);
  },

  getSimulationStatus(): Promise<SimulationStatus> {
    return request<SimulationStatus>("/api/simulation/status");
  },

  startSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/start", {
      method: "POST",
    });
  },

  pauseSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/pause", {
      method: "POST",
    });
  },

  resumeSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/resume", {
      method: "POST",
    });
  },

  resetSimulation(): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>("/api/simulation/reset", {
      method: "POST",
    });
  },

  setSimulationRate(rate: number): Promise<SimulationControlResponse> {
    return request<SimulationControlResponse>(`/api/simulation/rate?rate=${encodeURIComponent(rate)}`, {
      method: "POST",
    });
  },

  triggerAnomaly(payload: TriggerAnomalyPayload): Promise<TriggerAnomalyResponse> {
    return request<TriggerAnomalyResponse>("/api/simulation/trigger", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
