import { PROVIDER_SEND_TURN_MAX_INPUT_CHARS } from "@t3tools/contracts";
import { expandAssistantCitationsForProvider } from "@t3tools/shared/assistantCitations";
import { gtFallback } from "gt-react";

type ComposerSubmitEvent = { preventDefault: () => void };

type ComposerSubmissionInput = {
  prompt: string;
  providerInput?: string;
  submissionTarget: "provider-turn" | "pending-user-input";
};

export function getComposerPromptLengthValidationMessage(
  prompt: string,
  gt: typeof gtFallback = gtFallback,
): string | null {
  const normalizedPrompt = prompt.trim();
  const inputLength = Math.max(
    normalizedPrompt.length,
    expandAssistantCitationsForProvider(normalizedPrompt).length,
  );
  const excessCharacters = inputLength - PROVIDER_SEND_TURN_MAX_INPUT_CHARS;
  if (excessCharacters <= 0) return null;

  const excess = excessCharacters.toLocaleString("en-US");
  const limit = PROVIDER_SEND_TURN_MAX_INPUT_CHARS.toLocaleString("en-US");
  return excessCharacters === 1
    ? gt(
        "Prompt is {excess} character over the {limit}-character limit. Shorten or split it before sending.",
        { excess, limit },
      )
    : gt(
        "Prompt is {excess} characters over the {limit}-character limit. Shorten or split it before sending.",
        { excess, limit },
      );
}

export function getComposerSubmissionValidationMessage(
  options: ComposerSubmissionInput,
  gt: typeof gtFallback = gtFallback,
): string | null {
  return options.submissionTarget === "provider-turn"
    ? getComposerPromptLengthValidationMessage(options.providerInput ?? options.prompt, gt)
    : null;
}

// Answering a question responds to the open request instead of starting a provider turn, so
// provider and turn-send state must not block it. Its own attachments and connection still do.
export function isComposerSubmissionBlocked(input: {
  submissionTarget: ComposerSubmissionInput["submissionTarget"];
  noProviderAvailable: boolean;
  sendDisabledReason: string | null;
  attachmentBlockReason: string | null;
  environmentUnavailable: boolean;
}): boolean {
  return input.submissionTarget === "pending-user-input"
    ? input.attachmentBlockReason !== null || input.environmentUnavailable
    : input.noProviderAvailable || input.sendDisabledReason !== null;
}

export function submitComposerDraft(
  options: ComposerSubmissionInput & {
    event: ComposerSubmitEvent | undefined;
    onSend: (event?: ComposerSubmitEvent) => boolean | void;
    gt?: typeof gtFallback;
  },
): { validationMessage: string | null; didDispatch: boolean } {
  const validationMessage = getComposerSubmissionValidationMessage(options, options.gt);
  if (validationMessage) {
    options.event?.preventDefault();
    return { validationMessage, didDispatch: false };
  }

  if (options.onSend(options.event) === false) {
    options.event?.preventDefault();
    return { validationMessage: null, didDispatch: false };
  }
  return { validationMessage: null, didDispatch: true };
}
