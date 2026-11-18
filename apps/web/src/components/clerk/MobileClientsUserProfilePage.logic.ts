import type { RelayClientDeviceRecord } from "@t3tools/contracts/relay";
import type { useGT } from "gt-react";

type TranslateFn = ReturnType<typeof useGT>;

const defaultGt: TranslateFn = (text, variables) =>
  variables
    ? text.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = variables[key];
        return typeof value === "string" || typeof value === "number" ? String(value) : "";
      })
    : text;

const mobileClientUpdatedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function mobileClientPlatformLabel(device: RelayClientDeviceRecord): string {
  const platform =
    device.platform === "android"
      ? "Android"
      : device.iosMajorVersion === null
        ? "iOS"
        : `iOS ${device.iosMajorVersion}`;
  return `${platform}${device.appVersion ? ` · T3 Code ${device.appVersion}` : ""}`;
}

export function mobileClientNotificationDetail(
  device: RelayClientDeviceRecord,
  gt: TranslateFn = defaultGt,
): string {
  if (!device.notifications.enabled) {
    return gt("Push notifications are disabled on this device.");
  }

  const enabledPreferences = [
    device.notifications.notifyOnApproval ? gt("approvals") : null,
    device.notifications.notifyOnInput ? gt("input requests") : null,
    device.notifications.notifyOnCompletion ? gt("completions") : null,
    device.notifications.notifyOnFailure ? gt("failures") : null,
  ].filter((label): label is string => label !== null);
  return enabledPreferences.length > 0
    ? gt("Alerts enabled for {types}.", { types: enabledPreferences.join(", ") })
    : gt("Push notifications are enabled, but no alert types are selected.");
}

export function mobileClientUpdatedAtLabel(updatedAt: string, gt: TranslateFn = defaultGt): string {
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime())
    ? gt("Update time unavailable")
    : gt("Updated {time}", { time: mobileClientUpdatedAtFormatter.format(date) });
}
