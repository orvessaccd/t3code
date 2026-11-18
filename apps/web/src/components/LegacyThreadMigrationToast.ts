import { translateEncodedMessage as tr } from "../i18n/runtime";
import { msg } from "gt-react";

import { appAtomRegistry } from "../rpc/atomRegistry";
import { primaryServerLegacyThreadMigrationAtom } from "../state/server";
import { toastManager } from "./ui/toast";

type MigrationToastId = ReturnType<typeof toastManager.add>;

/** A loading toast for as long as the primary server reports a legacy thread migration running. */
export function startLegacyThreadMigrationToast(): () => void {
  let toastId: MigrationToastId | null = null;

  const unsubscribe = appAtomRegistry.subscribe(
    primaryServerLegacyThreadMigrationAtom,
    (migration) => {
      if (migration?.status === "running") {
        if (toastId !== null) return;
        const count = migration.totalThreadCount.toLocaleString();
        toastId = toastManager.add({
          type: "loading",
          title: tr(msg("Restoring your threads…", {})),
          description:
            migration.totalThreadCount === 1
              ? tr(
                  msg(
                    "Migrating {count} thread from the previous version. You can keep working while this finishes.",
                    { count },
                  ),
                )
              : tr(
                  msg(
                    "Migrating {count} threads from the previous version. You can keep working while this finishes.",
                    { count },
                  ),
                ),
          timeout: 0,
        });
        return;
      }

      if (toastId !== null) {
        toastManager.close(toastId);
        toastId = null;
      }
    },
    { immediate: true },
  );

  return () => {
    unsubscribe();
    if (toastId !== null) toastManager.close(toastId);
  };
}
