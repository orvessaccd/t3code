import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useAdaptiveWorkspaceLayout } from "../layout/adaptive-workspace-context";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  moveNavigationTab,
  navigationCustomizationAvailable,
  toggleNavigationTabVisibility,
} from "../layout/workspace/navigation-tab-order";
import { AppText as Text } from "../../components/ui/AppText";
import { IconButton } from "../../components/ui/IconButton";
import { Button } from "../../components/ui/Button";
import { ScreenScrollView } from "../../components/ui/ScreenScrollView";
import { SymbolView } from "../../components/ui/AppSymbol";
import { useGT, useMessages } from "../../i18n/runtime";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import {
  NAVIGATION_TAB_ICONS,
  WORKSPACE_TAB_LABELS,
  useNavigationTabOrder,
  useHiddenNavigationTabs,
  useEnabledNavigationTabs,
} from "../layout/workspace/navigation-tabs";
import { SettingsScreen } from "./components/SettingsScreen";
import { SettingsSection } from "./components/SettingsSection";
import { resolveWorkspaceTabOrder } from "../layout/workspace/workspace-tabs-state";

export function SettingsNavigationRouteScreen() {
  const gt = useGT();
  const m = useMessages();
  const insets = useSafeAreaInsets();
  const order = useNavigationTabOrder();
  const { layout } = useAdaptiveWorkspaceLayout();
  const capacity = Platform.OS === "android" && layout.usesSplitView ? 5 : 4;
  const hidden = useHiddenNavigationTabs();
  const enabled = useEnabledNavigationTabs();
  const preferences = useAtomValue(mobilePreferencesAtom);
  const customizable = navigationCustomizationAvailable();
  const ready = customizable && AsyncResult.isSuccess(preferences) && !preferences.waiting;
  const save = useAtomSet(updateMobilePreferencesAtom);
  return (
    <SettingsScreen title={gt("Navigation tabs")}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <Text className="px-2 text-sm text-foreground-muted">
          {customizable
            ? gt(
                "Phones show the first four enabled sections; Android tablet rails show all enabled sections. Remaining sections appear at the top of Settings. Hidden sections appear only here. Settings always stays last. Saved on this device.",
              )
            : gt(
                "Tab customization becomes available when there are six sections, including Settings.",
              )}
        </Text>
        <SettingsSection title={gt("Tab order")}>
          {order.map((tab, index) => {
            const tabLabel = m(WORKSPACE_TAB_LABELS[tab]);
            return (
              <View key={tab} className="flex-row items-center gap-3 px-4 py-3">
                <SymbolView
                  name={NAVIGATION_TAB_ICONS[tab]}
                  size={22}
                  tintColorClassName="accent-icon"
                />
                <View className="flex-1">
                  <Text>{tabLabel}</Text>
                  <Text className="text-xs text-foreground-muted">
                    {hidden.includes(tab)
                      ? gt("Hidden")
                      : enabled.indexOf(tab) < capacity
                        ? gt("Tab {number}", { number: enabled.indexOf(tab) + 1 })
                        : gt("In Settings")}
                  </Text>
                </View>
                <IconButton
                  icon={hidden.includes(tab) ? "eye.slash" : "eye"}
                  accessibilityLabel={
                    hidden.includes(tab)
                      ? gt("Show {tab}", { tab: tabLabel })
                      : gt("Hide {tab}", { tab: tabLabel })
                  }
                  disabled={!ready}
                  onPress={() =>
                    save({
                      transform: (current) => ({
                        hiddenNavigationTabs: toggleNavigationTabVisibility(
                          current.hiddenNavigationTabs,
                          tab,
                        ),
                      }),
                    })
                  }
                />
                <IconButton
                  icon="arrow.up"
                  accessibilityLabel={gt("Move {tab} up", { tab: tabLabel })}
                  disabled={!ready || index === 0}
                  onPress={() =>
                    save({
                      transform: (current) => ({
                        navigationTabOrder: moveNavigationTab(
                          resolveWorkspaceTabOrder(current.navigationTabOrder),
                          tab,
                          index - 1,
                        ),
                      }),
                    })
                  }
                />
                <IconButton
                  icon="arrow.down"
                  accessibilityLabel={gt("Move {tab} down", { tab: tabLabel })}
                  disabled={!ready || index === order.length - 1}
                  onPress={() =>
                    save({
                      transform: (current) => ({
                        navigationTabOrder: moveNavigationTab(
                          resolveWorkspaceTabOrder(current.navigationTabOrder),
                          tab,
                          index + 1,
                        ),
                      }),
                    })
                  }
                />
              </View>
            );
          })}
        </SettingsSection>
        <Button
          label={gt("Reset tabs")}
          tone="text"
          disabled={!ready}
          onPress={() => save({ navigationTabOrder: [], hiddenNavigationTabs: [] })}
        />
      </ScreenScrollView>
    </SettingsScreen>
  );
}
