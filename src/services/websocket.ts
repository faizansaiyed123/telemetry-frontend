import { ConnectionStatus, WebSocketMessage } from "../types/websocket.js";
import { API_BASE_URL } from "./api.js";
import { api } from "./api.js";

type MessageHandler = (message: WebSocketMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

type WebSocketHandoff = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export class TelemetryWebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private status: ConnectionStatus = "DISCONNECTED";
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 30;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private handoffInFlight = false;

  private getWebSocketUrl(token: string): string {
    const base = API_BASE_URL ? new URL(API_BASE_URL) : new URL(window.location.origin);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(protocol + "//" + base.host + "/ws/telemetry");
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

    if (this.handoffInFlight) return;

    this.intentionalClose = false;
    this.setStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");
    this.handoffInFlight = true;
    void this.openWithHandoffToken();
  }

  private async openWithHandoffToken(): Promise<void> {
    try {
      const handoff: WebSocketHandoff = await api.getWebSocketToken();
      if (
        this.intentionalClose ||
        !window.localStorage.getItem("telemetry_access_token")
      ) {
        this.handoffInFlight = false;
        return;
      }

      this.ws = new WebSocket(this.getWebSocketUrl(handoff.access_token));

      this.ws.onopen = () => {
        this.handoffInFlight = false;
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
        this.handoffInFlight = false;

        if (!this.intentionalClose) {
          this.setStatus("DISCONNECTED");
          // A handoff token is single-use, so auth/policy closes refresh the
          // short-lived handoff instead of invalidating the user's session.
          if (event.code === 1008) {
            this.scheduleReconnect();
            return;
          }
          this.scheduleReconnect();
        } else {
          this.setStatus("DISCONNECTED");
        }
      };
    } catch {
      this.handoffInFlight = false;
      if (!this.intentionalClose) {
        this.setStatus("ERROR");
        this.scheduleReconnect();
      }
    }
  }

  public disconnect(): void {
    this.intentionalClose = true;
    this.handoffInFlight = false;
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
    if (
      this.intentionalClose ||
      !window.localStorage.getItem("telemetry_access_token")
    ) return;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus("DISCONNECTED");
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(
      8000,
      Math.round(1000 * Math.pow(1.5, this.reconnectAttempts - 1)),
    );
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
