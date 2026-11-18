import type { EnvironmentMachineKind } from "@t3tools/contracts";
import { SymbolView, type AppSymbolName } from "./ui/AppSymbol";
import { msg, useMessages } from "../i18n/runtime";

export const ENVIRONMENT_MACHINE_SYMBOLS = {
  server: "server.rack",
  cloud: "cloud",
  linux: "terminal",
  desktop: "desktopcomputer",
  laptop: "laptopcomputer",
  "mac-mini": "macmini",
  "mac-studio": "macstudio",
} as const satisfies Record<EnvironmentMachineKind, AppSymbolName>;

const ENVIRONMENT_MACHINE_KIND_LABELS: Record<EnvironmentMachineKind, string> = {
  server: msg("Server"),
  cloud: msg("Cloud VM"),
  linux: msg("Linux/WSL"),
  desktop: msg("Desktop"),
  laptop: msg("Laptop"),
  "mac-mini": msg("Mini PC"),
  "mac-studio": msg("Workstation"),
};

export function EnvironmentMachineSymbol(props: {
  readonly kind: EnvironmentMachineKind;
  readonly size: number;
  readonly tintColorClassName: string;
}) {
  const m = useMessages();
  return (
    <SymbolView
      accessibilityLabel={m(ENVIRONMENT_MACHINE_KIND_LABELS[props.kind])}
      name={ENVIRONMENT_MACHINE_SYMBOLS[props.kind]}
      size={props.size}
      tintColorClassName={props.tintColorClassName}
      type="monochrome"
    />
  );
}
