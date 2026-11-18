import { View } from "react-native";
import { Notice } from "../../components/ui/Notice";
import { useGT } from "../../i18n/runtime";

export function ComposerErrorNotice(props: {
  readonly message: string;
  readonly onDismiss: () => void;
}) {
  const gt = useGT();
  return (
    <View className="px-4 pb-3">
      <Notice
        message={props.message}
        icon="exclamationmark.circle"
        iconTone="danger"
        floating
        onDismiss={props.onDismiss}
        dismissLabel={gt("Dismiss error")}
      />
    </View>
  );
}
