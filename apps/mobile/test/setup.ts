import * as React from "react";
import { vi } from "vite-plus/test";

function hasActiveReactDispatcher(): boolean {
  const internals = (
    React as {
      __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H?: unknown };
    }
  ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  return internals?.H != null;
}

// Standalone component and hook unit tests mount outside <GTProvider>; fall back to source-locale ICU formatting.
vi.mock("gt-react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("gt-react-native")>();
  return {
    ...actual,
    useGT: ((namespace) => {
      if (!hasActiveReactDispatcher()) return actual.gtFallback;
      try {
        return actual.useGT(namespace);
      } catch {
        return actual.gtFallback;
      }
    }) as typeof actual.useGT,
    useMessages: ((namespace) => {
      if (!hasActiveReactDispatcher()) return actual.mFallback;
      try {
        return actual.useMessages(namespace);
      } catch {
        return actual.mFallback;
      }
    }) as typeof actual.useMessages,
    useLocale: (() => {
      if (!hasActiveReactDispatcher()) return "en";
      try {
        return actual.useLocale();
      } catch {
        return "en";
      }
    }) as typeof actual.useLocale,
  };
});
