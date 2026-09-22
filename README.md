# Telemetry Frontend

React + TypeScript web application for the Telemetry infrastructure observability platform.

The frontend contains three entry experiences:

1. A public marketing homepage that explains the product and directs visitors into the platform.
2. A public signup flow that creates viewer access and signs the user into the workspace.
3. An authenticated control center for live telemetry, alerts, analytics, hosts, administration, settings, and simulation controls.

## Product overview

```
                         Telemetry platform
                                │
                ┌───────────────┴───────────────┐
                │                               │
         Public homepage                  Authenticated app
                │                               │
        Product / service CTA            Control Center
                                                │
                 ┌──────────────┬───────────────┼──────────────┐
                 ▼              ▼               ▼              ▼
             Overview         Alerts        Analytics        Hosts
                 │                                              │
                 ├──────── Simulation controls ─────────────────┤
                 └──────── Administration / Settings ───────────┘
                                │
                    REST API + WebSocket
                                │
                                ▼
                       Telemetry Backend
```

## What the frontend does

### Public site

The / route is a service-focused landing page that makes the product understandable before login. It includes:

- live infrastructure observability positioning
- product capabilities
- workflow explanation
- dashboard preview
- clear calls to action into the workspace

### Authenticated workspace

The /app area provides:

- Live metric cards for CPU, memory, temperature, throughput, requests/sec, latency, and error rate
- Live canvas-based telemetry charts
- Real-time alert feed
- Historical telemetry inspection with bounded server-side time-series buckets and p95
- Backend-computed statistics
- Correlated incident investigation and acknowledgement
- SLOs with live SLI and remaining error budget
- Simulation start/pause/resume/reset
- Stream-rate controls
- Controlled anomaly injection
- Host management
- User and role administration
- Administrator operations console for alert rules, agent credentials, runtime metrics, and audit history
- Host heartbeat and agent version visibility
- Self-service password change
- API documentation links
- WebSocket connection and reconnect status

## Role-aware UI

| Capability | Viewer | Operator | Admin |
|---|:---:|:---:|:---:|
| View dashboard | ✓ | ✓ | ✓ |
| View alerts | ✓ | ✓ | ✓ |
| View analytics | ✓ | ✓ | ✓ |
| View hosts | ✓ | ✓ | ✓ |
| Acknowledge alerts |  | ✓ | ✓ |
| Simulation controls |  | ✓ | ✓ |
| Create/update/delete hosts |  |  | ✓ |
| Administration |  |  | ✓ |
| Change own password | ✓ | ✓ | ✓ |

Alert acknowledgement and all security-sensitive operations are enforced by the backend. Frontend role checks only control what the user sees and can request.

---

## Tech stack

| Area | Technology |
|---|---|
| UI | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| CSS | Tailwind CSS 4 |
| Icons | lucide-react |
| Runtime | Node.js 20+ |
| Package manager | npm |
| Live transport | WebSocket |
| API transport | REST / fetch |
| Tests | Node test runner via tsx |

---

## Project structure

