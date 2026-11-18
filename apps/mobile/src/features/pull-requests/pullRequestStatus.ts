import type {
  PullRequestActivity,
  PullRequestCheck,
  PullRequestChecksState,
  PullRequestDetail,
  PullRequestListEntry,
  PullRequestMergeability,
} from "@t3tools/contracts";
import type { AppSymbolName } from "../../components/ui/AppSymbol";
import { type useGT } from "../../i18n/runtime";
import { PullRequestGlyph } from "./pullRequestGlyphs";

type TranslateFn = ReturnType<typeof useGT>;

const STATES = {
  open: {
    label: "Open",
    icon: PullRequestGlyph.pullRequest,
    tint: "accent-adaptive-emerald-600-400",
    text: "text-adaptive-emerald-600-400",
    background: "bg-adaptive-emerald-500-a12-a16",
  },
  merged: {
    label: "Merged",
    icon: PullRequestGlyph.merged,
    tint: "accent-adaptive-violet-600-400",
    text: "text-adaptive-violet-600-400",
    background: "bg-adaptive-violet-500-a12-a16",
  },
  closed: {
    label: "Closed",
    icon: PullRequestGlyph.closed,
    tint: "accent-danger-foreground",
    text: "text-danger-foreground",
    background: "bg-danger",
  },
  draft: {
    label: "Draft",
    icon: PullRequestGlyph.draft,
    tint: "accent-icon-muted",
    text: "text-foreground-muted",
    background: "bg-grouped-card",
  },
} satisfies Record<
  string,
  { label: string; icon: AppSymbolName; tint: string; text: string; background: string }
>;

export function pullRequestStatus(
  pr: Pick<PullRequestListEntry, "state" | "isDraft">,
  gt?: TranslateFn,
) {
  const key = pr.isDraft && pr.state === "open" ? "draft" : pr.state;
  const base = STATES[key];
  if (!gt) return base;
  const label =
    key === "draft"
      ? gt("Draft")
      : key === "open"
        ? gt("Open")
        : key === "merged"
          ? gt("Merged")
          : gt("Closed");
  return { ...base, label };
}

export function pullRequestConflict(
  pr: {
    readonly state: PullRequestListEntry["state"];
    readonly isDraft: boolean;
    readonly mergeability?: PullRequestMergeability | undefined;
    readonly baseBranch?: string | undefined;
  },
  gt?: TranslateFn,
) {
  if (pr.state !== "open" || pr.isDraft || pr.mergeability !== "conflicting") return null;
  if (!gt) {
    return { label: pr.baseBranch ? `Conflicts with ${pr.baseBranch}` : "Has conflicts" };
  }
  return {
    label: pr.baseBranch
      ? gt("Conflicts with {baseBranch}", { baseBranch: pr.baseBranch })
      : gt("Has conflicts"),
  };
}

export function checkStatus(check: PullRequestCheck, gt?: TranslateFn) {
  switch (check.status) {
    case "success":
      return {
        label: gt ? gt("Passed") : "Passed",
        icon: "checkmark.circle",
        tint: "accent-adaptive-emerald-600-400",
      } as const;
    case "failure":
      return {
        label: gt ? gt("Failed") : "Failed",
        icon: "exclamationmark.circle",
        tint: "accent-danger-foreground",
      } as const;
    case "action-required":
      return {
        label: gt ? gt("Action required") : "Action required",
        icon: "exclamationmark.circle",
        tint: "accent-warning-foreground",
      } as const;
    case "pending":
      return {
        label: gt ? gt("Pending") : "Pending",
        icon: "clock",
        tint: "accent-warning-foreground",
      } as const;
    case "cancelled":
      return {
        label: gt ? gt("Cancelled") : "Cancelled",
        icon: "minus",
        tint: "accent-icon-muted",
      } as const;
    case "skipped":
      return {
        label: gt ? gt("Skipped") : "Skipped",
        icon: "slash.circle",
        tint: "accent-icon-muted",
      } as const;
    case "neutral":
      return {
        label: gt ? gt("Neutral") : "Neutral",
        icon: "minus",
        tint: "accent-icon-muted",
      } as const;
  }
}

