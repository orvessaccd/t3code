import type { ComponentProps } from "react";
import { FloatingActionButton } from "./ui/FloatingActionButton.android";
import { ScrollComposeButton } from "./ScrollComposeButton.android";
import type { NewThreadButton as SharedNewThreadButton } from "./NewThreadButton.shared";
import { useGT } from "../i18n/runtime";

export function NewThreadButton(props: ComponentProps<typeof SharedNewThreadButton>) {
  const gt = useGT();
  if (props.extended && props.expanded !== undefined) {
    return <ScrollComposeButton {...props} expanded={props.expanded} />;
  }
  return (
    <FloatingActionButton
      {...props}
      icon="square.and.pencil"
      label={gt("New thread")}
      tone="primary"
      variant={props.extended ? "extended" : "large"}
    />
  );
}
