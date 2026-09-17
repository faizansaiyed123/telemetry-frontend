import { TelemetryEvent } from "../models/types.js";

export class AnomalyTrigger {
  metric: string;
  intensity: number;
  duration: number;
  elapsed: number;

  constructor(metric: string, intensity = 1.0, duration = 30) {
    this.metric = metric;
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
  }

  isActive(): boolean {
    return this.elapsed < this.duration;
  }

  tick(): void {
    this.elapsed += 1;
  }
}

export class GeneratorState {
  cpu = 45.0;
  memory = 60.0;
  temperature = 50.0;
  network_mbps = 100.0;
  requests_per_second = 500;
  error_rate = 0.5;
  latency_ms = 30.0;

  phase: number = Math.random() * 2 * Math.PI;
  anomaly: AnomalyTrigger | null = null;
}

export const ANOMALY_METRICS = new Set(["cpu", "memory", "temperature", "latency", "error_rate"]);

function smoothNoise(phase: number, freq = 1.0): number {
  return Math.sin(phase * freq);
}

function gaussRandom(mean = 0, stdev = 1): number {
  const u = Math.max(1e-7, 1 - Math.random());
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdev;
}

function addNoise(base: number, amplitude: number): number {
  return base + gaussRandom(0, amplitude);
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export class TelemetryGenerator {
  state: GeneratorState;

  constructor() {
    this.state = new GeneratorState();
  }

  setAnomaly(metric: string, intensity = 1.0, duration = 30): void {
    if (!ANOMALY_METRICS.has(metric)) {
      throw new Error(`Unknown anomaly metric: ${metric}`);
    }
    this.state.anomaly = new AnomalyTrigger(metric, intensity, duration);
  }

  clearAnomaly(): void {
    this.state.anomaly = null;
  }

  get activeAnomaly(): string | null {
    if (this.state.anomaly && this.state.anomaly.isActive()) {
      return this.state.anomaly.metric;
    }
    return null;
  }

  generate(sequence: number): TelemetryEvent {
    const s = this.state;
    s.phase += 0.15;

    const cpuVar = 8 * smoothNoise(s.phase, 0.3);
    const memVar = 5 * smoothNoise(s.phase + 1.0, 0.2);
    const tempVar = 4 * smoothNoise(s.phase + 2.0, 0.25);
    const netVar = 20 * smoothNoise(s.phase + 3.0, 0.4);
    const rpsVar = 100 * smoothNoise(s.phase + 4.0, 0.35);
    const errVar = 0.3 * smoothNoise(s.phase + 5.0, 0.15);
    const latVar = 8 * smoothNoise(s.phase + 6.0, 0.3);

    let cpu = addNoise(s.cpu + cpuVar, 1.5);
    let memory = addNoise(s.memory + memVar, 1.0);
    let temperature = addNoise(s.temperature + tempVar, 0.8);
    let network_mbps = addNoise(s.network_mbps + netVar, 5.0);
    let requests_per_second = Math.round(addNoise(s.requests_per_second + rpsVar, 20));
    let error_rate = addNoise(s.error_rate + errVar, 0.1);
    let latency_ms = addNoise(s.latency_ms + latVar, 2.0);

    // Apply anomaly injection
    if (s.anomaly && s.anomaly.isActive()) {
      const intensity = s.anomaly.intensity * (1.0 - (s.anomaly.elapsed / s.anomaly.duration) * 0.3);
      const metric = s.anomaly.metric;

      if (metric === "cpu") {
        cpu = Math.min(100, cpu + 40 * intensity);
        latency_ms += 20 * intensity;
        temperature += 8 * intensity;
        error_rate += 1.5 * intensity;
      } else if (metric === "memory") {
        memory = Math.min(100, memory + 35 * intensity);
        latency_ms += 15 * intensity;
        error_rate += 0.8 * intensity;
      } else if (metric === "temperature") {
        temperature = Math.min(120, temperature + 30 * intensity);
        cpu = Math.max(0, cpu - 5 * intensity);
        error_rate += 2.0 * intensity;
        latency_ms += 10 * intensity;
      } else if (metric === "latency") {
        latency_ms += 60 * intensity;
        error_rate += 3.0 * intensity;
        requests_per_second = Math.max(0, Math.round(requests_per_second * (1 - 0.2 * intensity)));
      } else if (metric === "error_rate") {
        error_rate = Math.min(100, error_rate + 15 * intensity);
        requests_per_second = Math.max(0, Math.round(requests_per_second * (1 - 0.1 * intensity)));
      }

      s.anomaly.tick();
      if (!s.anomaly.isActive()) {
        s.anomaly = null;
      }
    }

    // Smooth baselines toward current values (slow drift)
    s.cpu = s.cpu * 0.95 + cpu * 0.05;
    s.memory = s.memory * 0.97 + memory * 0.03;
    s.temperature = s.temperature * 0.96 + temperature * 0.04;
    s.network_mbps = s.network_mbps * 0.95 + network_mbps * 0.05;
    s.requests_per_second = Math.round(s.requests_per_second * 0.95 + requests_per_second * 0.05);
    s.error_rate = s.error_rate * 0.97 + error_rate * 0.03;
    s.latency_ms = s.latency_ms * 0.95 + latency_ms * 0.05;

    // Clamp to valid ranges
    cpu = clamp(cpu, 0, 100);
    memory = clamp(memory, 0, 100);
    temperature = clamp(temperature, 0, 120);
    network_mbps = clamp(network_mbps, 0, 10000);
    requests_per_second = clamp(requests_per_second, 0, 1000000);
    error_rate = clamp(error_rate, 0, 100);
    latency_ms = clamp(latency_ms, 0, 10000);

    return {
      timestamp: new Date().toISOString(),
      sequence,
      cpu: Number(cpu.toFixed(1)),
      memory: Number(memory.toFixed(1)),
      temperature: Number(temperature.toFixed(1)),
      network_mbps: Number(network_mbps.toFixed(1)),
      requests_per_second,
      error_rate: Number(error_rate.toFixed(2)),
      latency_ms: Number(latency_ms.toFixed(1)),
    };
  }

  reset(): void {
    this.state = new GeneratorState();
    this.clearAnomaly();
  }
}
