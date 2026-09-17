export interface Settings {
  appName: string;
  appEnv: string;
  host: string;
  port: number;
  logLevel: string;
  telemetryRate: number;
  maxTelemetryRate: number;
  maxHistorySize: number;
  anomalyZThreshold: number;
  corsAllowedOrigins: string;
}

export function getSettings(): Settings {
  return {
    appName: process.env.APP_NAME || "Telemetry Backend",
    appEnv: process.env.APP_ENV || "development",
    host: process.env.HOST || "0.0.0.0",
    port: parseInt(process.env.PORT || "3000", 10) || 3000,
    logLevel: process.env.LOG_LEVEL || "INFO",
    telemetryRate: Math.max(1, parseInt(process.env.TELEMETRY_RATE || "10", 10) || 10),
    maxTelemetryRate: Math.max(1, parseInt(process.env.MAX_TELEMETRY_RATE || "100", 10) || 100),
    maxHistorySize: Math.max(1, parseInt(process.env.MAX_HISTORY_SIZE || "5000", 10) || 5000),
    anomalyZThreshold: parseFloat(process.env.ANOMALY_Z_THRESHOLD || "3.0") || 3.0,
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS || "*",
  };
}
