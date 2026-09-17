import { Alert, AnomalyResult, Severity, TelemetryEvent, TelemetryStats } from "../models/types.js";
import { computeStats } from "./aggregation.js";
import { AnomalyDetector } from "./anomalyDetector.js";
import { TelemetryGenerator } from "./telemetryGenerator.js";
import { WebSocketManager } from "./websocketManager.js";

export class TelemetryManager {
  private generator: TelemetryGenerator;
  private anomalyDetector: AnomalyDetector;
  private _wsManager: WebSocketManager;

  private history: TelemetryEvent[] = [];
  private maxHistorySize: number;
  private current: TelemetryEvent | null = null;

  private _sequence = 0;
  private _eventsGenerated = 0;
  private _running = false;
  private _rate: number;
  private _maxRate: number;

  private alerts: Alert[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private alertIdCounter = 0;

  private timer: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;

  constructor(
    maxHistorySize = 5000,
    telemetryRate = 10,
    maxRate = 100,
    anomalyThreshold = 3.0
  ) {
    this.maxHistorySize = maxHistorySize;
    this._rate = telemetryRate;
    this._maxRate = maxRate;

    this.generator = new TelemetryGenerator();
    this.anomalyDetector = new AnomalyDetector(anomalyThreshold);
    this._wsManager = new WebSocketManager();
  }

  get wsManager(): WebSocketManager {
    return this._wsManager;
  }

  async start(): Promise<void> {
    if (this._running) return;
    this._running = true;
    this.startTime = new Date();
    this.scheduleNextTick();
    console.log(`[Telemetry] Started at ${this._rate} events/sec`);
  }

  async stop(): Promise<void> {
    this._running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("[Telemetry] Stopped");
  }

  async pause(): Promise<void> {
    if (!this._running) return;
    this._running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log("[Telemetry] Paused");
    this.broadcastSystem("paused", "Telemetry generation paused");
  }

  async resume(): Promise<void> {
    if (this._running) return;
    this._running = true;
    this.scheduleNextTick();
    console.log(`[Telemetry] Resumed at ${this._rate} events/sec`);
    this.broadcastSystem("resumed", "Telemetry generation resumed");
  }

  async reset(): Promise<void> {
    const wasRunning = this._running;
    await this.stop();

    this.history = [];
    this.current = null;
    this._sequence = 0;
    this._eventsGenerated = 0;
    this.alerts = [];
    this.activeAlerts.clear();
    this.alertIdCounter = 0;
    this.generator.reset();
    this.anomalyDetector.reset();

    if (wasRunning) {
      this.startTime = new Date();
    }

    this._wsManager.disconnectAll();
    console.log("[Telemetry] State reset");
    this.broadcastSystem("reset", "Telemetry state has been reset");
  }

  async setRate(rate: number): Promise<void> {
    if (rate < 1 || rate > this._maxRate) {
      throw new Error(`Rate must be between 1 and ${this._maxRate}`);
    }
    const oldRate = this._rate;
    this._rate = rate;
    console.log(`[Telemetry] Rate changed from ${oldRate} to ${rate}/sec`);
    this.broadcastSystem("rate_changed", `Telemetry rate changed to ${rate}/sec`);
  }

  async triggerAnomaly(metric: string, intensity = 1.0, durationSeconds = 3.0): Promise<void> {
    const durationEvents = Math.max(1, Math.round(durationSeconds * this._rate));
    this.generator.setAnomaly(metric, intensity, durationEvents);
    console.log(`[Telemetry] Anomaly triggered on ${metric} (intensity=${intensity}, duration=${durationEvents} events)`);
    this.broadcastSystem("anomaly_triggered", `Anomaly triggered on ${metric}`);
  }

  // --- Queries ---

  get running(): boolean {
    return this._running;
  }

  get rate(): number {
    return this._rate;
  }

  get maxRate(): number {
    return this._maxRate;
  }

  get sequence(): number {
    return this._sequence;
  }

  get eventsGenerated(): number {
    return this._eventsGenerated;
  }

  get activeAnomaly(): string | null {
    return this.generator.activeAnomaly;
  }

  get connectedClients(): number {
    return this._wsManager.clientCount;
  }

  get activeAlertCount(): number {
    return this.activeAlerts.size;
  }

  get totalAlertCount(): number {
    return this.alerts.length;
  }

  get uptimeSeconds(): number {
    if (!this.startTime) return 0.0;
    return Number(((Date.now() - this.startTime.getTime()) / 1000).toFixed(2));
  }

  getCurrent(): TelemetryEvent | null {
    return this.current;
  }

  getHistory(limit = 100): TelemetryEvent[] {
    const safeLimit = Math.max(1, Math.min(limit, this.history.length));
    return this.history.slice(-safeLimit);
  }

  getStats(): TelemetryStats {
    return computeStats(this.history);
  }

  getAlerts(activeOnly = false): Alert[] {
    const active = Array.from(this.activeAlerts.values());
    if (activeOnly) return active;
    const resolved = this.alerts.filter((a) => a.resolved);
    return [...active, ...resolved];
  }

  // --- Generation Loop ---

  private scheduleNextTick(): void {
    if (!this._running) return;
    const intervalMs = Math.max(5, 1000 / this._rate);
    this.timer = setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, intervalMs);
  }

  private tick(): void {
    this._sequence += 1;
    this._eventsGenerated += 1;

    const event = this.generator.generate(this._sequence);
    this.current = event;
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    const anomalyResults = this.anomalyDetector.update(event);
    const alertsToBroadcast = this.processAnomalyResults(anomalyResults, event);

    // Broadcast telemetry event
    const telemetryMsg = JSON.stringify({ type: "telemetry", data: event });
    this._wsManager.broadcast(telemetryMsg);

    // Broadcast any new or resolved alerts
    for (const alert of alertsToBroadcast) {
      const alertMsg = JSON.stringify({ type: "alert", data: alert });
      this._wsManager.broadcast(alertMsg);
    }
  }

  private processAnomalyResults(results: AnomalyResult[], event: TelemetryEvent): Alert[] {
    const broadcasts: Alert[] = [];

    for (const result of results) {
      const metric = result.metric;
      if (result.is_anomaly) {
        if (!this.activeAlerts.has(metric)) {
          this.alertIdCounter += 1;
          const alert: Alert = {
            id: `alert-${this.alertIdCounter}`,
            timestamp: event.timestamp,
            metric,
            value: result.value,
            baseline: result.baseline,
            severity: result.severity,
            message: `${metric} anomaly detected: ${result.value} (baseline: ${result.baseline}, z-score: ${result.z_score})`,
            resolved: false,
          };
          this.activeAlerts.set(metric, alert);
          this.alerts.push(alert);
          if (this.alerts.length > 200) {
            this.alerts.shift();
          }
          broadcasts.push(alert);
          console.warn(`[Alert] Created: ${metric}=${result.value} (z=${result.z_score}, severity=${result.severity})`);
        } else {
          const existing = this.activeAlerts.get(metric)!;
          existing.value = result.value;
        }
      } else {
        if (this.activeAlerts.has(metric)) {
          const alert = this.activeAlerts.get(metric)!;
          this.activeAlerts.delete(metric);
          alert.resolved = true;
          alert.resolved_at = new Date().toISOString();
          broadcasts.push(alert);
          console.log(`[Alert] Resolved: ${metric}`);
        }
      }
    }

    return broadcasts;
  }

  private broadcastSystem(event: string, message: string): void {
    const msg = JSON.stringify({
      type: "system",
      data: { event, message },
    });
    this._wsManager.broadcast(msg);
  }
}
