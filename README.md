# Telemetry Backend & Real-Time Observability Dashboard

Production-grade real-time infrastructure telemetry monitoring platform built with a high-performance streaming backend and a polished React + TypeScript dashboard.

## System Architecture

```
                    TELEMETRY SYSTEM
                           │
            ┌──────────────┴──────────────┐
            │                             │
         REST API                     WebSocket
            │                             │
            ▼                             ▼
     Current/History/Stats          Live Telemetry
     Alerts/Simulation              Alerts/System
            │                             │
            └──────────────┬──────────────┘
                           ▼
                    React Dashboard
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
         Metrics         Charts         Alerts
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                  Simulation Controls
```

### Backend Components
- **Central Telemetry Engine**: Generates correlated, bounded system metrics (CPU, Memory, Temperature, Network Throughput, Requests/sec, Latency, Error Rate) with configurable frequency (1–100 Hz).
- **Statistical Anomaly Detection**: Real-time rolling z-score analysis (`z = (value - mean) / std_dev`) with severity categorization (`INFO`, `WARNING`, `CRITICAL`).
- **Alert Lifecycle Engine**: Manages detected $\rightarrow$ active $\rightarrow$ resolved states with automatic resolution upon metric normalization and alert deduplication.
- **WebSocket Streaming (`/ws/telemetry`)**: Real-time broadcasting to all connected clients.
- **REST APIs**: Full OpenAPI/Swagger compliant endpoints for queries and simulation controls.

### Frontend Dashboard
- **Live System Gauges**: 7 real-time metric cards with instant delta indicators, min/max/average ranges, and high-DPR mini sparklines.
- **Grouped Time-Series Visualizers**: Canvas-rendered smooth multi-stream charts for Compute, Traffic, and Latency/Errors with zero lag even at 100 Hz.
- **Anomaly Alerts Center**: Real-time alert feed with active filtering, severity badges, observed vs baseline readings, and resolution timestamps.
- **Simulation Control Deck**:
  - Live Stream Pause / Resume
  - Engine State Reset with confirmation
  - Stream Frequency Slider (1–100 Hz) with quick presets ([1 Hz], [10 Hz], [50 Hz], [100 Hz])
  - Fault Injection for targeted metrics (CPU spike, memory leak, thermal runaway, latency jump, error burst) with customizable intensity and duration.
- **Statistical Aggregation Matrix**: Real-time table consuming `/api/telemetry/stats` showing min, max, average, latest, and % change.
- **Historical Telemetry Log**: Interactive chronological inspection log with configurable limits (25, 50, 100, 200) and JSON export.

---

## Getting Started

### Prerequisites
- Node.js >= 20

### Installation
```bash
npm install
```

### Development
Start the dev server:
```bash
npm run dev
```
The server starts on port `3000`. Open `http://localhost:3000` to view the live React dashboard.

### Production Build
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

---

## API & WebSocket Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server uptime, streaming status, and client count |
| `GET` | `/api/telemetry/current` | Latest generated telemetry packet |
| `GET` | `/api/telemetry/history?limit=100` | Bounded historical telemetry events |
| `GET` | `/api/telemetry/stats` | Aggregated statistics (min, max, avg, latest, pct_change) |
| `GET` | `/api/alerts?active_only=false` | Active and resolved anomaly alerts |
| `GET` | `/api/simulation/status` | Current simulation engine state |
| `POST` | `/api/simulation/start` | Start telemetry stream |
| `POST` | `/api/simulation/pause` | Pause telemetry stream |
| `POST` | `/api/simulation/resume` | Resume telemetry stream |
| `POST` | `/api/simulation/reset` | Reset simulation state, history, and alerts |
| `POST` | `/api/simulation/rate?rate=N` | Set telemetry generation rate (1–100 Hz) |
| `POST` | `/api/simulation/trigger` | Inject anomaly (`metric`, `intensity`, `duration_seconds`) |
| `WS` | `/ws/telemetry` | WebSocket stream (`telemetry`, `alert`, `system`) |
| `GET` | `/docs` | Interactive Swagger UI documentation |
| `GET` | `/openapi.json` | OpenAPI 3.0 specification |

---

## Configuration

Set environment variables in `.env` (refer to `.env.example`):

