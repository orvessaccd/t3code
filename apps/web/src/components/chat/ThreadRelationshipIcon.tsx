import type { ProviderDriverKind, ServerProvider } from "@t3tools/contracts";
import { msg } from "gt-react";
import { BotIcon, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  hasInstanceBadge,
  shouldShowInstanceBadge,
  type ProviderInstanceEntry,
} from "../../providerInstances";
import { ProviderInstanceIcon } from "./ProviderInstanceIcon";

export function threadRelationshipStatusLabel(status: string | null): string {
  switch (status) {
    case "preparing":
    case "starting":
      return msg("Starting");
    case "running":
    case "in_progress":
      return msg("Running");
    case "pending":
    case "queued":
      return msg("Queued");
    case "waiting":
    case "blocked":
      return msg("Waiting");
    case "completed":
      return msg("Done");
    case "failed":
    case "error":
      return msg("Failed");
    case "cancelled":
    case "interrupted":
      return msg("Stopped");
    case "rolled_back":
      return msg("Reverted");
    case "resolved_native":
      return msg("Resolved (native)");
    case "resolved_portable":
      return msg("Resolved (portable)");
    case "consumed":
      return msg("Consumed");
    case "superseded":
      return msg("Superseded");
    case "idle":
      return msg("Idle");
    default:
      return msg("Unknown");
  }
}

export function ThreadRelationshipIcon({
  driver,
  provider,
  providerEntries = [],
  anyInstanceBadge = hasInstanceBadge(providerEntries),
  status,
  fallbackIcon: FallbackIcon = BotIcon,
}: {
  driver?: ProviderDriverKind | undefined;
  provider?: ServerProvider | undefined;
  providerEntries?: ReadonlyArray<ProviderInstanceEntry>;
  /** For rows that can't take `providerEntries` but sit in the same list as rows that do. */
  anyInstanceBadge?: boolean;
  status: string | null;
  fallbackIcon?: LucideIcon;
}) {
  const iconClassName = "size-4 shrink-0 text-muted-foreground";
  const entry = driver
    ? providerEntries.find((candidate) => candidate.instanceId === provider?.instanceId)
    : undefined;
  const showInstanceBadge = entry !== undefined && shouldShowInstanceBadge(entry, providerEntries);
  return (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      {driver ? (
        <ProviderInstanceIcon
          driverKind={driver}
          displayName={entry?.displayName ?? provider?.displayName ?? driver}
          accentColor={entry?.accentColor}
          acpRegistryAgentId={entry?.acpRegistryAgentId}
          acpRegistryIconUrl={entry?.acpRegistryIconUrl ?? provider?.iconUrl}
          showBadge={showInstanceBadge}
          size="compact"
          iconClassName={iconClassName}
          className="z-auto"
        />
      ) : (
        <FallbackIcon className={iconClassName} />
      )}
      <span
        className={cn(
          "absolute -right-1 size-2 rounded-full border-2 border-card",
          anyInstanceBadge ? "-top-1" : "-bottom-1",
          status === "running" ||
            status === "in_progress" ||
            status === "pending" ||
            status === "waiting"
            ? "bg-info"
            : status === "failed" || status === "error"
              ? "bg-destructive"
              : status === "completed"
                ? "bg-success"
                : "bg-muted-foreground/45",
        )}
        aria-hidden="true"
      />
    </span>
  );
}
