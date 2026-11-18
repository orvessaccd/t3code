import "./intl-polyfills";
import {
  getTranslationsSnapshot,
  initializeGT,
  msg,
  T,
  useGT,
  useLocale,
  useMessages,
} from "gt-react-native";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./locales";
import de from "./translations/de.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";
import ja from "./translations/ja.json";
import ko from "./translations/ko.json";
import ptBR from "./translations/pt-BR.json";
import ru from "./translations/ru.json";
import zh from "./translations/zh.json";

// Screens and shared UI import GT from here so the polyfills above always load first.
export { msg, T, useGT, useLocale, useMessages };

export const INITIAL_LANGUAGE_PREFERENCE = "zh";

// Committed catalogs, so forks and offline installs never reach GT's CDN. English is the source.
const TRANSLATIONS: Readonly<Record<string, Record<string, string>>> = {
  es,
  zh,
  "pt-BR": ptBR,
  fr,
  de,
  ja,
  ko,
  ru,
};

initializeGT({
  defaultLocale: DEFAULT_LOCALE,
  locales: [...SUPPORTED_LOCALES],
  loadTranslations: async (locale: string) => TRANSLATIONS[locale] ?? {},
});

// Pre-warm the default Chinese catalog so the initial GTProvider mount resolves immediately.
void getTranslationsSnapshot(INITIAL_LANGUAGE_PREFERENCE);