```env
PORT=3000
TELEMETRY_RATE=10
MAX_TELEMETRY_RATE=100
ANOMALY_Z_THRESHOLD=3.0
MAX_HISTORY_SIZE=5000
VITE_API_BASE_URL=
```


- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with uptime, stream status, client count |
| GET | `/api/telemetry/current` | Latest telemetry event |
| GET | `/api/telemetry/history` | Bounded telemetry history (query: `limit`) |
| GET | `/api/telemetry/stats` | Aggregated statistics over history |
| GET | `/api/alerts` | Active and recent alerts |
| GET | `/api/simulation/status` | Current simulation state |
| POST | `/api/simulation/start` | Start telemetry generation |
| POST | `/api/simulation/pause` | Pause telemetry generation |
| POST | `/api/simulation/resume` | Resume telemetry generation |
| POST | `/api/simulation/reset` | Reset all telemetry state |
| POST | `/api/simulation/rate` | Set telemetry rate (query: `rate`) |
| POST | `/api/simulation/trigger` | Trigger an anomaly (body: `{"metric": "cpu"}`) |

## WebSocket

Connect to `ws://localhost:8000/ws/telemetry`

### Message Types

**telemetry** — streamed telemetry event:
```json
{
  "type": "telemetry",
  "data": {
    "timestamp": "2026-09-16T10:00:00.123Z",
    "sequence": 1234,
    "cpu": 63.4,
    "memory": 71.2,
    "temperature": 48.1,
    "network_mbps": 82.4,
    "requests_per_second": 421,
    "error_rate": 0.8,
    "latency_ms": 38.4
  }
}
```

**alert** — anomaly alert:
```json
{
  "type": "alert",
  "data": {
    "id": "alert-1",
    "timestamp": "2026-09-16T10:00:01.000Z",
    "metric": "cpu",
    "value": 95.2,
    "baseline": 62.1,
    "severity": "CRITICAL",
    "message": "CPU anomaly detected: 95.2% (baseline: 62.1%)",
    "resolved": false
  }
}
```

**system** — system status messages (pause, resume, reset, rate change):
```json
{
  "type": "system",
  "data": {
    "event": "paused",
    "message": "Telemetry generation paused"
  }
}
```

## Configuration

All settings have sensible defaults and work without a `.env` file. Copy `.env.example` to `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | Telemetry Backend | Application name |
| `APP_ENV` | development | Environment name |
| `HOST` | 0.0.0.0 | Bind host |
| `PORT` | 8000 | Bind port |
| `LOG_LEVEL` | INFO | Logging level |
| `TELEMETRY_RATE` | 10 | Events per second |
| `MAX_TELEMETRY_RATE` | 100 | Maximum allowed rate |
| `MAX_HISTORY_SIZE` | 5000 | Maximum history events retained |
| `ANOMALY_Z_THRESHOLD` | 3.0 | Z-score threshold for anomaly detection |
| `CORS_ALLOWED_ORIGINS` | http://localhost:5173,http://localhost:3000 | Comma-separated allowed CORS origins |

## Docker

```bash
docker build -t telemetry-backend .
docker run --rm -p 8000:8000 telemetry-backend
```

## Architecture Decisions

**One central generator**: A single background task produces one telemetry stream broadcast to all clients. This ensures all clients see the same data and avoids per-client resource duplication.

**In-memory bounded history**: Using `collections.deque(maxlen=...)` keeps memory bounded without database complexity. Appropriate for a real-time monitoring simulation where historical persistence is not required.

**WebSockets**: Real-time push to clients is the natural fit for telemetry streaming. Polling REST endpoints would introduce unnecessary latency and load.

**Deterministic anomaly detection**: Rolling z-score is simple, fast, deterministic, and testable. No ML or external services needed.

**No database / no Redis / no message broker**: V1 is a self-contained simulation. Adding infrastructure would add complexity without value at this stage.

## Limitations

- **In-memory state**: All telemetry history, alerts, and state are lost on restart.
- **Simulation**: Telemetry is generated, not collected from real systems.
- **Single process**: Not distributed; one process handles all clients.
- **No authentication**: No auth or authorization is implemented in V1.
- **No persistence**: No database or persistent storage layer.
