import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import { TelemetryEvent, TelemetryStats } from "../types/telemetry.js";

const MAX_CHART_BUFFER = 120;

export function useTelemetry(hostId?: string | null) {
  const [current, setCurrent] = useState<TelemetryEvent | null>(null);
  const [previous, setPrevious] = useState<TelemetryEvent | null>(null);
  const [streamBuffer, setStreamBuffer] = useState<TelemetryEvent[]>([]);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyEvents, setHistoryEvents] = useState<TelemetryEvent[]>([]);
  const [lastReceivedAt, setLastReceivedAt] = useState<number | null>(null);
  const [sequenceGapDetected, setSequenceGapDetected] = useState<boolean>(false);

  const lastSeqRef = useRef<number | null>(null);
  const currentRef = useRef<TelemetryEvent | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventsRef = useRef<TelemetryEvent[]>([]);

  const flushPending = useCallback(() => {
    if (pendingEventsRef.current.length === 0) return;

    const latest = pendingEventsRef.current[pendingEventsRef.current.length - 1];
    const incomingBatch = [...pendingEventsRef.current];
    pendingEventsRef.current = [];

    setPrevious(currentRef.current);
    currentRef.current = latest;
    setCurrent(latest);

    setStreamBuffer((prev) => [...prev, ...incomingBatch].slice(-MAX_CHART_BUFFER));
    setLastReceivedAt(Date.now());
  }, []);

  const handleIncomingTelemetry = useCallback(
    (event: TelemetryEvent) => {
      if (hostId && event.host_id !== hostId) return;
      if (!hostId && event.host_id) return;

      if (lastSeqRef.current !== null && event.sequence > lastSeqRef.current + 1) {
        setSequenceGapDetected(true);
      } else if (lastSeqRef.current !== null && event.sequence <= lastSeqRef.current) {
        setSequenceGapDetected(false);
      }
      lastSeqRef.current = event.sequence;

      pendingEventsRef.current.push(event);

      if (!updateTimeoutRef.current) {
        updateTimeoutRef.current = setTimeout(() => {
          updateTimeoutRef.current = null;
          flushPending();
        }, 25);
      }
    },
    [flushPending, hostId],
  );

  const fetchStats = useCallback(async () => {
    if (!hostId) {
      setStats(null);
      return;
    }
    try {
      setStatsLoading(true);
      const data = await api.getTelemetryStats(hostId);
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [hostId]);

  const fetchHistory = useCallback(async (limit = 100) => {
    if (!hostId) {
      setHistoryEvents([]);
      return [];
    }
    try {
      setHistoryLoading(true);
      const data = await api.getTelemetryHistory(limit, hostId);
      setHistoryEvents(data.events);
      return data.events;
    } catch (err) {
      console.error("Failed to load telemetry history:", err);
      setHistoryEvents([]);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [hostId]);

  const clearStream = useCallback(() => {
    setCurrent(null);
    setPrevious(null);
    setStreamBuffer([]);
    setHistoryEvents([]);
    setStats(null);
    setLastReceivedAt(null);
    currentRef.current = null;
    pendingEventsRef.current = [];
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
    lastSeqRef.current = null;
    setSequenceGapDetected(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    clearStream();

    if (!hostId) return () => { mounted = false; };

    async function init() {
      const [currRes, histRes, statsRes] = await Promise.allSettled([
        api.getCurrentTelemetry(hostId),
        api.getTelemetryHistory(60, hostId),
        api.getTelemetryStats(hostId),
      ]);

      if (!mounted) return;

      if (currRes.status === "fulfilled" && currRes.value.event) {
        setCurrent(currRes.value.event);
        currentRef.current = currRes.value.event;
        lastSeqRef.current = currRes.value.event.sequence;
        setLastReceivedAt(Date.now());
      }

      if (histRes.status === "fulfilled" && histRes.value.events.length > 0) {
        setStreamBuffer(histRes.value.events.slice(-MAX_CHART_BUFFER));
        setHistoryEvents(histRes.value.events);
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [clearStream, hostId]);

  useEffect(() => {
    const statsTimer = setInterval(() => void fetchStats(), 5000);
    return () => clearInterval(statsTimer);
  }, [fetchStats]);

  return {
    current,
    previous,
    streamBuffer,
    stats,
    statsLoading,
    historyEvents,
    historyLoading,
    lastReceivedAt,
    sequenceGapDetected,
    handleIncomingTelemetry,
    fetchStats,
    fetchHistory,
    clearStream,
  };
}
