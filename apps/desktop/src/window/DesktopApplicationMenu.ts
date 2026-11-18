import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as Electron from "electron";

import { makeComponentLogger } from "../app/DesktopObservability.ts";
import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as ElectronDialog from "../electron/ElectronDialog.ts";
import * as ElectronMenu from "../electron/ElectronMenu.ts";
import * as DesktopLocale from "../i18n/DesktopLocale.ts";
import * as DesktopUpdates from "../updates/DesktopUpdates.ts";
import * as DesktopWindow from "./DesktopWindow.ts";

export class DesktopApplicationMenuActionError extends Schema.TaggedError<DesktopApplicationMenuActionError>()(
  "DesktopApplicationMenuActionError",
  {
    action: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Desktop menu action "${this.action}" failed.`;
  }
}

export class DesktopApplicationMenu extends Context.Service<
  DesktopApplicationMenu,
  {
    readonly configure: Effect.Effect<void>;
  }
>()("@t3tools/desktop/window/DesktopApplicationMenu") {}

type DesktopApplicationMenuRuntimeServices =
  | DesktopUpdates.DesktopUpdates
  | DesktopWindow.DesktopWindow
  | ElectronDialog.ElectronDialog;

const { logInfo: logUpdaterInfo } = makeComponentLogger("desktop-updater");

const { logError: logMenuError } = makeComponentLogger("desktop-menu");

const dispatchMenuAction = Effect.fn("desktop.menu.dispatchMenuAction")(function* (
  action: string,
): Effect.fn.Return<void, DesktopWindow.DesktopWindowError, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.dispatchMenuAction(action, {
    reveal: action !== "paste-as-text",
  });
});

const zoomMainWindow = Effect.fn("desktop.menu.zoomMainWindow")(function* (
  direction: DesktopWindow.MainWindowZoomDirection,
): Effect.fn.Return<void, never, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.zoomMain(direction);
});

const runMainContentsCommand = Effect.fn("desktop.menu.runMainContentsCommand")(function* (
  command: DesktopWindow.MainWindowContentsCommand,
): Effect.fn.Return<void, never, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.runMainContentsCommand(command);
});

const describeUpdate = (version: string | null, isZh: boolean) =>
  version === null ? (isZh ? "T3 Code 新版本" : "A new version of T3 Code") : `T3 Code ${version}`;

const checkForUpdatesFromMenu = Effect.fn("desktop.menu.checkForUpdates")(function* (
  isZh: boolean,
) {
  const updates = yield* DesktopUpdates.DesktopUpdates;
  const electronDialog = yield* ElectronDialog.ElectronDialog;
  const result = yield* updates.check("menu");
  const updateState = result.state;

  if (updateState.status === "up-to-date") {
    yield* electronDialog.showMessageBox({
      type: "info",
      title: isZh ? "已是最新版本" : "You're up to date!",
      message: isZh
        ? `T3 Code ${updateState.currentVersion} 已是当前可用的最新版本。`
        : `T3 Code ${updateState.currentVersion} is currently the newest version available.`,
      buttons: [isZh ? "确定" : "OK"],
    });
  } else if (updateState.status === "available") {
    const { response } = yield* electronDialog.showMessageBox({
      type: "info",
      title: isZh ? "发现可用更新" : "Update available",
      message: isZh
        ? `${describeUpdate(updateState.availableVersion, true)} 现已可用。`
        : `${describeUpdate(updateState.availableVersion, false)} is available.`,
      detail: isZh
        ? `当前运行版本为 T3 Code ${updateState.currentVersion}。`
        : `You're running T3 Code ${updateState.currentVersion}.`,
      buttons: isZh ? ["下载", "稍后"] : ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) yield* updates.download;
  } else if (updateState.status === "downloading") {
    yield* electronDialog.showMessageBox({
      type: "info",
      title: isZh ? "正在下载更新" : "Update downloading",
      message: isZh
        ? `${describeUpdate(updateState.availableVersion, true)} 正在下载中。`
        : `${describeUpdate(updateState.availableVersion, false)} is already downloading.`,
      buttons: [isZh ? "确定" : "OK"],
    });
  } else if (updateState.status === "downloaded") {
    const { response } = yield* electronDialog.showMessageBox({
      type: "info",
      title: isZh ? "更新已就绪" : "Update ready",
      message: isZh
        ? `${describeUpdate(updateState.downloadedVersion ?? updateState.availableVersion, true)} 已准备就绪，可以安装。`
        : `${describeUpdate(updateState.downloadedVersion ?? updateState.availableVersion, false)} is ready to install.`,
      detail: isZh
        ? "T3 Code 将重启以完成安装，正在运行的任务将被中断。"
        : "T3 Code will restart to install it. Any running tasks will be interrupted.",
      buttons: isZh ? ["立即重启", "稍后"] : ["Restart", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) yield* updates.install;
  } else if (updateState.status === "error") {
    yield* electronDialog.showMessageBox({
      type: "warning",
      title: isZh ? "检查更新失败" : "Update check failed",
      message: isZh ? "无法检查更新。" : "Could not check for updates.",
      detail:
        updateState.message ??
        (isZh
          ? "发生未知错误，请稍后重试。"
          : "An unknown error occurred. Please try again later."),
      buttons: [isZh ? "确定" : "OK"],
    });
  }
});