```
telemetry-frontend/
├── src/
│   ├── components/
│   │   ├── alerts/          # Alert UI
│   │   ├── cards/           # Metric cards and sparklines
│   │   ├── charts/          # Canvas telemetry charts
│   │   ├── common/          # Shared UI and error boundary
│   │   ├── layout/          # Application shell and header
│   │   └── simulation/      # Simulation controls
│   ├── hooks/               # Telemetry, alerts, simulation, WebSocket hooks
│   ├── lib/                 # Session helpers and compatibility exports
│   ├── models/              # Shared domain types
│   ├── pages/               # Route-level screens
│   ├── services/            # Canonical REST API and WebSocket clients
│   ├── types/               # Application types
│   ├── utils/               # Formatting helpers
│   ├── App.tsx              # Route selection and authentication boundary
│   ├── index.css            # Global styling
│   └── main.tsx             # React entry point
├── tests/
│   └── frontend.test.ts
├── .env.example
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

### Key architecture boundaries

- src/services/api.ts is the canonical REST client.
- src/services/websocket.ts owns the browser WebSocket connection and reconnect strategy.
- src/lib/session.ts stores and refreshes the authenticated client session.
- src/hooks turns transport data into React state.
- src/pages composes product screens.
- The backend remains responsible for authentication, authorization, anomaly detection, persistence, and authoritative alert state.

---

## Routes

| Route | Purpose | Authentication |
|---|---|---|
| / | Public product homepage | Public |
| /login | Workspace sign-in | Public |
| /signup | Create a viewer account | Public |
| /app | Live telemetry overview | Required |
| /app/alerts | Alert center | Required |
| /app/analytics | Historical and aggregate analytics | Required |
| /app/hosts | Host inventory and agent heartbeat | Required |
| /app/incidents | Correlated incidents and evidence windows | Required |
| /app/slos | SLO and error-budget status | Required |
| /app/operations | Runtime, alert rules, agent keys, audit log | Admin |
| /app/admin | User administration | Admin |
| /app/settings | Account and password settings | Required |

Routing is intentionally lightweight and implemented in src/App.tsx because the application currently has a small route surface.

---

## Requirements

Install:

- Node.js 20 or newer
- npm

The backend must also be running for authenticated dashboard features.

---

## Environment configuration

Copy the example file:

```
cp .env.example .env
```

The frontend currently uses one primary environment variable:

| Variable | Example | Purpose |
|---|---|---|
| VITE_API_BASE_URL | http://localhost:8000 | Backend HTTP and WebSocket base URL |

Example:

```
VITE_API_BASE_URL=http://localhost:8000
```

Configure the backend CORS origins to allow the frontend origin.

---

## Local development

### Install

```
npm ci
```

### Start the development server

```
npm run dev
```

Vite uses port 3000 by default.

Open http://localhost:3000.

The public homepage is at /, account creation is at /signup, sign-in is at /login, and the authenticated application begins at /app.

---

## Production build

Build:

```
npm run build
```

Preview the production build locally:

```
npm run preview
```

Build output:

```
dist/client
```

npm start remains a Vite server alias for compatibility. For production, serve the generated static files from dist/client through a static host or web server.

---

## Backend integration

The frontend expects the API contract implemented by the Telemetry backend.

### Authentication

```
POST /api/auth/login
POST /api/auth/signup
GET  /api/auth/me
POST /api/auth/change-password
```

### Telemetry

```
GET /api/telemetry/current
GET /api/telemetry/history
GET /api/telemetry/stats
GET /api/telemetry/series
```

### Alerts

```
GET  /api/alerts
POST /api/alerts/{alert_id}/acknowledge
```

### Simulation

```
GET  /api/simulation/status
POST /api/simulation/start
POST /api/simulation/pause
POST /api/simulation/resume
POST /api/simulation/reset
POST /api/simulation/rate
POST /api/simulation/trigger
```

### Incidents, SLOs, and platform operations

```
GET  /api/incidents
GET  /api/incidents/{incident_id}
POST /api/incidents/{incident_id}/acknowledge

GET/POST/PATCH/DELETE /api/alert-rules...
GET/POST/PATCH/DELETE /api/slos...
GET  /api/slos/{slo_id}/status

