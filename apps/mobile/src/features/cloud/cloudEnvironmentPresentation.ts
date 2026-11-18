import type { RelayEnvironmentStatusResponse } from "@t3tools/contracts/relay";
import {
  orchestrationProtocolCompatibilityError,
  type EnvironmentConnectionPhase,
} from "@t3tools/client-runtime/connection";
import { relayOfflineReasonMessage } from "@t3tools/client-runtime/relay";

import type { useGT } from "../../i18n/runtime";

export interface AvailableCloudEnvironmentPresentation {
  readonly connectionError: string | null;
  readonly connectionErrorTraceId: string | null;
  readonly connectionState: EnvironmentConnectionPhase;
  readonly statusText: string;
}

export function availableCloudEnvironmentPresentation(
  input: {
    readonly isStatusPending: boolean;
    readonly status: RelayEnvironmentStatusResponse | null;
    readonly statusError: string | null;
    readonly statusErrorTraceId: string | null;
  },
  gt?: ReturnType<typeof useGT>,
): AvailableCloudEnvironmentPresentation {
  const compatibilityError =
    input.status?.descriptor === undefined
      ? null
      : orchestrationProtocolCompatibilityError(input.status.descriptor);
  if (compatibilityError !== null) {
    return {
      connectionError: compatibilityError.message,
      connectionErrorTraceId: null,
      connectionState: "unsupported",
      statusText: compatibilityError.message,
    };
  }
  if (input.status?.status === "online") {
    return {
      connectionError: null,
      connectionErrorTraceId: null,
      connectionState: "available",
      statusText: gt ? gt("Available · Relay online") : "Available · Relay online",
    };
  }

  if (input.status?.status === "offline") {
    const connectionError =
      relayOfflineReasonMessage(input.status) ??
      input.status.error ??
      (gt ? gt("Relay is offline.") : "Relay is offline.");
    return {
      connectionError,
      connectionErrorTraceId: input.status.traceId ?? null,
      connectionState: "error",
      statusText: connectionError,
    };
  }

  if (input.statusError) {
    return {
      connectionError: input.statusError,
      connectionErrorTraceId: input.statusErrorTraceId,
      connectionState: "error",
      statusText: input.statusError,
    };
  }

  return {
    connectionError: null,
    connectionErrorTraceId: null,
    connectionState: "available",
    statusText: input.isStatusPending
      ? gt
        ? gt("Available · Checking relay status...")
        : "Available · Checking relay status..."
      : gt
        ? gt("Available · Relay status unknown")
        : "Available · Relay status unknown",
  };
}
