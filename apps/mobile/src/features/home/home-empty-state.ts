import { isWorkspaceCatalogPending, type WorkspaceState } from "../../state/workspaceModel";
import { msg } from "../../i18n/runtime";

export interface HomeEmptyState {
  readonly title: string;
  readonly detail: string;
  readonly loading: boolean;
  readonly showsAddEnvironment: boolean;
}

export function deriveHomeEmptyState(
  catalogState: WorkspaceState,
  projectCount: number,
): HomeEmptyState {
  const emptyState = deriveEmptyState(catalogState, projectCount);
  return {
    ...emptyState,
    showsAddEnvironment: !emptyState.loading && !catalogState.hasReadyEnvironment,
  };
}

function deriveEmptyState(
  catalogState: WorkspaceState,
  projectCount: number,
): Omit<HomeEmptyState, "showsAddEnvironment"> {
  if (catalogState.isLoadingConnections) {
    return {
      title: msg("Loading environments"),
      detail: msg("Checking saved environments on this device."),
      loading: true,
    };
  }

  if (!catalogState.hasConnections) {
    return {
      title: msg("No environments connected"),
      detail: msg("Add an environment to load projects and start coding sessions."),
      loading: false,
    };
  }

  if (
    (catalogState.connectionState === "available" ||
      catalogState.connectionState === "offline" ||
      catalogState.connectionState === "error" ||
      catalogState.connectionState === "unsupported") &&
    !catalogState.hasLoadedShellSnapshot
  ) {
    return {
      title:
        catalogState.connectionState === "unsupported"
          ? msg("Client not supported")
          : msg("Environment unavailable"),
      detail:
        catalogState.connectionError ??
        msg(
          "The saved environment is offline. Check the URL or start the environment, then retry.",
        ),
      loading: false,
    };
  }

  if (isWorkspaceCatalogPending(catalogState)) {
    return {
      title: catalogState.hasReadyEnvironment
        ? msg("Loading threads")
        : msg("Connecting to environment"),
      detail: msg("Loading projects and threads from the saved environment."),
      loading: true,
    };
  }

  if (projectCount === 0 && catalogState.hasLoadedShellSnapshot) {
    return {
      title: msg("No projects found"),
      detail: msg("The connected environment did not report any projects."),
      loading: false,
    };
  }

  return {
    title: msg("No threads yet"),
    detail: msg("Create a task to start a new coding runtime in one of your connected projects."),
    loading: false,
  };
}
