import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import cors from "cors";
import express, { Request, Response } from "express";
import { WebSocketServer } from "ws";
import { openApiSpec } from "./src/api/openapi.js";
import { getSettings } from "./src/core/config.js";
import { ANOMALY_METRICS } from "./src/services/telemetryGenerator.js";
import { TelemetryManager } from "./src/services/telemetryManager.js";
import { getDashboardHtml } from "./src/ui/dashboardHtml.js";
import { getSwaggerHtml } from "./src/ui/swaggerHtml.js";

const settings = getSettings();
const app = express();
const server = http.createServer(app);

// CORS
const allowedOrigins = settings.corsAllowedOrigins === "*"
  ? "*"
  : settings.corsAllowedOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Initialize Telemetry Manager
const telemetryManager = new TelemetryManager(
  settings.maxHistorySize,
  settings.telemetryRate,
  settings.maxTelemetryRate,
  settings.anomalyZThreshold
);

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/ws/telemetry") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws) => {
  telemetryManager.wsManager.register(ws);

  ws.on("close", () => {
    telemetryManager.wsManager.unregister(ws);
  });

  ws.on("error", () => {
    telemetryManager.wsManager.unregister(ws);
  });
});

// --- REST Endpoints ---

// Health Check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    uptime_seconds: telemetryManager.uptimeSeconds,
    stream_active: telemetryManager.running,
    connected_clients: telemetryManager.connectedClients,
    events_generated: telemetryManager.eventsGenerated,
  });
});

// Telemetry
app.get("/api/telemetry/current", (_req: Request, res: Response) => {
  const event = telemetryManager.getCurrent();
  res.json({
    event,
    available: event !== null,
  });
});

app.get("/api/telemetry/history", (req: Request, res: Response) => {
  const limitParam = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
  const limit = Math.max(1, Math.min(5000, isNaN(limitParam) ? 100 : limitParam));
  const events = telemetryManager.getHistory(limit);
  res.json({
    events,
    count: events.length,
    limit,
  });
});

app.get("/api/telemetry/stats", (_req: Request, res: Response) => {
  res.json(telemetryManager.getStats());
});

// Alerts
app.get("/api/alerts", (req: Request, res: Response) => {
  const activeOnly = String(req.query.active_only).toLowerCase() === "true";
  const alerts = telemetryManager.getAlerts(activeOnly);
  res.json({
    alerts,
    active_count: telemetryManager.activeAlertCount,
    total_count: telemetryManager.totalAlertCount,
  });
});

// Simulation Controls
app.get("/api/simulation/status", (_req: Request, res: Response) => {
  res.json({
    running: telemetryManager.running,
    rate: telemetryManager.rate,
    sequence: telemetryManager.sequence,
    events_generated: telemetryManager.eventsGenerated,
    active_anomaly: telemetryManager.activeAnomaly,
    connected_clients: telemetryManager.connectedClients,
    uptime_seconds: telemetryManager.uptimeSeconds,
  });
});

app.post("/api/simulation/start", async (_req: Request, res: Response) => {
  if (telemetryManager.running) {
    res.json({ status: "already_running", message: "Telemetry generation is already running" });
    return;
  }
  await telemetryManager.start();
  res.json({ status: "started", message: "Telemetry generation started" });
});

app.post("/api/simulation/pause", async (_req: Request, res: Response) => {
  if (!telemetryManager.running) {
    res.json({ status: "already_paused", message: "Telemetry generation is already paused" });
    return;
  }
  await telemetryManager.pause();
  res.json({ status: "paused", message: "Telemetry generation paused" });
});

app.post("/api/simulation/resume", async (_req: Request, res: Response) => {
  if (telemetryManager.running) {
    res.json({ status: "already_running", message: "Telemetry generation is already running" });
    return;
  }
  await telemetryManager.resume();
  res.json({ status: "resumed", message: "Telemetry generation resumed" });
});

app.post("/api/simulation/reset", async (_req: Request, res: Response) => {
  await telemetryManager.reset();
  res.json({ status: "reset", message: "Telemetry state has been reset" });
});

app.post("/api/simulation/rate", async (req: Request, res: Response) => {
  const rawRate = req.query.rate ?? req.body?.rate;
  const rate = parseInt(String(rawRate), 10);
  if (isNaN(rate) || rate < 1 || rate > settings.maxTelemetryRate) {
    res.status(400).json({ detail: `Rate must be between 1 and ${settings.maxTelemetryRate}` });
    return;
  }
  try {
    await telemetryManager.setRate(rate);
    res.json({ status: "rate_set", rate, message: `Telemetry rate set to ${rate}/sec` });
  } catch (err: any) {
    res.status(400).json({ detail: err.message });
  }
});

app.post("/api/simulation/trigger", async (req: Request, res: Response) => {
  const { metric, intensity = 1.0, duration_seconds = 3.0 } = req.body || {};
  if (!metric || !ANOMALY_METRICS.has(metric)) {
    res.status(422).json({
      detail: [
        {
          loc: ["body", "metric"],
          msg: `Input should be 'cpu', 'memory', 'temperature', 'latency', or 'error_rate'`,
          type: "enum",
        },
      ],
    });
    return;
  }

  const safeIntensity = Math.max(0.1, Math.min(10.0, Number(intensity) || 1.0));
  const safeDuration = Math.max(0.1, Math.min(60.0, Number(duration_seconds) || 3.0));

  await telemetryManager.triggerAnomaly(metric, safeIntensity, safeDuration);
  res.json({
    status: "triggered",
    metric,
    intensity: safeIntensity,
    duration_seconds: safeDuration,
    message: `Anomaly triggered on ${metric}`,
  });
});

// Documentation and Live Interactive UI
app.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

app.get("/docs", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(getSwaggerHtml());
});

app.get("/redoc", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(getSwaggerHtml());
});

app.get("/legacy", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(getDashboardHtml());
});

const clientDist = path.resolve("dist/client");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req: Request, res: Response, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path === "/health" ||
      req.path === "/docs" ||
      req.path === "/openapi.json" ||
      req.path === "/redoc" ||
      req.path === "/legacy"
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  // Vite dev middleware fallback
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// Start Server
const PORT = 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, async () => {
  console.log(`[Telemetry Backend] Server listening on http://${HOST}:${PORT}`);
  console.log(`[Telemetry Backend] Swagger UI available on http://${HOST}:${PORT}/docs`);
  console.log(`[Telemetry Backend] WebSocket endpoint on ws://${HOST}:${PORT}/ws/telemetry`);
  await telemetryManager.start();
});

// Graceful shutdown
async function shutdown() {
  console.log("[Telemetry Backend] Shutting down...");
  await telemetryManager.stop();
  telemetryManager.wsManager.disconnectAll();
  server.close(() => {
    console.log("[Telemetry Backend] Closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
