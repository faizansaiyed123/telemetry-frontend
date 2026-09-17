import { WebSocket } from "ws";

export class WebSocketManager {
  private clients: Set<WebSocket> = new Set();

  register(ws: WebSocket): void {
    this.clients.add(ws);
    console.log(`[WebSocket] Client connected. Total: ${this.clients.size}`);
  }

  unregister(ws: WebSocket): void {
    this.clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total: ${this.clients.size}`);
  }

  broadcast(message: string): void {
    if (this.clients.size === 0) return;

    const deadClients: WebSocket[] = [];
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.warn("[WebSocket] Error sending to client, queuing removal:", err);
          deadClients.push(client);
        }
      } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
        deadClients.push(client);
      }
    }

    for (const dead of deadClients) {
      this.clients.delete(dead);
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  disconnectAll(): void {
    for (const client of this.clients) {
      try {
        client.close(1000, "Server shutting down or resetting");
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }
}
