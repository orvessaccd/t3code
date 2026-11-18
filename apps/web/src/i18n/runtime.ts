import { decodeMsg, decodeOptions, getTranslationsSnapshot, gtFallback } from "gt-react";

import { DEFAULT_LOCALE } from "./locales";

type LocaleTranslations = Awaited<ReturnType<typeof getTranslationsSnapshot>>;

export interface I18nSnapshot {
  readonly locale: string;
  readonly translations: LocaleTranslations;
}

const loadedTranslations: LocaleTranslations = { [DEFAULT_LOCALE]: {} };
const pendingLoads = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let snapshot: I18nSnapshot = { locale: DEFAULT_LOCALE, translations: { ...loadedTranslations } };
let requestedLocale = DEFAULT_LOCALE;
let localePersistenceHandler: ((locale: string) => void) | null = null;

function loadLocale(locale: string): Promise<void> {
  if (locale in loadedTranslations) return Promise.resolve();
  let load = pendingLoads.get(locale);
  if (!load) {
    // GT resolves a failed load to an empty catalog. Leave it uncached: English renders now
    // and the next request retries.
    load = getTranslationsSnapshot(locale).then((loaded) => {
      pendingLoads.delete(locale);
      const translations = loaded[locale];
      if (translations && Object.keys(translations).length > 0) {
        loadedTranslations[locale] = translations;
      }
    });
    pendingLoads.set(locale, load);
  }
  return load;
}

function activateLocale(locale: string): void {
  if (requestedLocale !== locale) return;
  if (snapshot.locale === locale && snapshot.translations[locale] === loadedTranslations[locale]) {
    return;
  }
  snapshot = { locale, translations: { ...loadedTranslations } };
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = locale;
  }
  for (const listener of listeners) listener();
}

export function setLocalePersistenceHandler(handler: (locale: string) => void): void {
  localePersistenceHandler = handler;
}

export function requestI18nLocale(locale: string): void {
  requestedLocale = locale;
  void whenLocaleReady();
}

/** GT's own locale setters write the saved setting, which stays the only source of truth. */
export function persistGTLocale(locale: string): void {
  localePersistenceHandler?.(locale);
}

/** Resolves once the requested locale's translations are ready; immediate for English. */
export function whenLocaleReady(): Promise<void> {
  const locale = requestedLocale;
  return loadLocale(locale).then(() => activateLocale(locale));
}

export function subscribeI18n(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getI18nSnapshot(): I18nSnapshot {
  return snapshot;
}

export function getActiveLocale(): string {
  return snapshot.locale;
}

export function translateEncodedMessage(encoded: string): string {
  const locale = snapshot.locale;
  if (!locale || locale === DEFAULT_LOCALE) return decodeMsg(encoded);
  const opts = decodeOptions(encoded);
  const hash = typeof opts?.$_hash === "string" ? opts.$_hash : undefined;
  if (!hash) return decodeMsg(encoded);
  const dict = snapshot.translations[locale] as Record<string, unknown> | undefined;
  const entry = dict?.[hash];
  if (typeof entry === "string") return gtFallback(entry, opts ?? undefined);
  return decodeMsg(encoded);
}
