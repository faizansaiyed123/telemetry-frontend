import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { Alert } from "../types/alerts.js";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (activeOnly = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAlerts(activeOnly);
      setAlerts(res.alerts);
      setActiveCount(res.active_count);
      setTotalCount(res.total_count);
    } catch (err: any) {
      setError(err?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIncomingAlert = useCallback((incoming: Alert) => {
    setAlerts((prev) => {
      const idx = prev.findIndex((a) => a.id === incoming.id);
      let updated: Alert[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = incoming;
      } else {
        // Prepend new alert
        updated = [incoming, ...prev];
        if (updated.length > 200) {
          updated = updated.slice(0, 200);
        }
      }
      const active = updated.filter((a) => !a.resolved).length;
      setActiveCount(active);
      setTotalCount(updated.length);
      return updated;
    });
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setActiveCount(0);
    setTotalCount(0);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    activeCount,
    totalCount,
    loading,
    error,
    refresh: fetchAlerts,
    handleIncomingAlert,
    clearAlerts,
  };
}
