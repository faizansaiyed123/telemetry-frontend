import { TelemetryEvent } from "./telemetry.js";
import { Alert } from "./alerts.js";

export interface SystemMessage {
  event: string;
  message: string;
}

export type WebSocketMessage =
  | {
      type: "telemetry";
      data: TelemetryEvent;
    }
  | {
      type: "alert";
      data: Alert;
    }
  | {
      type: "system";
      data: SystemMessage;
    };

export type ConnectionStatus = "CONNECTING" | "LIVE" | "RECONNECTING" | "DISCONNECTED" | "ERROR";
