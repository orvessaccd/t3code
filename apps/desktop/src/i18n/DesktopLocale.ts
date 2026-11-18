import { DEFAULT_CLIENT_SETTINGS, type ClientSettings } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as ElectronApp from "../electron/ElectronApp.ts";
import * as DesktopClientSettings from "../settings/DesktopClientSettings.ts";

export type DesktopResolvedLocale = "en" | "zh";
type ClientLanguagePreference = ClientSettings["language"];

function normalizeLocaleTag(tag: string | null | undefined): DesktopResolvedLocale | null {
  if (!tag) return null;
  const normalized = tag.trim().toLowerCase();
  if (normalized === "zh" || normalized.startsWith("zh-") || normalized.startsWith("zh_")) {
    return "zh";
  }
  if (normalized === "en" || normalized.startsWith("en-") || normalized.startsWith("en_")) {
    return "en";
  }
  return null;
}

function resolveDesktopLocaleFromPreference(
  preference: ClientLanguagePreference,
  systemLanguages: ReadonlyArray<string>,
): DesktopResolvedLocale {
  if (preference === "zh" || preference === "en") {
    return preference;
  }
  for (const candidate of systemLanguages) {
    const resolved = normalizeLocaleTag(candidate);
    if (resolved !== null) {
      return resolved;
    }
  }
  return "en";
}

export class DesktopLocale extends Context.Service<
  DesktopLocale,
  {
    readonly get: Effect.Effect<DesktopResolvedLocale>;
    readonly current: () => DesktopResolvedLocale;
    readonly setFromClientSettings: (settings: ClientSettings) => Effect.Effect<{
      readonly previous: DesktopResolvedLocale;
      readonly next: DesktopResolvedLocale;
    }>;
  }
>()("@t3tools/desktop/i18n/DesktopLocale") {}

export const resolveOptionalDesktopLocale: Effect.Effect<DesktopResolvedLocale> =
  Effect.serviceOption(DesktopLocale).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed<DesktopResolvedLocale>("en"),
        onSome: (locale) => locale.get,
      }),
    ),
  );

const make = Effect.gen(function* () {
  const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
  const electronApp = yield* Effect.serviceOption(ElectronApp.ElectronApp);
  let cachedLocale: DesktopResolvedLocale = DEFAULT_CLIENT_SETTINGS.language === "zh" ? "zh" : "en";

  const readSystemLanguages = Option.match(electronApp, {
    onNone: () => Effect.succeed<ReadonlyArray<string>>([]),
    onSome: (app) =>
      Effect.all([
        app.preferredSystemLanguages.pipe(Effect.orElseSucceed(() => [] as ReadonlyArray<string>)),
        app.systemLocale.pipe(Effect.orElseSucceed(() => "")),
      ]).pipe(
        Effect.map(([preferred, system]) =>
          system.length > 0 ? [...preferred, system] : preferred,
        ),
      ),
  });

  const resolveForPreference = (preference: ClientLanguagePreference) =>
    preference === "system"
      ? readSystemLanguages.pipe(
          Effect.map((languages) => resolveDesktopLocaleFromPreference(preference, languages)),
        )
      : Effect.succeed<DesktopResolvedLocale>(preference === "zh" ? "zh" : "en");

  const get = clientSettings.get.pipe(
    Effect.orElseSucceed(() => Option.none<ClientSettings>()),
    Effect.map(
      Option.match({
        onNone: () => DEFAULT_CLIENT_SETTINGS.language,
        onSome: (settings) => settings.language,
      }),
    ),
    Effect.flatMap(resolveForPreference),
    Effect.tap((resolved) =>
      Effect.sync(() => {
        cachedLocale = resolved;
      }),
    ),
  );

  const setFromClientSettings = Effect.fn("desktop.locale.setFromClientSettings")(function* (
    settings: ClientSettings,
  ) {
    const previous = cachedLocale;
    const next = yield* resolveForPreference(settings.language);
    cachedLocale = next;
    return { previous, next };
  });

  return DesktopLocale.of({
    get,
    current: () => cachedLocale,
    setFromClientSettings,
  });
});

export const layer = Layer.effect(DesktopLocale, make);

export const layerTest = (initialLocale: DesktopResolvedLocale = "en") =>
  Layer.sync(DesktopLocale, () => {
    let currentLocale = initialLocale;
    return DesktopLocale.of({
      get: Effect.sync(() => currentLocale),
      current: () => currentLocale,
      setFromClientSettings: Effect.fn("DesktopLocale.layerTest.setFromClientSettings")(
        (settings) =>
          Effect.sync(() => {
            const previous = currentLocale;
            currentLocale = settings.language === "zh" ? "zh" : "en";
            return { previous, next: currentLocale };
          }),
      ),
    });
  });
