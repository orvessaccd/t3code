import type { PullRequestContextMetadata } from "@t3tools/contracts";
import {
  capitalizeTerm,
  sourceControlClients,
} from "@t3tools/client-runtime/source-control-clients";
import { useGT, useMessages } from "gt-react";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { resolvePullRequestState } from "./pullRequest/pullRequestPresentation";

export function PullRequestContextDetails({ metadata }: { metadata: PullRequestContextMetadata }) {
  const gt = useGT();
  const m = useMessages();
  const state = resolvePullRequestState(metadata);
  // A context chip carries the change request's URL alone, so the URL names its host.
  const { singular } = (
    sourceControlClients.findByChangeRequestUrl(metadata.url) ?? sourceControlClients.get(undefined)
  ).changeRequest;
  const heading =
    singular === "merge request"
      ? gt("Merge request #{number}", { number: metadata.number })
      : singular === "pull request"
        ? gt("Pull request #{number}", { number: metadata.number })
        : `${capitalizeTerm(singular)} #${metadata.number}`;
  return (
    <div className="max-w-80 space-y-1 overflow-hidden py-0.5 text-left">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <state.Icon className={cn("size-3.5 shrink-0", state.toneClassName)} />
        <span className="text-foreground">{heading}</span>
        <span className={state.toneClassName}>{m(state.label)}</span>
      </div>
      <div className="wrap-break-word text-foreground">{metadata.title}</div>
      <div className="flex min-w-0 items-center gap-1 text-secondary-label text-3xs">
        <code className="truncate">{metadata.headBranch}</code>
        <ArrowRightIcon className="size-3 shrink-0" aria-hidden="true" />
        <code className="truncate">{metadata.baseBranch}</code>
      </div>
    </div>
  );
}
