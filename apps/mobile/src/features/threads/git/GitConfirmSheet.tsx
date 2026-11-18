import { resolveDefaultBranchActionDialogCopy } from "@t3tools/client-runtime/state/vcs";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import { resolveAutoFeatureBranchName } from "@t3tools/shared/git";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import { StackActions, useNavigation, type StaticScreenProps } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { SheetHeader } from "../../../components/ui/SheetHeader";
import { FitSheet } from "../../../components/ui/FitSheet";
import { SheetIntro } from "../../../components/ui/SheetIntro";
import { useGT } from "../../../i18n/runtime";
import { useSelectedThreadGitActions } from "../../../state/use-selected-thread-git-actions";
import { useSelectedThreadGitState } from "../../../state/use-selected-thread-git-state";
import { useThreadSelection } from "../../../state/use-thread-selection";
import { SheetActionButton } from "./gitSheetComponents";

type GitConfirmSheetProps = StaticScreenProps<{
  readonly environmentId: string;
  readonly threadId: string;
  readonly confirmAction?: string;
  readonly branchName?: string;
  readonly includesCommit?: string;
  readonly commitMessage?: string;
  readonly filePaths?: string;
}>;

export function GitConfirmSheet(props: GitConfirmSheetProps) {
  const gt = useGT();
  const navigation = useNavigation();
  const gitState = useSelectedThreadGitState();
  const gitActions = useSelectedThreadGitActions();
  const { canWriteSourceControl, canChangeThreadBranch } = gitActions;
  const { selectedThreadProject } = useThreadSelection();
  const terminology = sourceControlClients.get(
    selectedThreadProject?.repositoryIdentity?.provider,
  ).changeRequest;

  const params = props.route.params;

  const confirmAction = params.confirmAction as
    | "push"
    | "create_pr"
    | "commit_push"
    | "commit_push_pr"
    | undefined;
  const branchName = params.branchName ?? "";
  const includesCommit = params.includesCommit === "true";
  const environmentId = params.environmentId ?? "";
  const threadId = params.threadId ?? "";

  const copy = useMemo(() => {
    if (!confirmAction) return null;
    const _fallback = resolveDefaultBranchActionDialogCopy({
      action: confirmAction,
      branchName,
      includesCommit,
      terminology,
    });
    void _fallback;
    if (confirmAction === "push" || confirmAction === "commit_push") {
      if (includesCommit) {
        return {
          title: gt("Commit & push to default branch?"),
          description: gt(
            'This action will commit and push changes on "{branchName}". You can continue on this branch or create a feature branch and run the same action there.',
            { branchName },
          ),
          continueLabel: gt("Commit & push to {branchName}", { branchName }),
        };
      }
      return {
        title: gt("Push to default branch?"),
        description: gt(
          'This action will push local commits on "{branchName}". You can continue on this branch or create a feature branch and run the same action there.',
          { branchName },
        ),
        continueLabel: gt("Push to {branchName}", { branchName }),
      };
    }
    if (includesCommit) {
      if (terminology.shortLabel === "MR") {
        return {
          title: gt("Commit, push & create MR from default branch?"),
          description: gt(
            'This action will commit, push, and create an MR on "{branchName}". You can continue on this branch or create a feature branch and run the same action there.',
            { branchName },
          ),
          continueLabel: gt("Commit, push & create MR"),
        };
      }
      return {
        title: gt("Commit, push & create PR from default branch?"),
        description: gt(
          'This action will commit, push, and create a PR on "{branchName}". You can continue on this branch or create a feature branch and run the same action there.',
          { branchName },
        ),
        continueLabel: gt("Commit, push & create PR"),
      };
    }
    if (terminology.shortLabel === "MR") {
      return {
        title: gt("Push & create MR from default branch?"),
        description: gt(
          'This action will push local commits and create an MR on "{branchName}". You can continue on this branch or create a feature branch and run the same action there.',
          { branchName },
        ),
        continueLabel: gt("Push & create MR"),
      };
    }
    return {
      title: gt("Push & create PR from default branch?"),
      description: gt(
        'This action will push local commits and create a PR on "{branchName}". You can continue on this branch or create a feature branch and run the same action there.',
        { branchName },
      ),
      continueLabel: gt("Push & create PR"),
    };
  }, [branchName, confirmAction, gt, includesCommit, terminology]);

  const continuePendingAction = async () => {
    if (!canWriteSourceControl || !confirmAction) return;
    navigation.dispatch(StackActions.replace("Thread", { environmentId, threadId }));
    await gitActions.onRunSelectedThreadGitAction({
      action: confirmAction,
      ...(params.commitMessage ? { commitMessage: params.commitMessage } : {}),
      ...(params.filePaths ? { filePaths: params.filePaths.split(",") } : {}),
    });
  };

  const movePendingActionToFeatureBranch = useCallback(async () => {
    if (!canChangeThreadBranch || !confirmAction) return;
    navigation.dispatch(StackActions.replace("Thread", { environmentId, threadId }));

    if (includesCommit) {
      await gitActions.onRunSelectedThreadGitAction({
        action: confirmAction,
        featureBranch: true,
        ...(params.commitMessage ? { commitMessage: params.commitMessage } : {}),
        ...(params.filePaths ? { filePaths: params.filePaths.split(",") } : {}),
      });
      return;
    }

    const branches =
      gitState.selectedThreadBranches.length > 0
        ? gitState.selectedThreadBranches
        : await gitActions.refreshSelectedThreadBranches();
    if (branches === null) return;
    const newBranchName = resolveAutoFeatureBranchName(
      Arr.filterMap(branches, (branch) =>
        branch.isRemote ? Result.failVoid : Result.succeed(branch.name),
      ),
    );
    const created = await gitActions.onCreateSelectedThreadBranch(newBranchName);
    if (created === null) return;
    await gitActions.onRunSelectedThreadGitAction({ action: confirmAction });
  }, [
    canChangeThreadBranch,
    confirmAction,
    gitActions,
    gitState.selectedThreadBranches,
    includesCommit,
    params,
    navigation,
    environmentId,
    threadId,
  ]);

  return (
    <FitSheet
      header={<SheetHeader title={gt("Confirm action")} onClose={() => navigation.goBack()} />}
      showsVerticalScrollIndicator={false}
    >
      <SheetIntro
        eyebrow={gt("Confirm")}
        title={copy ? copy.title : gt("Run action on default branch?")}
        description={copy ? copy.description : gt("Choose how to continue.")}
      />

      <View className="gap-3">
        <SheetActionButton
          icon="arrow.right.circle"
          label={copy ? copy.continueLabel : gt("Continue")}
          disabled={!canWriteSourceControl}
          onPress={() => void continuePendingAction()}
        />
        <SheetActionButton
          icon="arrow.branch"
          label={gt("Feature branch & continue")}
          disabled={!canChangeThreadBranch}
          tone="primary"
          onPress={() => void movePendingActionToFeatureBranch()}
        />
      </View>
    </FitSheet>
  );
}
