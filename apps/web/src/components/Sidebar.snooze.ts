import { translateEncodedMessage as tr } from "../i18n/runtime";
import type { EnvironmentId } from "@t3tools/contracts";
import type { TimestampFormat } from "@t3tools/contracts/settings";
import {
  pickSnoozePreset as pickSharedSnoozePreset,
  resolveSnoozePresets as resolveSharedSnoozePresets,
  snoozeWakeLabel,
  type SnoozePreset,
} from "@t3tools/client-runtime/state/thread-settled";
import { msg } from "gt-react";

import { appAtomRegistry } from "../rpc/atomRegistry";
import { serverEnvironment } from "../state/server";
import { formatShortTimestamp } from "../timestampFormat";
import { toastManager } from "./ui/toast";

export { snoozeWakeLabel, type SnoozePreset };

function localizeSnoozePreset(preset: SnoozePreset): SnoozePreset {
  if (preset.id.startsWith("after:")) {
    const minutes = Number(preset.id.slice(6));
    if (Number.isFinite(minutes) && minutes > 0) {
      let label: string;
      if (minutes % (24 * 60) === 0) {
        const count = minutes / (24 * 60);
        label =
          count === 1
            ? tr(msg("In {count} day", { count }))
            : tr(msg("In {count} days", { count }));
      } else if (minutes % 60 === 0) {
        const count = minutes / 60;
        label =
          count === 1
            ? tr(msg("In {count} hour", { count }))
            : tr(msg("In {count} hours", { count }));
      } else {
        label =
          minutes === 1
            ? tr(msg("In {count} minute", { count: minutes }))
            : tr(msg("In {count} minutes", { count: minutes }));
      }
      return { ...preset, label };
    }
  }
  let label = preset.label;
  switch (preset.label) {
    case "This morning":
      label = tr(msg("This morning", {}));
      break;
    case "This afternoon":
      label = tr(msg("This afternoon", {}));
      break;
    case "This evening":
      label = tr(msg("This evening", {}));
      break;
    case "Tomorrow":
      label = tr(msg("Tomorrow", {}));
      break;
    case "Next week":
      label = tr(msg("Next week", {}));
      break;
    case "Monday":
      label = tr(msg("Monday", {}));
      break;
    case "Tuesday":
      label = tr(msg("Tuesday", {}));
      break;
    case "Wednesday":
      label = tr(msg("Wednesday", {}));
      break;
    case "Thursday":
      label = tr(msg("Thursday", {}));
      break;
    case "Friday":
      label = tr(msg("Friday", {}));
      break;
    case "Saturday":
      label = tr(msg("Saturday", {}));
      break;
    case "Sunday":
      label = tr(msg("Sunday", {}));
      break;
    case "Next Monday":
      label = tr(msg("Next Monday", {}));
      break;
    case "Next Tuesday":
      label = tr(msg("Next Tuesday", {}));
      break;
    case "Next Wednesday":
      label = tr(msg("Next Wednesday", {}));
      break;
    case "Next Thursday":
      label = tr(msg("Next Thursday", {}));
      break;
    case "Next Friday":
      label = tr(msg("Next Friday", {}));
      break;
    case "Next Saturday":
      label = tr(msg("Next Saturday", {}));
      break;
    case "Next Sunday":
      label = tr(msg("Next Sunday", {}));
      break;
  }
  return label === preset.label ? preset : { ...preset, label };
}

/** The snooze menu for a thread, from its environment's presets, read when the menu opens. */
export function resolveSnoozePresets(
  now: Date,
  timestampFormat: TimestampFormat,
  environmentId: EnvironmentId,
): ReadonlyArray<SnoozePreset> {
  return resolveSharedSnoozePresets(now, snoozeOptions(timestampFormat, environmentId)).map(
    localizeSnoozePreset,
  );
}

/** A shown menu choice as picked; see the shared `pickSnoozePreset`. */
export function pickSnoozePreset(
  shown: ReadonlyArray<SnoozePreset>,
  id: string,
  timestampFormat: TimestampFormat,
  environmentId: EnvironmentId,
): SnoozePreset | undefined {
  const picked = pickSharedSnoozePreset({
    shown,
    id,
    now: new Date(),
    ...snoozeOptions(timestampFormat, environmentId),
  });
  if (!picked) {
    toastManager.add({
      type: "warning",
      title: tr(msg("Could not snooze thread", {})),
      description: tr(msg("That snooze time has passed. Choose another time.", {})),
    });
  }
  return picked;
}

function snoozeOptions(timestampFormat: TimestampFormat, environmentId: EnvironmentId) {
  const presets = appAtomRegistry.get(
    serverEnvironment.settingsValueAtom(environmentId),
  )?.snoozePresets;
  return {
    ...(presets ? { presets } : {}),
    formatTime: (date: Date) => formatShortTimestamp(date.toISOString(), timestampFormat),
  };
}