export function isFailingCheck(check: PullRequestCheck) {
  return check.status === "failure" || check.status === "cancelled";
}

export function pullRequestChecksSummary(pr: Pick<PullRequestDetail, "checks">, gt?: TranslateFn) {
  const failed = pr.checks.filter(isFailingCheck).length;
  const required = pr.checks.filter((check) => check.status === "action-required").length;
  const pending = pr.checks.filter((check) => check.status === "pending").length;
  const passed = pr.checks.filter((check) => check.status === "success").length;
  const count = pr.checks.length
    ? gt
      ? gt("{passed} of {total}", { passed, total: pr.checks.length })
      : `${passed} of ${pr.checks.length}`
    : undefined;
  if (failed) {
    const failingText = gt
      ? failed === 1
        ? gt("1 check failing")
        : gt("{count} checks failing", { count: failed })
      : `${failed} ${failed === 1 ? "check" : "checks"} failing`;
    return {
      label: failingText,
      title: failingText,
      count,
      icon: "exclamationmark.circle",
      tint: "accent-danger-foreground",
    } as const;
  }
  if (required)
    return {
      label: gt ? gt("{count} need attention", { count: required }) : `${required} need attention`,
      title: gt ? gt("Checks need attention") : "Checks need attention",
      count: gt
        ? gt("{count} awaiting action", { count: required })
        : `${required} awaiting action`,
      icon: "exclamationmark.circle",
      tint: "accent-warning-foreground",
    } as const;
  if (pending)
    return {
      label: gt ? gt("{count} pending", { count: pending }) : `${pending} pending`,
      title: gt ? gt("Checks running") : "Checks running",
      count: gt ? gt("{count} pending", { count: pending }) : `${pending} pending`,
      icon: "clock",
      tint: "accent-warning-foreground",
    } as const;
  if (passed)
    return {
      label: gt
        ? gt("{passed} of {total} passed", { passed, total: pr.checks.length })
        : `${passed} of ${pr.checks.length} passed`,
      title:
        passed === pr.checks.length
          ? gt
            ? gt("All checks passed")
            : "All checks passed"
          : gt
            ? gt("Checks completed")
            : "Checks completed",
      count,
      icon: "checkmark.circle",
      tint: "accent-adaptive-emerald-600-400",
    } as const;
  return {
    label: pr.checks.length
      ? gt
        ? gt("{count} completed", { count: pr.checks.length })
        : `${pr.checks.length} completed`
      : gt
        ? gt("No checks reported")
        : "No checks reported",
    title: pr.checks.length
      ? gt
        ? gt("Checks completed")
        : "Checks completed"
      : gt
        ? gt("No checks reported")
        : "No checks reported",
    count,
    icon: "minus",
    tint: "accent-icon-muted",
  } as const;
}

// GitHub and Forgejo send uppercase review states; Bitbucket and GitCafe send lowercase.
export function normalizedReviewState(reviewState: string | null) {
  return reviewState?.toUpperCase().replaceAll("-", "_");
}

