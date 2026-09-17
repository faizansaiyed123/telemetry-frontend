export const openApiSpec = {
  openapi: "3.0.2",
  info: {
    title: "Telemetry Backend",
    version: "0.1.0",
    description: "Real-time telemetry dashboard backend with WebSocket streaming, REST APIs, and deterministic anomaly detection",
  },
  paths: {
    "/health": {
      get: {
        summary: "Health Check",
        description: "Returns uptime, streaming status, connected WebSocket clients, and total generated events.",
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/telemetry/current": {
      get: {
        summary: "Get Current Telemetry",
        description: "Returns the latest telemetry event.",
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/telemetry/history": {
      get: {
        summary: "Get Telemetry History",
        description: "Returns the recent bounded history of telemetry events.",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 100 },
          },
        ],
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/telemetry/stats": {
      get: {
        summary: "Get Telemetry Statistics",
        description: "Aggregated stats (min, max, avg, latest, pct_change) across history.",
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/alerts": {
      get: {
        summary: "Get Alerts",
        description: "Returns active and resolved anomaly detection alerts.",
        parameters: [
          {
            name: "active_only",
            in: "query",
            required: false,
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/simulation/status": {
      get: {
        summary: "Get Simulation Status",
        description: "Returns current simulation state.",
        responses: {
          "200": {
            description: "Successful Response",
            content: { "application/json": {} },
          },
        },
      },
    },
    "/api/simulation/start": {
      post: {
        summary: "Start Simulation",
        responses: { "200": { description: "Successful Response" } },
      },
    },
    "/api/simulation/pause": {
      post: {
        summary: "Pause Simulation",
        responses: { "200": { description: "Successful Response" } },
      },
    },
    "/api/simulation/resume": {
      post: {
        summary: "Resume Simulation",
        responses: { "200": { description: "Successful Response" } },
      },
    },
    "/api/simulation/reset": {
      post: {
        summary: "Reset Simulation",
        responses: { "200": { description: "Successful Response" } },
      },
    },
    "/api/simulation/rate": {
      post: {
        summary: "Set Telemetry Rate",
        parameters: [
          {
            name: "rate",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
        ],
        responses: { "200": { description: "Successful Response" } },
      },
    },
    "/api/simulation/trigger": {
      post: {
        summary: "Trigger Anomaly",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  metric: { type: "string", enum: ["cpu", "memory", "temperature", "latency", "error_rate"] },
                  intensity: { type: "number", default: 1.0 },
                  duration_seconds: { type: "number", default: 3.0 },
                },
                required: ["metric"],
              },
            },
          },
        },
        responses: { "200": { description: "Successful Response" } },
      },
    },
  },
};
