import { translateEncodedMessage as tr } from "../i18n/runtime";
import type { ThreadTitleRegenerationOutcome } from "@t3tools/contracts";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import { msg } from "gt-react";

import { stackedThreadToast } from "./ui/toast";

type TitleRegenerationResult = AtomCommandResult<ThreadTitleRegenerationOutcome | null, unknown>;

function failureMessage(result: TitleRegenerationResult): string | null {
  if (result._tag === "Failure") {
    if (isAtomCommandInterrupted(result)) return null;
    const error = squashAtomCommandFailure(result);
    return error instanceof Error ? error.message : tr(msg("An error occurred.", {}));
  }
  return result.value?.status === "failed"
    ? (result.value.message ?? tr(msg("Title generation failed.", {})))
    : null;
}

function isKept(result: TitleRegenerationResult): boolean {
  return result._tag === "Success" && result.value?.status === "unchanged";
}

export function titleRegenerationToast(results: ReadonlyArray<TitleRegenerationResult>) {
  const failures = results.flatMap((result) => {
    const message = failureMessage(result);
    return message === null ? [] : [message];
  });
  if (failures.length > 0) {
    return stackedThreadToast({
      type: "error",
      title:
        results.length === 1
          ? tr(msg("Failed to regenerate thread title", {}))
          : tr(
              msg("Failed to regenerate {failedCount} of {totalCount} thread titles", {
                failedCount: failures.length,
                totalCount: results.length,
              }),
            ),
      description: failures[0],
    });
  }
  const kept = results.filter(isKept).length;
  if (kept === 0) return null;
  if (results.length === 1) {
    return stackedThreadToast({
      type: "info",
      title: tr(msg("Title kept", {})),
      description: tr(msg("The current title already fits this thread.", {})),
    });
  }
  return stackedThreadToast({
    type: "info",
    title:
      kept === results.length
        ? tr(msg("Titles kept", {}))
        : tr(
            msg("Kept {keptCount} of {totalCount} titles", {
              keptCount: kept,
              totalCount: results.length,
            }),
          ),
    description:
      kept === results.length
        ? tr(msg("The current titles already fit these threads.", {}))
        : tr(msg("Those titles already fit their threads.", {})),
  });
}
