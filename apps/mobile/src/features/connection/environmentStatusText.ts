import {
  connectionStatusText,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";

import type { useGT } from "../../i18n/runtime";

export function environmentStatusText(
  connection: EnvironmentConnectionPresentation,
  gt?: ReturnType<typeof useGT>,
): string {
  if (!gt) {
    return connection.phase === "unsupported" && connection.error !== null
      ? connection.error
      : connectionStatusText(connection);
  }
  switch (connection.phase) {
    case "available":
      return gt("Available");
    case "offline":
      return gt("Offline");
    case "connecting":
      return gt("Connecting...");
    case "reconnecting":
      if (connection.awaitingApproval) {
        return connection.error ?? gt("Waiting for approval on the host");
      }
      return connection.error
        ? gt("Failed to connect. Reconnecting... Reason: {error}", { error: connection.error })
        : gt("Reconnecting...");
    case "connected":
      return gt("Connected");
    case "unsupported":
      return connection.error ?? gt("Client not supported");
    case "error":
      return connection.error
        ? gt("Connection failed. Reason: {error}", { error: connection.error })
        : gt("Connection failed");
  }
}
