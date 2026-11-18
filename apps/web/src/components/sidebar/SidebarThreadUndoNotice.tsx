import { useAtomValue } from "@effect/atom-react";
import { msg, useGT, useMessages } from "gt-react";
import { Undo2Icon } from "lucide-react";
import { useState } from "react";

import { undoLatestThreadAction, useThreadUndoNotice } from "../../hooks/showThreadUndoNotice";
import { shortcutLabelForCommand } from "../../keybindings";
import { cn } from "../../lib/utils";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { InlineButton } from "../ui/button";
import { SidebarMenuItem } from "../ui/sidebar";

const ACTION_LABELS = {
  Settled: msg("Settled"),
  Snoozed: msg("Snoozed"),
  Unpinned: msg("Unpinned"),
  Archived: msg("Archived"),
  Discarded: msg("Discarded"),
} as const;

/** Fills the free space in the sidebar footer's utility row, so it never moves or covers the list. */
export function SidebarThreadUndoNotice() {
  const gt = useGT();
  const m = useMessages();
  const notice = useThreadUndoNotice((state) => state.notice);
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const actionLabel = notice ? m(ACTION_LABELS[notice.action]) : null;
  // Short enough to fit beside the utility icons; screen readers hear the full summary.
  const summary =
    notice && actionLabel
      ? notice.count === 1
        ? actionLabel
        : `${actionLabel} ${notice.count}`
      : null;

  // Keeps the last text on screen while it fades out, then unmounts on transitionend.
  const [shownSummary, setShownSummary] = useState(summary);
  if (summary && summary !== shownSummary) setShownSummary(summary);
  const text = summary ?? shownSummary;
  if (!text) return null;
  const undoShortcut = shortcutLabelForCommand(keybindings, "thread.undo");
  const undoLabel = undoShortcut
    ? gt("{shortcut} to undo", { shortcut: undoShortcut })
    : gt("Undo");

  return (
    <SidebarMenuItem
      className="@container flex min-w-0 flex-1"
      aria-hidden={!summary}
      inert={!summary}
    >
      <div
        onTransitionEnd={(event) => {
          if (!summary && event.target === event.currentTarget) setShownSummary(null);
        }}
        // Reversed wrap: a summary that does not fit beside the undo button drops to a
        // second line that overflow hides, instead of truncating mid-word. Browse mode
        // reads the button first; the live announcement carries the full sentence.
        className={cn(
          "flex h-6 min-w-0 flex-1 flex-row-reverse flex-wrap gap-x-1 overflow-hidden text-2xs leading-6 whitespace-nowrap text-sidebar-muted-foreground transition-opacity duration-200 ease-out starting:opacity-0",
          !summary && "opacity-0",
        )}
      >
        <InlineButton className="min-w-0 shrink" onClick={undoLatestThreadAction}>
          {/* The icon's negative margin cancels its width, so beside the label it sits in
              clipped space; once the label is too wide it wraps away and the icon shows. */}
          <span className="flex h-6 min-w-0 flex-wrap justify-end overflow-hidden">
            <Undo2Icon className="-ml-4 h-6 w-4 @max-[1rem]:invisible" />
            <span>{undoLabel}</span>
          </span>
        </InlineButton>
        <span>{text},</span>
      </div>
    </SidebarMenuItem>
  );
}
