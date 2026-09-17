import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import {
  AnomalyMetric,
  HealthResponse,
  SimulationStatus,
  TriggerAnomalyPayload,
} from "../types/simulation.js";

export function useSimulation(onReset?: () => void) {
  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "info" | "error" = "info") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const refreshStatus = useCallback(async () => {
    try {
      const [simRes, healthRes] = await Promise.allSettled([
        api.getSimulationStatus(),
        api.getHealth(),
      ]);

      if (simRes.status === "fulfilled") {
        setStatus(simRes.value);
      }
      if (healthRes.status === "fulfilled") {
        setHealth(healthRes.value);
      }
    } catch {
      // ignore
    }
  }, []);

  const togglePlayPause = async () => {
    if (!status) return;
    try {
      setActionLoading("toggle");
      if (status.running) {
        await api.pauseSimulation();
        showNotification("Telemetry generation paused", "info");
      } else {
        await api.resumeSimulation();
        showNotification("Telemetry generation resumed", "success");
      }
      await refreshStatus();
    } catch (err: any) {
      showNotification(err?.message || "Failed to toggle simulation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const setRate = async (rate: number) => {
    try {
      setActionLoading("rate");
      await api.setSimulationRate(rate);
      showNotification(`Telemetry rate updated to ${rate} Hz`, "success");
      await refreshStatus();
    } catch (err: any) {
      showNotification(err?.message || "Failed to set rate", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const triggerAnomaly = async (payload: TriggerAnomalyPayload) => {
    try {
      setActionLoading(`anomaly-${payload.metric}`);
      const res = await api.triggerAnomaly(payload);
      showNotification(
        `Anomaly injected on ${payload.metric.toUpperCase()} (${payload.intensity || 1.0}x, ${payload.duration_seconds || 3}s)`,
        "success"
      );
      await refreshStatus();
      return res;
    } catch (err: any) {
      showNotification(err?.message || "Failed to trigger anomaly", "error");
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  const resetSimulation = async () => {
    try {
      setActionLoading("reset");
      await api.resetSimulation();
      showNotification("Telemetry engine reset successfully", "info");
      if (onReset) onReset();
      await refreshStatus();
    } catch (err: any) {
      showNotification(err?.message || "Failed to reset simulation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    status,
    health,
    loading,
    actionLoading,
    notification,
    togglePlayPause,
    setRate,
    triggerAnomaly,
    resetSimulation,
    refreshStatus,
  };
}
