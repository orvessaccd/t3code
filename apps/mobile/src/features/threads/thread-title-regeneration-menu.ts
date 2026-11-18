import type { MenuAction } from "@react-native-menu/menu";
import type { useGT } from "../../i18n/runtime";

export function buildThreadTitleRegenerationMenuItems(input: {
  readonly supported: boolean;
  readonly isRegenerating: boolean;
  readonly gt?: ReturnType<typeof useGT>;
}): MenuAction[] {
  if (!input.supported) return [];
  const { gt } = input;

  return [
    {
      id: "regenerate-title",
      title: input.isRegenerating
        ? gt
          ? gt("Regenerating…")
          : "Regenerating…"
        : gt
          ? gt("Regenerate title")
          : "Regenerate title",
      image: "arrow.clockwise",
      ...(input.isRegenerating ? { attributes: { disabled: true } } : {}),
    },
  ];
}
