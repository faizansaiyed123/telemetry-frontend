import { ConnectionStatus, WebSocketMessage } from "../types/websocket.js";
import { API_BASE_URL } from "./api.js";

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class TelemetryWebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();

  private status: ConnectionStatus = "DISCONNECTED";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 30;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionalClose = false;

  constructor() {
    //
  }

  private getWebSocketUrl(): string {
    if (API_BASE_URL) {
      const url = new URL(API_BASE_URL);
      const protocol = url.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${url.host}/ws/telemetry`;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/telemetry`;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.intentionalClose = false;
    this.setStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");

    try {
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

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
          // Malformed message ignored
        }
      };

      this.ws.onerror = () => {
        this.setStatus("ERROR");
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.intentionalClose) {
          this.setStatus("DISCONNECTED");
          this.scheduleReconnect();
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
    if (this.intentionalClose) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus("DISCONNECTED");
      return;
    }

    this.reconnectAttempts += 1;
    // Exponential backoff capped at 8000ms
    const delay = Math.min(8000, 1000 * Math.pow(1.5, this.reconnectAttempts));
    this.setStatus("RECONNECTING");

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const handler of this.statusHandlers) {
      handler(newStatus);
    }
  }

  private notifyMessage(message: WebSocketMessage): void {
    for (const handler of this.messageHandlers) {
      handler(message);
    }
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
