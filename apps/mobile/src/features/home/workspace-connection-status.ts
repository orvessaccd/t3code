import type { useGT } from "../../i18n/runtime";
import type { WorkspaceState } from "../../state/workspaceModel";

const fallbackGt = ((text: string, values?: Record<string, unknown>) =>
  values
    ? text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))
    : text) as ReturnType<typeof useGT>;

export interface WorkspaceConnectionStatusPresentation {
  readonly label: string;
  readonly showsProgress: boolean;
}

function shouldShowWorkspaceConnectionStatus(state: WorkspaceState): boolean {
  if (state.networkStatus === "offline") return true;
  if (state.hasReadyEnvironment) return state.hasSyncingConnectedEnvironment;
  return (
    state.connectionError !== null ||
    state.hasConnectingEnvironment ||
    state.hasPendingShellSnapshot ||
    (state.hasLoadedShellSnapshot && !state.hasReadyEnvironment)
  );
}

function workspaceConnectionStatusLabel(
  state: WorkspaceState,
  gt: ReturnType<typeof useGT>,
): string {
  if (state.networkStatus === "offline") return gt("You are offline");
  if (state.hasReadyEnvironment && state.hasSyncingConnectedEnvironment) {
    return state.hasLoadedShellSnapshot ? gt("Syncing threads...") : gt("Loading threads...");
  }
  if (state.connectingEnvironments.length === 1) {
    return gt("Reconnecting to {environment}", {
      environment: state.connectingEnvironments[0]!.environmentLabel,
    });
  }
  if (state.connectingEnvironments.length > 1) {
    return gt("Reconnecting {count} environments", {
      count: state.connectingEnvironments.length,
    });
  }
  if (state.connectionError !== null) return state.connectionError;
  if (state.hasPendingShellSnapshot) {
    return state.hasLoadedShellSnapshot ? gt("Syncing threads...") : gt("Loading threads...");
  }
  return gt("Not connected");
}

export function workspaceConnectionStatusPresentation(
  state: WorkspaceState,
  gt: ReturnType<typeof useGT> = fallbackGt,
): WorkspaceConnectionStatusPresentation | null {
  if (!shouldShowWorkspaceConnectionStatus(state)) return null;
  return {
    label: workspaceConnectionStatusLabel(state, gt),
    showsProgress:
      state.networkStatus !== "offline" &&
      (state.hasReadyEnvironment || state.connectionError === null) &&
      (state.connectingEnvironments.length > 0 || state.hasPendingShellSnapshot),
  };
}