export function pullRequestReviewSummary(
  pr: Pick<PullRequestDetail, "reviewers">,
  activity: Pick<PullRequestActivity, "comments" | "commits"> | null,
  gt?: TranslateFn,
) {
  const latest = new Map<string, PullRequestActivity["comments"][number]>();
  const comments = new Map<string, PullRequestActivity["comments"][number]>();
  for (const review of activity?.comments ?? []) {
    const state = normalizedReviewState(review.reviewState);
    if (review.kind !== "review" || !state) continue;
    const key = review.author?.login ?? review.id;
    if (state === "COMMENTED") {
      const previous = comments.get(key);
      if (!previous || Date.parse(review.createdAt) >= Date.parse(previous.createdAt))
        comments.set(key, { ...review, reviewState: state });
      continue;
    }
    if (!["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(state)) continue;
    const previous = latest.get(key);
    if (!previous || Date.parse(review.createdAt) >= Date.parse(previous.createdAt))
      latest.set(key, { ...review, reviewState: state });
  }
  const reviews = [
    ...[...latest.values()].filter((review) => review.reviewState !== "DISMISSED"),
    ...[...comments.entries()].filter(([key]) => !latest.has(key)).map(([, review]) => review),
  ];
  const requested = reviews.filter((review) => review.reviewState === "CHANGES_REQUESTED");
  const newestCommit = Math.max(
    0,
    ...(activity?.commits.map((commit) => Date.parse(commit.committedDate)) ?? []),
  );
  const approved = reviews.filter(
    (review) => review.reviewState === "APPROVED" && Date.parse(review.createdAt) >= newestCommit,
  );
  if (requested.length)
    return {
      title: gt ? gt("Changes requested") : "Changes requested",
      count: gt
        ? requested.length === 1
          ? gt("1 reviewer")
          : gt("{count} reviewers", { count: requested.length })
        : `${requested.length} ${requested.length === 1 ? "reviewer" : "reviewers"}`,
      icon: "xmark.circle.fill",
      tint: "accent-danger-foreground",
      reviews,
    } as const;
  if (approved.length)
    return {
      title:
        approved.length === 1 && approved[0]?.author
          ? gt
            ? gt("Approved by {author}", { author: approved[0].author.login })
            : `Approved by ${approved[0].author.login}`
          : gt
            ? gt("Reviews approved")
            : "Reviews approved",
      count: gt
        ? gt("{count} approved", { count: approved.length })
        : `${approved.length} approved`,
      icon: "checkmark.circle",
      tint: "accent-adaptive-emerald-600-400",
      reviews,
    } as const;
  const commented = reviews.filter((review) => review.reviewState === "COMMENTED");
  if (commented.length && !pr.reviewers.length)
    return {
      title: gt ? gt("Reviews") : "Reviews",
      count: gt
        ? gt("{count} commented", { count: commented.length })
        : `${commented.length} commented`,
      icon: "bubble.left",
      tint: "accent-icon-muted",
      reviews,
    } as const;
  return {
    title: pr.reviewers.length
      ? gt
        ? gt("Awaiting review")
        : "Awaiting review"
      : gt
        ? gt("Request a review")
        : "Request a review",
    count: pr.reviewers.length
      ? gt
        ? gt("{count} requested", { count: pr.reviewers.length })
        : `${pr.reviewers.length} requested`
      : gt
        ? gt("None assigned")
        : "None assigned",
    icon: "person.2",
    tint: "accent-icon-muted",
    reviews,
  } as const;
}

export function pullRequestBranchSummary(
  pr: Pick<PullRequestDetail, "mergeability" | "baseComparison" | "behindBy" | "baseBranch">,
  gt?: TranslateFn,
) {
  if (!gt) {
    if (pr.mergeability === "conflicting") return "Has conflicts";
    if (pr.baseComparison === "behind")
      return `${pr.behindBy ?? ""} behind ${pr.baseBranch}`.trim();
    if (pr.baseComparison === "up-to-date") return "Up to date";
    return pr.mergeability === "mergeable" ? "No conflicts" : "Not reported";
  }
  if (pr.mergeability === "conflicting") return gt("Has conflicts");
  if (pr.baseComparison === "behind")
    return pr.behindBy != null
      ? gt("{count} behind {baseBranch}", { count: pr.behindBy, baseBranch: pr.baseBranch })
      : gt("Behind {baseBranch}", { baseBranch: pr.baseBranch });
  if (pr.baseComparison === "up-to-date") return gt("Up to date");
  return pr.mergeability === "mergeable" ? gt("No conflicts") : gt("Not reported");
}

export function pullRequestChecksStatus(state: PullRequestChecksState) {
  if (state === "passing")
    return { icon: "checkmark.circle", tint: "accent-adaptive-emerald-600-400" } as const;
  if (state === "failing")
    return { icon: "xmark.circle.fill", tint: "accent-danger-foreground" } as const;
  return { icon: "clock", tint: "accent-warning-foreground" } as const;
}
