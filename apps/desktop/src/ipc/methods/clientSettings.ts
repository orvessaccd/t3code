import { ClientSettingsSchema } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as DesktopLocale from "../../i18n/DesktopLocale.ts";
import * as DesktopClientSettings from "../../settings/DesktopClientSettings.ts";
import * as DesktopSnapShot from "../../snapShot/DesktopSnapShot.ts";
import * as DesktopApplicationMenu from "../../window/DesktopApplicationMenu.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

export const getClientSettings = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.GET_CLIENT_SETTINGS_CHANNEL,
  payload: Schema.Void,
  result: Schema.NullOr(ClientSettingsSchema),
  handler: Effect.fn("desktop.ipc.clientSettings.get")(function* () {
    const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
    return Option.getOrNull(yield* clientSettings.get);
  }),
});

export const setClientSettings = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SET_CLIENT_SETTINGS_CHANNEL,
  payload: ClientSettingsSchema,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.clientSettings.set")(function* (settings) {
    const clientSettings = yield* DesktopClientSettings.DesktopClientSettings;
    const snapShot = yield* DesktopSnapShot.DesktopSnapShot;
    const desktopLocale = yield* Effect.serviceOption(DesktopLocale.DesktopLocale);
    const applicationMenu = yield* Effect.serviceOption(
      DesktopApplicationMenu.DesktopApplicationMenu,
    );
    yield* clientSettings.set(settings);
    yield* snapShot.configure(settings);
    if (Option.isSome(desktopLocale)) {
      const { previous, next } = yield* desktopLocale.value.setFromClientSettings(settings);
      if (previous !== next && Option.isSome(applicationMenu)) {
        yield* applicationMenu.value.configure;
      }
    }
  }),
});
