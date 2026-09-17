import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api.js";
import { TelemetryEvent, TelemetryStats } from "../types/telemetry.js";

const MAX_CHART_BUFFER = 120;

export function useTelemetry() {
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
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEventsRef = useRef<TelemetryEvent[]>([]);

  // Batch high-frequency incoming telemetry to maintain smooth 60fps UI even at 100Hz
  const flushPending = useCallback(() => {
    if (pendingEventsRef.current.length === 0) return;

    const latest = pendingEventsRef.current[pendingEventsRef.current.length - 1];
    const incomingBatch = [...pendingEventsRef.current];
    pendingEventsRef.current = [];

    setCurrent((prev) => {
      setPrevious(prev);
      return latest;
    });

    setStreamBuffer((prev) => {
      const merged = [...prev, ...incomingBatch];
      return merged.slice(-MAX_CHART_BUFFER);
    });

    setLastReceivedAt(Date.now());
  }, []);

  const handleIncomingTelemetry = useCallback(
    (event: TelemetryEvent) => {
      // Check sequence integrity
      if (lastSeqRef.current !== null && event.sequence > lastSeqRef.current + 1) {
        setSequenceGapDetected(true);
      } else if (lastSeqRef.current !== null && event.sequence <= lastSeqRef.current) {
        // Sequence reset detected
        setSequenceGapDetected(false);
      }
      lastSeqRef.current = event.sequence;

      pendingEventsRef.current.push(event);

      // Debounce render flush to max 30-40fps (approx 25ms) so DOM & canvas don't choke at 100Hz
      if (!updateTimeoutRef.current) {
        updateTimeoutRef.current = setTimeout(() => {
          updateTimeoutRef.current = null;
          flushPending();
        }, 25);
      }
    },
    [flushPending]
  );

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await api.getTelemetryStats();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (limit = 100) => {
    try {
      setHistoryLoading(true);
      const data = await api.getTelemetryHistory(limit);
      setHistoryEvents(data.events);
      return data.events;
    } catch (err) {
      console.error("Failed to load telemetry history:", err);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const clearStream = useCallback(() => {
    setCurrent(null);
    setPrevious(null);
    setStreamBuffer([]);
    setHistoryEvents([]);
    lastSeqRef.current = null;
    setSequenceGapDetected(false);
  }, []);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [currRes, histRes, statsRes] = await Promise.allSettled([
          api.getCurrentTelemetry(),
          api.getTelemetryHistory(60),
          api.getTelemetryStats(),
        ]);

        if (!mounted) return;

        if (currRes.status === "fulfilled" && currRes.value.event) {
          setCurrent(currRes.value.event);
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
      } catch {
        // initial network fallback
      }
    }
    init();

    // Periodically sync stats every 5 seconds
    const statsTimer = setInterval(fetchStats, 5000);

    return () => {
      mounted = false;
      clearInterval(statsTimer);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
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
