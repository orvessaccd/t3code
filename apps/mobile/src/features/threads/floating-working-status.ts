import type { EnvironmentConnectionPhase } from "@t3tools/client-runtime/connection";
import type { EnvironmentId } from "@t3tools/contracts";

export interface FloatingStatusAction {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
}

export type FloatingWorkingStatus =
  | { readonly kind: "working"; readonly environmentId: EnvironmentId; readonly startedAt: string }
  | { readonly kind: "compacting" }
  | {
      readonly kind: "child-input";
      readonly label: string;
      readonly accessibilityLabel: string;
      readonly onPress: () => void;
    }
  | {
      readonly kind: "background";
      readonly label: string;
      readonly accessibilityLabel: string;
      readonly waiting: boolean;
      readonly onPress: () => void;
      readonly action: FloatingStatusAction;
    }
  | {
      readonly kind: "lifecycle";
      readonly state: "snoozed" | "settled" | "woke";
      readonly label: string;
      readonly action: FloatingStatusAction;
    }
  | {
      readonly kind: "stop";
      readonly label: string;
      readonly unresponsive: boolean;
      readonly action: FloatingStatusAction | null;
    }
  | { readonly kind: "goal"; readonly label: string; readonly accessibilityLabel: string }
  | { readonly kind: "extension"; readonly label: string; readonly onPress: () => void }
  | { readonly kind: "preparing"; readonly label: string }
  | {
      readonly kind: "connection";
      readonly tone: "reconnecting" | "unavailable";
      readonly label: string;
      readonly onPress: () => void;
    };

export function connectionFloatingStatus(input: {
  readonly connectionError: string | null;
  readonly connectionState: EnvironmentConnectionPhase;
  readonly connectionAwaitingApproval?: boolean;
  readonly environmentLabel: string | null;
  readonly onReconnect: () => void;
  readonly gt?: (message: string, values?: Record<string, unknown>) => string;
}): FloatingWorkingStatus | null {
  const t = input.gt ?? ((message: string) => message);
  const environmentLabel = input.environmentLabel ?? t("Environment");
  const unavailable = (label: string): FloatingWorkingStatus => ({
    kind: "connection",
    tone: "unavailable",
    label,
    onPress: input.onReconnect,
  });

  if (input.connectionState === "reconnecting" && input.connectionAwaitingApproval) {
    return {
      kind: "connection",
      tone: "reconnecting",
      label: input.gt
        ? input.gt("Waiting for {environmentLabel} to approve this device", { environmentLabel })
        : `Waiting for ${environmentLabel} to approve this device`,
      onPress: input.onReconnect,
    };
  }
  switch (input.connectionState) {
    case "connecting":
    case "reconnecting":
      return {
        kind: "connection",
        tone: "reconnecting",
        label:
          input.connectionError === null
            ? input.gt
              ? input.gt("Reconnecting to {environmentLabel}...", { environmentLabel })
              : `Reconnecting to ${environmentLabel}...`
            : input.gt
              ? input.gt("Failed to connect. Retrying {environmentLabel}...", { environmentLabel })
              : `Failed to connect. Retrying ${environmentLabel}...`,
        onPress: input.onReconnect,
      };
    case "offline":
      return unavailable(t("You are offline"));
    case "unsupported":
      return unavailable(t("Client not supported"));
    case "error":
      return unavailable(
        input.connectionError
          ? input.gt
            ? input.gt("Failed to connect to {environmentLabel}: {error}", {
                environmentLabel,
                error: input.connectionError,
              })
            : `Failed to connect to ${environmentLabel}: ${input.connectionError}`
          : input.gt
            ? input.gt("Failed to connect to {environmentLabel}", { environmentLabel })
            : `Failed to connect to ${environmentLabel}`,
      );
    case "available":
      return unavailable(
        input.gt
          ? input.gt("{environmentLabel} is not connected", { environmentLabel })
          : `${environmentLabel} is not connected`,
      );
    case "connected":
      return null;
  }
}
