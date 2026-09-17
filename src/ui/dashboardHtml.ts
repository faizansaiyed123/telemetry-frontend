export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telemetry Backend — Real-time Dashboard</title>
  <style>
    :root {
      --bg: #0b0f19;
      --surface: #131b2e;
      --surface-border: #1e293b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --danger: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font);
      line-height: 1.5;
      padding: 24px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--surface-border);
      gap: 16px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge.disconnected {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: currentColor;
    }
    .top-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .stat-pill {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
    }
    .stat-pill span {
      color: var(--text-muted);
      margin-right: 4px;
    }
    .controls-bar {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .controls-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    button {
      background: var(--surface-border);
      color: var(--text-main);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.05s ease;
    }
    button:hover {
      background: #334155;
    }
    button:active {
      transform: scale(0.98);
    }
    button.primary {
      background: var(--accent);
      border-color: var(--accent);
    }
    button.primary:hover {
      background: var(--accent-hover);
    }
    button.danger-btn {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    button.danger-btn:hover {
      background: rgba(239, 68, 68, 0.35);
    }
    .slider-container {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    input[type=range] {
      accent-color: var(--accent);
      cursor: pointer;
    }
    .anomaly-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .card-label {
      font-size: 13px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .card-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .card-unit {
      font-size: 14px;
      color: var(--text-muted);
      font-weight: 400;
      margin-left: 2px;
    }
    .progress-bar-bg {
      width: 100%;
      height: 6px;
      background: #1e293b;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 12px;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: var(--accent);
      transition: width 0.2s ease, background-color 0.2s ease;
    }
    .split-view {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    @media (max-width: 840px) {
      .split-view { grid-template-columns: 1fr; }
    }
    .section-card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #alertsList {
      max-height: 320px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .alert-item {
      padding: 10px 12px;
      border-radius: 8px;
      background: #0f172a;
      border-left: 4px solid var(--accent);
      font-size: 13px;
    }
    .alert-item.CRITICAL { border-left-color: var(--danger); background: rgba(239, 68, 68, 0.08); }
    .alert-item.WARNING { border-left-color: var(--warning); background: rgba(245, 158, 11, 0.08); }
    .alert-item.resolved { opacity: 0.6; border-left-color: var(--success); }
    .alert-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .api-links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .api-link-btn {
      text-decoration: none;
      color: #93c5fd;
      background: #1e293b;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .api-link-btn:hover {
      background: #334155;
      color: #bfdbfe;
    }
    canvas {
      width: 100%;
      height: 180px;
      background: #0f172a;
      border-radius: 8px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand-title">
        <span>⚡ Telemetry Backend</span>
        <div id="wsStatusBadge" class="badge">
          <span class="status-dot"></span>
          <span id="wsStatusText">WebSocket: Connecting</span>
        </div>
      </div>
      <div class="top-stats">
        <div class="stat-pill"><span>Events:</span><strong id="statEvents">0</strong></div>
        <div class="stat-pill"><span>Rate:</span><strong id="statRate">10/s</strong></div>
        <div class="stat-pill"><span>Clients:</span><strong id="statClients">0</strong></div>
        <div class="stat-pill"><span>Active Alerts:</span><strong id="statAlerts" style="color: #34d399;">0</strong></div>
      </div>
    </header>

    <div class="controls-bar">
      <div class="controls-group">
        <button id="btnToggle" class="primary" onclick="toggleSimulation()">Pause Stream</button>
        <button onclick="resetSimulation()">Reset State</button>
        <div class="slider-container">
          <span>Speed:</span>
          <input type="range" id="rateSlider" min="1" max="100" value="10" oninput="changeRate(this.value)">
          <strong id="rateLabel">10 Hz</strong>
        </div>
      </div>

      <div class="controls-group anomaly-bar">
        <span>Inject Anomaly:</span>
        <button class="danger-btn" onclick="triggerAnomaly('cpu')">CPU Spike</button>
        <button class="danger-btn" onclick="triggerAnomaly('memory')">Mem Leak</button>
        <button class="danger-btn" onclick="triggerAnomaly('temperature')">Overheat</button>
        <button class="danger-btn" onclick="triggerAnomaly('latency')">Latency</button>
        <button class="danger-btn" onclick="triggerAnomaly('error_rate')">Errors</button>
      </div>
    </div>

    <!-- Live Gauges -->
    <div class="grid">
      <div class="card" id="cardCpu">
        <div class="card-header">
          <span class="card-label">CPU Usage</span>
          <span id="cpuStatus" style="font-size:12px;color:var(--text-muted);">Normal</span>
        </div>
        <div>
          <span class="card-value" id="valCpu">--</span><span class="card-unit">%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barCpu"></div>
        </div>
      </div>

      <div class="card" id="cardMemory">
        <div class="card-header">
          <span class="card-label">Memory</span>
          <span id="memStatus" style="font-size:12px;color:var(--text-muted);">Normal</span>
        </div>
        <div>
          <span class="card-value" id="valMemory">--</span><span class="card-unit">%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barMemory"></div>
        </div>
      </div>

      <div class="card" id="cardTemp">
        <div class="card-header">
          <span class="card-label">Temperature</span>
          <span id="tempStatus" style="font-size:12px;color:var(--text-muted);">Normal</span>
        </div>
        <div>
          <span class="card-value" id="valTemp">--</span><span class="card-unit">°C</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barTemp"></div>
        </div>
      </div>

      <div class="card" id="cardNetwork">
        <div class="card-header">
          <span class="card-label">Network Throughput</span>
        </div>
        <div>
          <span class="card-value" id="valNetwork">--</span><span class="card-unit">Mbps</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barNetwork"></div>
        </div>
      </div>

      <div class="card" id="cardRps">
        <div class="card-header">
          <span class="card-label">Requests / Sec</span>
        </div>
        <div>
          <span class="card-value" id="valRps">--</span><span class="card-unit">req/s</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barRps"></div>
        </div>
      </div>

      <div class="card" id="cardLatency">
        <div class="card-header">
          <span class="card-label">Latency</span>
        </div>
        <div>
          <span class="card-value" id="valLatency">--</span><span class="card-unit">ms</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barLatency"></div>
        </div>
      </div>

      <div class="card" id="cardErrors">
        <div class="card-header">
          <span class="card-label">Error Rate</span>
        </div>
        <div>
          <span class="card-value" id="valErrors">--</span><span class="card-unit">%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="barErrors"></div>
        </div>
      </div>
    </div>

    <!-- Live Chart & Alert Feed -->
    <div class="split-view">
      <div class="section-card">
        <div class="section-title">
          <span>Real-time Stream Visualizer (CPU & Latency)</span>
          <span style="font-size: 12px; color: var(--text-muted);">Blue: CPU% | Amber: Latency ms</span>
        </div>
        <canvas id="telemetryCanvas"></canvas>
      </div>

      <div class="section-card">
        <div class="section-title">
          <span>Anomaly Alerts</span>
          <span id="alertCountBadge" style="font-size:12px; color: var(--text-muted);">0 active</span>
        </div>
        <div id="alertsList">
          <div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px;">
            No anomalies detected yet. System running smoothly.
          </div>
        </div>
      </div>
    </div>

    <!-- REST API Endpoints -->
    <div class="section-card">
      <div class="section-title">REST API Endpoints & Swagger Documentation</div>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">
        FastAPI compatible endpoints are live on port 3000. Use Swagger or direct HTTP requests:
      </p>
      <div class="api-links">
        <a class="api-link-btn" href="/docs" target="_blank">📖 Swagger UI (/docs)</a>
        <a class="api-link-btn" href="/openapi.json" target="_blank">⚙️ OpenAPI JSON</a>
        <a class="api-link-btn" href="/health" target="_blank">🩺 /health</a>
        <a class="api-link-btn" href="/api/telemetry/current" target="_blank">📊 /api/telemetry/current</a>
        <a class="api-link-btn" href="/api/telemetry/history" target="_blank">📜 /api/telemetry/history</a>
        <a class="api-link-btn" href="/api/telemetry/stats" target="_blank">📈 /api/telemetry/stats</a>
        <a class="api-link-btn" href="/api/alerts" target="_blank">🚨 /api/alerts</a>
        <a class="api-link-btn" href="/api/simulation/status" target="_blank">🎮 /api/simulation/status</a>
      </div>
    </div>
  </div>

  <script>
    let ws;
    let isRunning = true;
    let events = [];
    const maxGraphPoints = 60;
    const historyCpu = [];
    const historyLatency = [];

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/ws/telemetry';
      const badge = document.getElementById('wsStatusBadge');
      const text = document.getElementById('wsStatusText');

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        badge.className = 'badge';
        text.textContent = 'WebSocket: Connected';
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'telemetry') {
            updateTelemetry(msg.data);
          } else if (msg.type === 'alert') {
            addAlert(msg.data);
          } else if (msg.type === 'system') {
            console.log('[System]', msg.data);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        badge.className = 'badge disconnected';
        text.textContent = 'WebSocket: Reconnecting...';
        setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function updateTelemetry(data) {
      document.getElementById('statEvents').textContent = data.sequence;
      document.getElementById('valCpu').textContent = data.cpu;
      document.getElementById('valMemory').textContent = data.memory;
      document.getElementById('valTemp').textContent = data.temperature;
      document.getElementById('valNetwork').textContent = data.network_mbps;
      document.getElementById('valRps').textContent = data.requests_per_second;
      document.getElementById('valLatency').textContent = data.latency_ms;
      document.getElementById('valErrors').textContent = data.error_rate;

      setBar('barCpu', data.cpu, 100);
      setBar('barMemory', data.memory, 100);
      setBar('barTemp', (data.temperature / 120) * 100, 100);
      setBar('barNetwork', (data.network_mbps / 500) * 100, 100);
      setBar('barRps', (data.requests_per_second / 1500) * 100, 100);
      setBar('barLatency', (data.latency_ms / 150) * 100, 100);
      setBar('barErrors', (data.error_rate / 10) * 100, 100);

      // Graph
      historyCpu.push(data.cpu);
      if (historyCpu.length > maxGraphPoints) historyCpu.shift();

      historyLatency.push(data.latency_ms);
      if (historyLatency.length > maxGraphPoints) historyLatency.shift();

      drawGraph();
    }

    function setBar(id, pct, max) {
      const el = document.getElementById(id);
      if (!el) return;
      const cleanPct = Math.min(100, Math.max(0, pct));
      el.style.width = cleanPct + '%';
      if (cleanPct > 80) {
        el.style.backgroundColor = '#ef4444';
      } else if (cleanPct > 60) {
        el.style.backgroundColor = '#f59e0b';
      } else {
        el.style.backgroundColor = '#3b82f6';
      }
    }

    const alertsMap = new Map();

    function addAlert(alert) {
      alertsMap.set(alert.id, alert);
      renderAlerts();
    }

    function renderAlerts() {
      const container = document.getElementById('alertsList');
      const allAlerts = Array.from(alertsMap.values()).reverse();
      const activeCount = allAlerts.filter(a => !a.resolved).length;
      
      const badge = document.getElementById('statAlerts');
      badge.textContent = activeCount;
      badge.style.color = activeCount > 0 ? '#f87171' : '#34d399';
      document.getElementById('alertCountBadge').textContent = activeCount + ' active';

      if (allAlerts.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px;">No anomalies detected. System running smoothly.</div>';
        return;
      }

      container.innerHTML = allAlerts.map(a => {
        const time = new Date(a.timestamp).toLocaleTimeString();
        return '<div class="alert-item ' + a.severity + (a.resolved ? ' resolved' : '') + '">' +
          '<div class="alert-header">' +
            '<span>[' + a.severity + '] ' + a.metric.toUpperCase() + (a.resolved ? ' (RESOLVED)' : ' (ACTIVE)') + '</span>' +
            '<span>' + time + '</span>' +
          '</div>' +
          '<div>' + a.message + '</div>' +
        '</div>';
      }).join('');
    }

    function drawGraph() {
      const canvas = document.getElementById('telemetryCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const y = (h / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      function plot(data, color, maxVal) {
        if (data.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const step = w / (maxGraphPoints - 1);
        data.forEach((val, i) => {
          const x = i * step;
          const y = h - (val / maxVal) * (h - 20) - 10;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      plot(historyCpu, '#3b82f6', 100);
      plot(historyLatency, '#f59e0b', 150);
    }

    async function toggleSimulation() {
      const btn = document.getElementById('btnToggle');
      const action = isRunning ? 'pause' : 'resume';
      const res = await fetch('/api/simulation/' + action, { method: 'POST' });
      if (res.ok) {
        isRunning = !isRunning;
        btn.textContent = isRunning ? 'Pause Stream' : 'Resume Stream';
        btn.className = isRunning ? 'primary' : '';
      }
    }

    async function resetSimulation() {
      await fetch('/api/simulation/reset', { method: 'POST' });
      historyCpu.length = 0;
      historyLatency.length = 0;
      alertsMap.clear();
      renderAlerts();
    }

    async function changeRate(rate) {
      document.getElementById('rateLabel').textContent = rate + ' Hz';
      document.getElementById('statRate').textContent = rate + '/s';
      await fetch('/api/simulation/rate?rate=' + rate, { method: 'POST' });
    }

    async function triggerAnomaly(metric) {
      await fetch('/api/simulation/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric, intensity: 1.5, duration_seconds: 4.0 })
      });
    }

    async function pollStatus() {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('statClients').textContent = data.connected_clients;
        }
      } catch (e) {}
    }
    setInterval(pollStatus, 3000);

    connectWs();
    window.addEventListener('resize', drawGraph);
  </script>
</body>
</html>`;
}