GET/POST /api/api-keys...
POST /api/api-keys/{key_id}/revoke
GET  /api/observability/metrics
GET  /api/observability/audit-logs
GET  /api/observability/metrics/prometheus
POST /api/ingest/v1/telemetry
```

### Hosts and users

```
GET/POST/PATCH/DELETE /api/hosts...
GET/POST/PATCH         /api/users...
```

### Live stream

```
ws://localhost:8000/ws/telemetry?token=<jwt>
```

Use wss:// when the backend is served over HTTPS.

---

## Authentication and session handling

After signup or login, the frontend stores the access token and lightweight user profile in browser storage.

The API service attaches the bearer token to authenticated requests.

When the backend returns HTTP 401 or rejects WebSocket authentication, the stored session is cleared and the user is returned to the sign-in flow.

Public signup always creates viewer access; role elevation remains an administrator action. The browser-stored profile is a UI convenience, not an authorization boundary. The backend validates the JWT and current user status on every protected request.

---

## Live telemetry behavior

Telemetry arrives over WebSocket and is kept in a bounded client-side chart buffer.

At high stream rates, incoming events are batched before React state updates so the page does not render once for every packet.

The client also:

- tracks sequence gaps
- detects stream resets
- reconnects with bounded exponential backoff
- removes WebSocket subscriptions during cleanup
- clears pending telemetry when simulation state is reset

This separates high-frequency transport from UI rendering.

---

## Charts and visualizations

Charts use HTML canvas instead of a heavy charting dependency.

The dashboard provides:

- seven metric cards with mini sparklines
- compute and thermal chart
- traffic and throughput chart
- latency and error chart
- chart grouping tabs
- anomaly highlighting
- historical event table
- aggregate statistics table

The frontend does not independently decide whether a metric is anomalous. The backend is authoritative.

---

## Alerts

Alerts can arrive through the initial REST request or the live WebSocket stream.

Incoming alerts are merged by stable alert ID so lifecycle updates replace existing entries instead of creating duplicates.

The UI supports:

- active/all filtering
- severity display
- resolved state
- acknowledgement state
- observed value and baseline
- resolution timestamp
- refresh and retry states

---

## Administration

Administrators can:

- create users
- assign viewer, operator, or admin roles
- activate/deactivate users
- reset passwords
- add hosts
- edit host name/environment
- activate/deactivate hosts
- remove hosts

Destructive simulation reset also requires confirmation in the UI.

The backend still enforces all authorization and management safeguards.

---

## Testing and verification

Typecheck:

```
npm run lint
```

Unit tests:

```
npm test
```

Production build:

```
npm run build
```

GitHub Actions runs all three checks on pushes and pull requests targeting main.

---

## UX and accessibility

The interface is designed for responsive desktop and smaller screens.

It includes:

- responsive navigation with mobile drawer
- semantic form controls and labels
- visible loading and error states
- confirmation for destructive reset
- reconnect status and retry actions
- application-level error boundary
- restrained transitions and animation

Motion is limited to places where it communicates state or feedback.

---

## Security considerations

The frontend is not the security boundary.

For production:

- serve the application over HTTPS
- use an HTTPS API and wss:// WebSocket endpoint
- configure backend CORS for the deployed frontend origin
- never place private backend secrets in VITE environment variables
- never treat local browser state as proof of authorization
- rely on backend JWT validation and active-user checks

The frontend only needs the public API base URL.

---

## Troubleshooting

### Dashboard connection error

Check that:

1. the backend is running
2. VITE_API_BASE_URL points to the backend
3. backend CORS allows the frontend origin
4. the current user session is valid
5. the WebSocket endpoint is reachable

### Redirect back to login

The backend may have rejected the token or the user may have been deactivated. Check the /api/auth/me request and backend logs.

### Empty history or analytics

Confirm that PostgreSQL is available, migrations have been applied, and backend telemetry persistence is enabled. The live stream can operate from runtime state even when persistent history is unavailable.

---

## CI workflow

The frontend workflow:

1. installs Node.js
2. runs npm ci
3. typechecks the source
4. runs tests
5. creates a production build

This provides automated checks for type regressions, unit-test failures, and production build failures.

---

## License

MIT


## Production-oriented frontend capabilities

The authenticated control center is intentionally organized around operational workflows rather than presentation-only dashboards. Analytics queries bounded, database-side aggregates; Incidents groups related alert signals into an investigation surface; SLOs expose reliability objectives and remaining error budget; and the administrator Operations console exposes runtime pipeline pressure, stateful threshold rules, host-scoped agent credentials, and the audit trail.

Agent secrets are treated as one-time credentials: the UI only displays the returned secret immediately after creation and the listing API exposes only a prefix and lifecycle metadata. The browser never treats its cached role as an authorization boundary; the backend remains authoritative.

The live dashboard also surfaces WebSocket sequence gaps and links operators to historical Analytics for backfill investigation.
