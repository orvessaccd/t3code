import { useGT } from "gt-react";
import { cn } from "~/lib/utils";

import { CommandBlock } from "./CommandBlock";

const CMD_TOKEN = "\uE000";

/**
 * Setup steps for another computer: install `t3`, then run `command`. Both installers are shown
 * because the browser showing this is often not the computer being set up.
 */
export function InstallT3Commands({
  command,
  className,
}: {
  readonly command: string;
  readonly className?: string;
}) {
  const gt = useGT();
  const [firstHint = "", secondHint, thirdHint] = gt(
    "Skip the install if you already have {cmd}. If {cmd} is not found after installing, add the folder the installer names to your PATH.",
    { cmd: CMD_TOKEN },
  ).split(CMD_TOKEN);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">macOS, Linux</p>
      <CommandBlock command="curl -fsSL https://t3.codes/install.sh | sh" />
      <p className="text-xs text-muted-foreground">Windows (PowerShell)</p>
      <CommandBlock command="irm https://t3.codes/install.ps1 | iex" />
      <p className="text-xs text-muted-foreground">{gt("Then")}</p>
      <CommandBlock command={command} />
      <p className="text-xs text-muted-foreground">
        {firstHint}
        {secondHint !== undefined ? (
          <>
            <code className="font-mono">t3</code>
            {secondHint}
          </>
        ) : null}
        {thirdHint !== undefined ? (
          <>
            <code className="font-mono">t3</code>
            {thirdHint}
          </>
        ) : null}
      </p>
    </div>
  );
}
