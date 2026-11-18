import { resolveLocale } from "@t3tools/client-runtime/locales";

import {
  getClientSettings,
  subscribeClientSettings,
  updateClientSettings,
} from "../hooks/useSettings";
import { initializeI18n } from "./initializeI18n";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./locales";
import { persistGTLocale, requestI18nLocale, setLocalePersistenceHandler } from "./runtime";

function readPreferredSystemLanguages(): ReadonlyArray<string> {
  if (typeof window !== "undefined") {
    const desktopLanguages = window.desktopBridge?.getPreferredSystemLanguages?.();
    if (desktopLanguages && desktopLanguages.length > 0) return desktopLanguages;
  }
  return navigator.languages;
}

function applyLanguageSetting(): void {
  // Not desktopBridge.getSystemLocale(): that is the regional/time locale, not the UI language.
  const nextLocale = resolveLocale(
    getClientSettings().language,
    readPreferredSystemLanguages(),
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
  );
  requestI18nLocale(nextLocale);
}

export function startI18n(): void {
  setLocalePersistenceHandler((locale) => {
    void updateClientSettings({ language: locale });
  });
  initializeI18n(persistGTLocale);
  subscribeClientSettings(applyLanguageSetting);
  applyLanguageSetting();
}
