import { Button } from "../../components/ui/Button";
import { AppActivityIndicator } from "../../components/ui/AppActivityIndicator";
import { ConnectionTraceId } from "./ConnectionTraceId";
import {
  type EnvironmentConnectionPhase,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";
import { SymbolView } from "../../components/ui/AppSymbol";
import { View } from "react-native";

import { AppText as Text } from "../../components/ui/AppText";
import { useGT } from "../../i18n/runtime";

function noticeTitle(
  phase: EnvironmentConnectionPhase,
  environmentLabel: string,
  awaitingApproval: boolean,
  gt: ReturnType<typeof useGT>,
): string {
  if (awaitingApproval) {
    return gt("Waiting for {environmentLabel} to approve this device", { environmentLabel });
  }
  switch (phase) {
    case "offline":
      return gt("You are offline");
    case "connecting":
      return gt("Connecting to {environmentLabel}...", { environmentLabel });
    case "reconnecting":
      return gt("Reconnecting to {environmentLabel}...", { environmentLabel });
    case "unsupported":
      return gt("Client not supported");
    case "error":
      return gt("{environmentLabel} is unavailable", { environmentLabel });
    case "available":
      return gt("{environmentLabel} is disconnected", { environmentLabel });
    case "connected":
      return "";
  }
}

function noticeDetail(
  phase: EnvironmentConnectionPhase,
  resourceName: string,
  error: string | null,
  awaitingApproval: boolean,
  gt: ReturnType<typeof useGT>,
): string {
  if (error && awaitingApproval) return error;
  if (error) {
    return phase === "reconnecting"
      ? gt("The app will keep retrying automatically. {error}", { error })
      : error;
  }

  switch (phase) {
    case "offline":
      return gt(
        "Cached data remains available. The {resourceName} will load when your connection returns.",
        { resourceName },
      );
    case "connecting":
    case "reconnecting":
      return gt("The {resourceName} will load as soon as the environment is ready.", {
        resourceName,
      });
    case "unsupported":
      return gt("Use compatible versions of the app and server to connect.");
    case "available":
    case "error":
      return gt("Reconnect the environment to load the {resourceName}.", { resourceName });
    case "connected":
      return "";
  }
}

export function EnvironmentConnectionNotice(props: {
  readonly environmentLabel: string;
  readonly connection: EnvironmentConnectionPresentation;
  readonly resourceName: string;
  readonly onRetry: () => void;
}) {
  const gt = useGT();
  const isRetrying =
    props.connection.phase === "connecting" || props.connection.phase === "reconnecting";

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="max-w-[320px] items-center gap-3">
        {isRetrying ? (
          <AppActivityIndicator size="small" colorClassName={"accent-icon-muted"} />
        ) : (
          <SymbolView
            name={props.connection.phase === "offline" ? "wifi.slash" : "bolt.horizontal.circle"}
            size={24}
            tintColorClassName={"accent-icon-muted"}
            type="monochrome"
          />
        )}

        <Text className="text-center text-lg font-t3-bold text-foreground">
          {noticeTitle(
            props.connection.phase,
            props.environmentLabel,
            props.connection.awaitingApproval === true,
            gt,
          )}
        </Text>
        <Text className="text-center text-sm leading-normal text-foreground-muted">
          {noticeDetail(
            props.connection.phase,
            props.resourceName,
            props.connection.error,
            props.connection.awaitingApproval === true,
            gt,
          )}
          {props.connection.traceId ? (
            <ConnectionTraceId traceId={props.connection.traceId} />
          ) : null}
        </Text>

        {props.connection.phase !== "offline" && props.connection.phase !== "unsupported" ? (
          <View className="mt-1">
            <Button label={gt("Retry now")} tone="secondary" onPress={props.onRetry} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
