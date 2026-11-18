import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import { SymbolView } from "../../../components/ui/AppSymbol";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { Button } from "../../../components/ui/Button";
import type { useGT } from "../../../i18n/runtime";

export function SheetActionButton(props: {
  readonly icon: ComponentProps<typeof SymbolView>["name"];
  readonly label: string;
  readonly disabled?: boolean;
  readonly tone?: "primary" | "secondary" | "danger";
  readonly onPress: () => void;
}) {
  return (
    <View className="flex-1">
      <Button {...props} fullWidth />
    </View>
  );
}

export function menuItemIconName(
  icon: "commit" | "push" | "pr",
): ComponentProps<typeof SymbolView>["name"] {
  if (icon === "commit") return "checkmark.circle";
  if (icon === "push") return "arrow.up.circle";
  return "arrow.up.right.circle";
}

export function statusSummary(
  gitStatus: {
    readonly isRepo?: boolean;
    readonly hasWorkingTreeChanges?: boolean;
    readonly workingTree?: { readonly files: readonly { readonly path: string }[] };
    readonly aheadCount?: number;
    readonly behindCount?: number;
    readonly pr?: { readonly state?: string; readonly number?: number } | null;
    readonly sourceControlProvider?: { readonly kind: string } | null;
  } | null,
  gt?: ReturnType<typeof useGT>,
): string {
  if (!gitStatus) {
    return gt ? gt("Loading branch status…") : "Loading branch status\u2026";
  }

  if (!gitStatus.isRepo) {
    return gt ? gt("Not a git repository") : "Not a git repository";
  }

  const parts: string[] = [];
  if (gitStatus.hasWorkingTreeChanges) {
    const fileCount = gitStatus.workingTree?.files.length ?? 0;
    parts.push(
      gt
        ? gt("{count, plural, one {# file changed} other {# files changed}}", {
            count: fileCount,
          })
        : `${fileCount} file${fileCount === 1 ? "" : "s"} changed`,
    );
  } else {
    parts.push(gt ? gt("Clean") : "Clean");
  }
  if ((gitStatus.aheadCount ?? 0) > 0) {
    parts.push(
      gt
        ? gt("{count} ahead", { count: gitStatus.aheadCount ?? 0 })
        : `${gitStatus.aheadCount} ahead`,
    );
  }
  if ((gitStatus.behindCount ?? 0) > 0) {
    parts.push(
      gt
        ? gt("{count} behind", { count: gitStatus.behindCount ?? 0 })
        : `${gitStatus.behindCount} behind`,
    );
  }
  if (gitStatus.pr?.state === "open") {
    const { shortLabel } = sourceControlClients.get(
      gitStatus.sourceControlProvider?.kind,
    ).changeRequest;
    parts.push(
      gt
        ? gt("{label} #{number} open", {
            label: shortLabel,
            number: gitStatus.pr.number ?? "",
          })
        : `${shortLabel} #${gitStatus.pr.number} open`,
    );
  }

  return parts.join(" \u00b7 ");
}
