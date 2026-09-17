import { useEffect, useState } from "react";
import { telemetryWsService } from "../services/websocket.js";
import { ConnectionStatus, WebSocketMessage } from "../types/websocket.js";

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const [status, setStatus] = useState<ConnectionStatus>(telemetryWsService.getStatus());

  useEffect(() => {
    const unsubStatus = telemetryWsService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    const unsubMsg = onMessage
      ? telemetryWsService.subscribeMessage(onMessage)
      : () => {};

    telemetryWsService.connect();

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [onMessage]);

  return {
    status,
    reconnect: () => telemetryWsService.connect(),
    disconnect: () => telemetryWsService.disconnect(),
  };
}