const handleCheckForUpdatesMenuClick = Effect.fn("desktop.menu.handleCheckForUpdatesClick")(
  function* (isZh: boolean) {
    const updates = yield* DesktopUpdates.DesktopUpdates;
    const electronDialog = yield* ElectronDialog.ElectronDialog;
    const disabledReason = yield* updates.disabledReason;
    if (Option.isSome(disabledReason)) {
      yield* logUpdaterInfo("manual update check requested, but updates are disabled", {
        disabledReason: disabledReason.value,
      });
      yield* electronDialog.showMessageBox({
        type: "info",
        title: isZh ? "更新不可用" : "Updates unavailable",
        message: isZh ? "当前无法使用自动更新。" : "Automatic updates are not available right now.",
        detail: disabledReason.value,
        buttons: [isZh ? "确定" : "OK"],
      });
      return;
    }

    // Opening a window before backend confirmation can strand it on failed auth bootstrap.
    const desktopWindow = yield* DesktopWindow.DesktopWindow;
    yield* desktopWindow.activate;
    yield* checkForUpdatesFromMenu(isZh);
  },
);

/** @public */
export const make = Effect.gen(function* () {
  const electronMenu = yield* ElectronMenu.ElectronMenu;
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const desktopLocale = yield* Effect.serviceOption(DesktopLocale.DesktopLocale);
  const context = yield* Effect.context<DesktopApplicationMenuRuntimeServices>();
  const runPromise = Effect.runPromiseWith(context);

  const runMenuEffect = <E>(
    action: string,
    effect: Effect.Effect<void, E, DesktopApplicationMenuRuntimeServices>,
  ) => {
    void runPromise(
      effect.pipe(
        Effect.annotateLogs({ action }),
        Effect.withSpan("desktop.menu.action"),
        Effect.catchCause((cause) => {
          const error = new DesktopApplicationMenuActionError({ action, cause });
          return logMenuError(error.message, { error });
        }),
      ),
    );
  };

  const configure = Effect.gen(function* () {
    const resolvedLocale = Option.isSome(desktopLocale) ? yield* desktopLocale.value.get : "en";
    const isZh = resolvedLocale === "zh";
    const checkForUpdatesLabel = isZh ? "检查更新..." : "Check for Updates...";
    const settingsLabel = isZh ? "设置..." : "Settings...";
    const actualSizeLabel = isZh ? "实际大小" : "Actual Size";
    const zoomInLabel = isZh ? "放大" : "Zoom In";
    const zoomOutLabel = isZh ? "缩小" : "Zoom Out";

    const checkForUpdatesClick = () => {
      const activeZh = Option.isSome(desktopLocale) ? desktopLocale.value.current() === "zh" : isZh;
      runMenuEffect("check-for-updates", handleCheckForUpdatesMenuClick(activeZh));
    };
    const settingsClick = () => {
      runMenuEffect("open-settings", dispatchMenuAction("open-settings"));
    };
    // Chromium and the renderer already handle this chord; injecting another paste duplicates text.
    const pasteAsTextClick = (
      _item: Electron.MenuItem,
      _window: Electron.BaseWindow | undefined,
      event: Electron.KeyboardEvent,
    ) => {
      if (event.triggeredByAccelerator === true) return;
      runMenuEffect("paste-as-text", dispatchMenuAction("paste-as-text"));
    };
    const zoomClick = (direction: DesktopWindow.MainWindowZoomDirection) => () => {
      runMenuEffect(`zoom-${direction}`, zoomMainWindow(direction));
    };
    const mainContentsClick = (command: DesktopWindow.MainWindowContentsCommand) => () => {
      runMenuEffect(command, runMainContentsCommand(command));
    };
    const template: Electron.MenuItemConstructorOptions[] = [];

    if (environment.platform === "darwin") {
      template.push({
        label: environment.displayName,
        submenu: [
          {
            role: "about",
            label: isZh ? `关于 ${environment.displayName}` : `About ${environment.displayName}`,
          },
          {
            label: checkForUpdatesLabel,
            click: checkForUpdatesClick,
          },
          { type: "separator" },
          {
            label: settingsLabel,
            accelerator: "CmdOrCtrl+,",
            click: settingsClick,
          },
          { type: "separator" },
          ...(isZh
            ? [{ role: "services" as const, label: "服务" }]
            : [{ role: "services" as const }]),
          { type: "separator" },
          {
            role: "hide",
            label: isZh ? `隐藏 ${environment.displayName}` : `Hide ${environment.displayName}`,
          },
          ...(isZh
            ? [
                { role: "hideOthers" as const, label: "隐藏其他" },
                { role: "unhide" as const, label: "全部显示" },
              ]
            : [{ role: "hideOthers" as const }, { role: "unhide" as const }]),
          { type: "separator" },
          {
            role: "quit",
            label: isZh ? `退出 ${environment.displayName}` : `Quit ${environment.displayName}`,
          },
        ],
      });
    }

    template.push(
      {
        label: isZh ? "文件" : "File",
        submenu: [
          ...(environment.platform === "darwin"
            ? []
            : [
                {
                  label: settingsLabel,
                  accelerator: "CmdOrCtrl+,",
                  click: settingsClick,
                },
                { type: "separator" as const },
              ]),
          {
            label: isZh ? "关闭开发者工具" : "Close Developer Tools",
            accelerator: "CmdOrCtrl+W",
            visible: false,
            click: () => {
              Electron.webContents
                .getAllWebContents()
                .find((contents) => !contents.isDestroyed() && contents.isDevToolsFocused())
                ?.closeDevTools();
            },
          },
          // Cmd/Ctrl+W belongs to the renderer's tab close; it must never close the window.
          environment.platform === "darwin"
            ? {
                label: isZh ? "关闭窗口" : "Close Window",
                click: (_item, window) => window?.close(),
              }
            : isZh
              ? { role: "quit", label: "退出" }
              : { role: "quit" },
        ],
      },
      {
        label: isZh ? "编辑" : "Edit",
        submenu: [
          ...(isZh
            ? [
                { role: "undo" as const, label: "撤销" },
                { role: "redo" as const, label: "重做" },
              ]
            : [{ role: "undo" as const }, { role: "redo" as const }]),
          { type: "separator" },
          ...(isZh
            ? [
                { role: "cut" as const, label: "剪切" },
                { role: "copy" as const, label: "复制" },
                { role: "paste" as const, label: "粘贴" },
              ]
            : [{ role: "cut" as const }, { role: "copy" as const }, { role: "paste" as const }]),
          {
            label: isZh ? "粘贴为纯文本" : "Paste as Text",
            accelerator: "CmdOrCtrl+Shift+V",
            click: pasteAsTextClick,
          },
          ...(isZh ? [{ role: "delete" as const, label: "删除" }] : [{ role: "delete" as const }]),
          { type: "separator" },
          ...(isZh
            ? [{ role: "selectAll" as const, label: "全选" }]
            : [{ role: "selectAll" as const }]),
          ...(environment.platform === "darwin"
            ? [
                { type: "separator" as const },
                {
                  label: isZh ? "语音" : "Speech",
                  submenu: isZh
                    ? [
                        { role: "startSpeaking" as const, label: "开始朗读" },
                        { role: "stopSpeaking" as const, label: "停止朗读" },
                      ]
                    : [{ role: "startSpeaking" as const }, { role: "stopSpeaking" as const }],
                },
              ]
            : []),
        ],
      },
      {
        label: isZh ? "视图" : "View",
        submenu: [
          /* Native reload/DevTools/zoom roles target focused guests; these commands must target the app. */
          {
            label: isZh ? "重新加载" : "Reload",
            accelerator: "CmdOrCtrl+R",
            click: mainContentsClick("reload"),
          },
          {
            label: isZh ? "强制重新加载" : "Force Reload",
            accelerator: "Shift+CmdOrCtrl+R",
            click: mainContentsClick("forceReload"),
          },
          {
            label: isZh ? "切换开发者工具" : "Toggle Developer Tools",
            accelerator: environment.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
            click: mainContentsClick("toggleDevTools"),
          },
          { type: "separator" },
          { label: actualSizeLabel, accelerator: "CmdOrCtrl+0", click: zoomClick("reset") },
          { label: zoomInLabel, accelerator: "CmdOrCtrl+=", click: zoomClick("in") },
          {
            label: zoomInLabel,
            accelerator: "CmdOrCtrl+Plus",
            visible: false,
            click: zoomClick("in"),
          },
          ...(environment.platform === "darwin"
            ? [
                {
                  label: zoomInLabel,
                  accelerator: "CmdOrCtrl+Shift+=",
                  visible: false,
                  click: zoomClick("in"),
                },
              ]
            : []),
          { label: zoomOutLabel, accelerator: "CmdOrCtrl+-", click: zoomClick("out") },
          // Keypad codes do not match number-row accelerators.
          {
            label: actualSizeLabel,
            accelerator: "CmdOrCtrl+num0",
            visible: false,
            click: zoomClick("reset"),
          },
          {
            label: zoomInLabel,
            accelerator: "CmdOrCtrl+numadd",
            visible: false,
            click: zoomClick("in"),
          },
          {
            label: zoomOutLabel,
            accelerator: "CmdOrCtrl+numsub",
            visible: false,
            click: zoomClick("out"),
          },
          { type: "separator" },
          ...(isZh
            ? [{ role: "togglefullscreen" as const, label: "切换全屏" }]
            : [{ role: "togglefullscreen" as const }]),
        ],
      },
      {
        // Electron's default Window submenu adds a Ctrl+W close role off macOS.
        role: "windowMenu",
        ...(isZh ? { label: "窗口" } : {}),
        submenu: [
          ...(isZh
            ? [
                { role: "minimize" as const, label: "最小化" },
                { role: "zoom" as const, label: "缩放" },
              ]
            : [{ role: "minimize" as const }, { role: "zoom" as const }]),
          ...(environment.platform === "darwin"
            ? [
                { type: "separator" as const },
                isZh
                  ? { role: "front" as const, label: "前置全部窗口" }
                  : { role: "front" as const },
              ]
            : []),
        ],
      },
      {
        role: "help",
        ...(isZh ? { label: "帮助" } : {}),
        submenu: [
          {
            label: checkForUpdatesLabel,
            click: checkForUpdatesClick,
          },
        ],
      },
    );

    yield* electronMenu.setApplicationMenu(template);
  }).pipe(Effect.withSpan("desktop.menu.configure"));

  return DesktopApplicationMenu.of({
    configure,
  });
});

export const layer = Layer.effect(DesktopApplicationMenu, make);
