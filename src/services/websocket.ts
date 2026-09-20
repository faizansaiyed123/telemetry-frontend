import { ConnectionStatus, WebSocketMessage } from "../types/websocket.js";
import { API_BASE_URL } from "./api.js";

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class TelemetryWebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private status: ConnectionStatus = "DISCONNECTED";
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 30;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  private getWebSocketUrl(): string {
    const token = window.localStorage.getItem("telemetry_access_token");
    if (!token) throw new Error("Authentication required");

    let base: URL;
    if (API_BASE_URL) {
      base = new URL(API_BASE_URL);
    } else {
      base = new URL(window.location.origin);
    }

    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(`${protocol}//${base.host}/ws/telemetry`);
    url.searchParams.set("token", token);
    return url.toString();
  }

  public connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (!window.localStorage.getItem("telemetry_access_token")) {
      this.setStatus("DISCONNECTED");
      return;
    }

    this.intentionalClose = false;
    this.setStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");

    try {
      this.ws = new WebSocket(this.getWebSocketUrl());

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus("LIVE");
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as WebSocketMessage;
          if (parsed && typeof parsed.type === "string") {
            this.notifyMessage(parsed);
          }
        } catch {
          // Ignore malformed server frames.
        }
      };

      this.ws.onerror = () => {
        this.setStatus("ERROR");
      };

      this.ws.onclose = (event) => {
        this.ws = null;
        if (!this.intentionalClose) {
          if (event.code === 1008) {
            window.localStorage.removeItem("telemetry_access_token");
            window.localStorage.removeItem("telemetry_user");
            if (window.location.pathname.startsWith("/app")) {
              window.location.replace("/login");
            }
          }
          this.setStatus("DISCONNECTED");
          if (event.code !== 1008) this.scheduleReconnect();
        } else {
          this.setStatus("DISCONNECTED");
        }
      };
    } catch {
      this.setStatus("ERROR");
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("DISCONNECTED");
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || !window.localStorage.getItem("telemetry_access_token")) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus("DISCONNECTED");
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(8000, Math.round(1000 * Math.pow(1.5, this.reconnectAttempts - 1)));
    this.setStatus("RECONNECTING");

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const handler of this.statusHandlers) handler(status);
  }

  private notifyMessage(message: WebSocketMessage): void {
    for (const handler of this.messageHandlers) handler(message);
  }

  public subscribeMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public subscribeStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }
}

export const telemetryWsService = new TelemetryWebSocketService();
