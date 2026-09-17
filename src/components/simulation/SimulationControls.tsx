import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  Flame,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Zap,
} from "lucide-react";
import { AnomalyMetric, SimulationStatus } from "../../types/simulation.js";

interface SimulationControlsProps {
  status: SimulationStatus | null;
  actionLoading: string | null;
  onTogglePlayPause: () => void;
  onSetRate: (rate: number) => void;
  onTriggerAnomaly: (payload: {
    metric: AnomalyMetric;
    intensity: number;
    duration_seconds: number;
  }) => void;
  onReset: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  status,
  actionLoading,
  onTogglePlayPause,
  onSetRate,
  onTriggerAnomaly,
  onReset,
}) => {
  const [selectedRate, setSelectedRate] = useState<number>(status?.rate || 10);
  const [anomalyMetric, setAnomalyMetric] = useState<AnomalyMetric>("cpu");
  const [anomalyIntensity, setAnomalyIntensity] = useState<number>(1.5);
  const [anomalyDuration, setAnomalyDuration] = useState<number>(4.0);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const isRunning = status?.running ?? true;
  const currentRate = status?.rate ?? 10;

  const handleApplyRate = () => {
    onSetRate(selectedRate);
  };

  const handleTrigger = () => {
    onTriggerAnomaly({
      metric: anomalyMetric,
      intensity: anomalyIntensity,
      duration_seconds: anomalyDuration,
    });
  };

  return (
    <div
      id="simulation-controls"
      className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-5"
    >
      {/* Header with Title and Engine State */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Telemetry Simulation Engine
            </h3>
            <p className="text-[11px] text-slate-500">
              Live broadcast controls, variable stream frequency & fault injection
            </p>
          </div>
        </div>

        {/* Engine Play/Pause + Reset */}
        <div className="flex items-center gap-2">
          <button
            id="btn-play-pause"
            onClick={onTogglePlayPause}
            disabled={actionLoading === "toggle"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide cursor-pointer transition-all shadow-sm ${
              isRunning
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Stream
              </>
            )}
          </button>

          <button
            id="btn-reset-simulation"
            onClick={() => setShowResetConfirm(true)}
            disabled={actionLoading === "reset"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            title="Reset telemetry history, sequence numbers, and alerts"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Reset State
          </button>
        </div>
      </div>

      {/* Control Grid: Rate Controller & Fault Injection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stream Frequency / Rate Controls */}
        <div className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Activity className="w-4 h-4 text-cyan-400" />
              Stream Frequency
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              Current: {currentRate} Hz
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Slider Adjustment</span>
              <span className="font-mono text-white font-bold">{selectedRate} events/sec</span>
            </div>
            <input
              type="range"
              id="slider-stream-rate"
              min="1"
              max="100"
              value={selectedRate}
              onChange={(e) => setSelectedRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Quick presets */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {[1, 10, 50, 100].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRate(r);
                    onSetRate(r);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    currentRate === r
                      ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm shadow-cyan-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {r} Hz
                </button>
              ))}
            </div>

            <button
              onClick={handleApplyRate}
              disabled={selectedRate === currentRate || actionLoading === "rate"}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                selectedRate === currentRate
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
              }`}
            >
              Apply Rate
            </button>
          </div>
        </div>

        {/* Anomaly Fault Injection Panel */}
        <div className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Flame className="w-4 h-4 text-rose-400" />
              Fault Injection / Anomaly Trigger
            </div>
            {status?.active_anomaly && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                Active: {status.active_anomaly.toUpperCase()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Metric Select */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Metric</label>
              <select
                id="select-anomaly-metric"
                value={anomalyMetric}
                onChange={(e) => setAnomalyMetric(e.target.value as AnomalyMetric)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="cpu">CPU Usage</option>
                <option value="memory">Memory Leak</option>
                <option value="temperature">Overheating</option>
                <option value="latency">Latency Spike</option>
                <option value="error_rate">Error Burst</option>
              </select>
            </div>

            {/* Intensity Select */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Intensity</label>
              <select
                id="select-anomaly-intensity"
                value={anomalyIntensity}
                onChange={(e) => setAnomalyIntensity(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="1.0">1.0x (Mild)</option>
                <option value="1.5">1.5x (Moderate)</option>
                <option value="2.5">2.5x (Severe)</option>
                <option value="3.5">3.5x (Extreme)</option>
              </select>
            </div>

            {/* Duration Select */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
              <select
                id="select-anomaly-duration"
                value={anomalyDuration}
                onChange={(e) => setAnomalyDuration(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="2.0">2 seconds</option>
                <option value="4.0">4 seconds</option>
                <option value="8.0">8 seconds</option>
                <option value="15.0">15 seconds</option>
              </select>
            </div>
          </div>

          <button
            id="btn-trigger-anomaly"
            onClick={handleTrigger}
            disabled={Boolean(actionLoading?.startsWith("anomaly"))}
            className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 hover:border-rose-500/60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <AlertOctagon className="w-4 h-4" />
            Inject {anomalyMetric.toUpperCase()} Anomaly
          </button>
        </div>
      </div>

      {/* Confirmation modal for Reset State */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Reset Simulation State?</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will clear the backend's bounded telemetry history, reset sequence counters to 0,
              and purge all active and resolved statistical anomaly alerts.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onReset();
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
