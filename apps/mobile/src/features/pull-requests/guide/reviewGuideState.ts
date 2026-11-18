import type { PullRequestReviewGuideResult } from "@t3tools/contracts";
import { type useGT } from "../../../i18n/runtime";

type TranslateFn = ReturnType<typeof useGT>;

export function reviewGuideState(data: PullRequestReviewGuideResult | null) {
  const guide = data?.guide ?? null;
  return {
    guide,
    running: data?.run?._tag === "Running",
    stale: guide !== null && data?.currentHeadSha != null && guide.headSha !== data.currentHeadSha,
    failure:
      data?.run?._tag === "Failed" && data.run.headSha === data.currentHeadSha
        ? data.run.detail
        : null,
  };
}

export function guideNoticeState(
  state: {
    readonly data: PullRequestReviewGuideResult | null;
    readonly isPending: boolean;
    readonly running: boolean;
    readonly startError: string | null;
    readonly error: string | null;
  },
  gt?: TranslateFn,
) {
  const { guide, stale, failure } = reviewGuideState(state.data);
  if (state.running) {
    return {
      kind: "writing" as const,
      title: gt ? gt("Rewriting guide") : "Rewriting guide",
      description: guide
        ? gt
          ? gt("You can keep reading this guide while the agent writes the update.")
          : "You can keep reading this guide while the agent writes the update."
        : gt
          ? gt(
              "An agent is reading the change and writing the tour. You can leave and come back when it’s ready.",
            )
          : "An agent is reading the change and writing the tour. You can leave and come back when it’s ready.",
      action: guide
        ? gt
          ? gt("Rewriting…")
          : "Rewriting…"
        : gt
          ? gt("Writing guide…")
          : "Writing guide…",
    };
  }
  const error = state.startError ?? failure;
  if (error) {
    return {
      kind: "failed" as const,
      title: gt ? gt("Could not write guide") : "Could not write guide",
      description: error,
      action: gt ? gt("Try again") : "Try again",
    };
  }
  if (state.error) {
    return {
      kind: "unavailable" as const,
      title: gt ? gt("Could not refresh guide") : "Could not refresh guide",
      description: state.error,
      action: gt ? gt("Try again") : "Try again",
    };
  }
  if (!state.data) {
    return {
      kind: "loading" as const,
      title: gt ? gt("Review guide") : "Review guide",
      description: gt ? gt("Checking for a saved guide…") : "Checking for a saved guide…",
      action: gt ? gt("Loading guide…") : "Loading guide…",
    };
  }
  if (stale) {
    return {
      kind: "stale" as const,
      title: gt ? gt("New changes since this guide") : "New changes since this guide",
      description: gt
        ? gt("You can read the previous guide, or rewrite it for the latest changes.")
        : "You can read the previous guide, or rewrite it for the latest changes.",
      action: gt ? gt("Rewrite guide") : "Rewrite guide",
    };
  }
  return {
    kind: guide ? ("ready" as const) : ("empty" as const),
    title: gt ? gt("Review guide") : "Review guide",
    description: gt
      ? gt("Get a tour of the change, with code excerpts and notes on what needs a closer look.")
      : "Get a tour of the change, with code excerpts and notes on what needs a closer look.",
    action: gt ? gt("Write guide") : "Write guide",
  };
}
