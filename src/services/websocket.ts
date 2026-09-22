import { api, API_BASE_URL } from "./api.js";
import { ConnectionStatus, WebSocketMessage } from "../types/websocket.js";

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
  private tokenRequest: Promise<string> | null = null;
  private connectGeneration = 0;
  private intentionalClose = false;

  private async fetchWebSocketToken(): Promise<string> {
    if (this.tokenRequest) return this.tokenRequest;

    this.tokenRequest = api
      .getWebSocketToken()
      .then((response) => response.access_token)
      .finally(() => {
        this.tokenRequest = null;
      });

    return this.tokenRequest;
  }

  private async getWebSocketUrl(): Promise<string> {
    if (!window.localStorage.getItem("telemetry_access_token")) {
      throw new Error("Authentication required");
    }

    const token = await this.fetchWebSocketToken();
    if (this.intentionalClose) {
      throw new Error("Connection cancelled");
    }

    const base = new URL(API_BASE_URL || window.location.origin);
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
    this.connectGeneration += 1;
    const generation = this.connectGeneration;
    this.setStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");
    void this.openSocket(generation);
  }

  private async openSocket(generation: number): Promise<void> {
    try {
      const url = await this.getWebSocketUrl();

      if (
        this.intentionalClose ||
        generation !== this.connectGeneration ||
        this.ws
      ) {
        return;
      }

      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.reconnectAttempts = 0;
        this.setStatus("LIVE");
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const parsed = JSON.parse(event.data) as WebSocketMessage;
          if (parsed && typeof parsed.type === "string") {
            this.notifyMessage(parsed);
          }
        } catch {
          // Ignore malformed server frames.
        }
      };

      socket.onerror = () => {
        if (this.ws === socket) this.setStatus("ERROR");
      };

      socket.onclose = (event) => {
        if (this.ws !== socket) return;
        this.ws = null;

        if (this.intentionalClose || generation !== this.connectGeneration) {
          this.setStatus("DISCONNECTED");
          return;
        }

        if (event.code === 1008) {
          window.localStorage.removeItem("telemetry_access_token");
          window.localStorage.removeItem("telemetry_user");
          this.setStatus("DISCONNECTED");
          if (window.location.pathname.startsWith("/app")) {
            window.location.replace("/login");
          }
          return;
        }

        this.setStatus("DISCONNECTED");
        this.scheduleReconnect();
      };
    } catch (error) {
      if (this.intentionalClose || generation !== this.connectGeneration) return;

      if (error instanceof Error && error.message === "Authentication required") {
        this.setStatus("DISCONNECTED");
        return;
      }

      if (error instanceof Error && error.message === "Connection cancelled") return;

      // api.request() handles a 401 by clearing the session and redirecting.
      // Other token/network failures are treated like transient connection errors.
      this.setStatus("ERROR");
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.intentionalClose = true;
    this.connectGeneration += 1;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      socket.close();
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
