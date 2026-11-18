import { HOSTED_APP_CHANNEL } from "~/branding";
import { isElectron, isSecretsFeatureEnabled } from "~/env";
import { isMacPlatform, isWindowsPlatform, normalizeSearchText } from "~/lib/utils";
import { STATIC_KEYBINDING_COMMANDS, type KeybindingCommand } from "@t3tools/contracts";
import type { EnvironmentId } from "@t3tools/contracts";
import type { EnvironmentConnectionPhase } from "@t3tools/client-runtime/connection";
import {
  sourceControlClients,
  type SourceControlDefinition,
} from "@t3tools/client-runtime/source-control-clients";
import { DEFAULT_KEYBINDINGS } from "@t3tools/shared/keybindings";
import * as Schema from "effect/Schema";
import { msg, useMessages } from "gt-react";
import { TYPOGRAPHY_ADVANCED_STORAGE_KEY } from "../../appearanceFonts";
import { writeLocalStorageValue } from "../../hooks/useLocalStorage";
import { commandLabel } from "./KeybindingsSettings.logic";
import type { ResolvedSettingsScope } from "./settingsScope";

export type SettingsPath =
  | "/settings/projects"
  | "/settings/general"
  | "/settings/diagnostics"
  | "/settings/voice"
  | "/settings/appearance"
  | "/settings/chat"
  | "/settings/diffs"
  | "/settings/keybindings"
  | "/settings/snap-shot"
  | "/settings/providers"
  | "/settings/threads"
  | "/settings/browser"
  | "/settings/devices"
  | "/settings/scheduled-tasks"
  | "/settings/source-control"
  | "/settings/worktrees"
  | "/settings/connections"
  | "/settings/access"
  | "/settings/secrets"
  | "/settings/maintenance"
  | "/settings/labs"
  | "/settings/about"
  | "/settings/archived";

export type SettingsSearchScope =
  | "environment"
  | "environment-defaults"
  | "project-defaults"
  | "project"
  | "checkout"
  | "connections";

export interface SettingsSearchItem {
  readonly id: string;
  readonly title: string;
  readonly to: SettingsPath;
  readonly targetId?: string;
  readonly searchTerms?: ReadonlyArray<string>;
  readonly scope?: SettingsSearchScope;
  readonly desktopOnly?: boolean;
  readonly macOnly?: boolean;
  readonly windowsOnly?: boolean;
  readonly releaseChannelOnly?: boolean;
  readonly secretsFeatureOnly?: boolean;
  readonly cloudOnly?: boolean;
  readonly environmentOnly?: boolean;
  readonly providerSettingsOnly?: boolean;
  readonly localBackendManagementOnly?: boolean;
  readonly localEnvironmentOnly?: boolean;
  readonly primaryEnvironmentOnly?: boolean;
  readonly wslAvailableOnly?: boolean;
  readonly managedTunnelOnly?: boolean;
  readonly peerLinksOnly?: boolean;
  readonly fastWorktreeCheckoutOnly?: boolean;
  readonly textGeneratorsOnly?: boolean;
  readonly secondary?: boolean;
  readonly requiresThreadAutoSettlement?: boolean;
}

export interface SettingsSearchAvailability {
  readonly localEnvironmentDisabled?: boolean;
  readonly hasCloudPublicConfig: boolean;
  readonly hasEnvironment: boolean;
  readonly hasProviderSettingsEnvironment: boolean;
  readonly canManageLocalBackend: boolean;
  readonly isWslSettingsRowVisible: boolean;
  readonly hasThreadAutoSettlement: boolean;
  readonly managedTunnelActive?: boolean;
  readonly hasPeerLinkHost?: boolean;
  readonly hasFastWorktreeCheckoutEnvironment?: boolean;
  /** An environment without a provider allow-list, which hides text generators. */
  readonly hasTextGeneratorsEnvironment?: boolean;
  readonly hasPrimaryEnvironment?: boolean;
}

export const SETTINGS_SECTION_LABELS: Readonly<Record<SettingsPath, string>> = {
  "/settings/diagnostics": msg("Diagnostics"),
  "/settings/projects": msg("Projects"),
  "/settings/general": msg("General"),
  "/settings/appearance": msg("Appearance"),
  "/settings/chat": msg("Chat"),
  "/settings/diffs": msg("Diffs & pull requests"),
  "/settings/keybindings": msg("Keybindings"),
  "/settings/snap-shot": msg("SnapShots"),
  "/settings/providers": msg("Providers"),
  "/settings/threads": msg("Threads"),
  "/settings/browser": msg("Browser"),
  "/settings/devices": msg("Devices"),
  "/settings/scheduled-tasks": msg("Scheduled tasks"),
  "/settings/source-control": msg("Source control"),
  "/settings/worktrees": msg("Worktrees"),
  "/settings/connections": msg("Environments"),
  "/settings/access": msg("Sharing & access"),
  "/settings/secrets": msg("Secrets"),
  "/settings/maintenance": msg("Maintenance"),
  "/settings/labs": msg("Labs"),
  "/settings/about": msg("About"),
  "/settings/voice": msg("Voice"),
  "/settings/archived": msg("Archive"),
};

/** Sidebar order. A group with a hidden heading is set apart on screen by space alone. */
export const SETTINGS_NAV_GROUPS: ReadonlyArray<{
  readonly heading: string;
  readonly headingHidden?: true;
  readonly paths: ReadonlyArray<SettingsPath>;
}> = [
  {
    heading: msg("Preferences"),
    headingHidden: true,
    paths: [
      "/settings/general",
      "/settings/appearance",
      "/settings/chat",
      "/settings/diffs",
      "/settings/keybindings",
      "/settings/voice",
      "/settings/snap-shot",
    ],
  },
  {
    heading: msg("Agents"),
    paths: [
      "/settings/providers",
      "/settings/threads",
      "/settings/browser",
      "/settings/devices",
      "/settings/scheduled-tasks",
    ],
  },
  {
    heading: msg("Code"),
    paths: ["/settings/projects", "/settings/source-control", "/settings/worktrees"],
  },
  {
    heading: msg("Connections"),
    paths: [
      "/settings/connections",
      "/settings/access",
      ...(isSecretsFeatureEnabled ? (["/settings/secrets"] as const) : []),
    ],
  },
  {
    heading: msg("More"),
    headingHidden: true,
    paths: ["/settings/maintenance", "/settings/labs", "/settings/about", "/settings/archived"],
  },
];

export function keybindingSearchAnchorId<Command extends KeybindingCommand>(command: Command) {
  return `keybinding-${command}` as const;
}

const KEYBINDING_SEARCH_ITEMS = STATIC_KEYBINDING_COMMANDS.toSorted((left, right) =>
  commandLabel(left).localeCompare(commandLabel(right)),
).map((command) => {
  const defaultKeys = DEFAULT_KEYBINDINGS.filter((binding) => binding.command === command).map(
    (binding) => binding.key,
  );
  return {
    id: keybindingSearchAnchorId(command),
    title: commandLabel(command),
    to: "/settings/keybindings" as const,
    searchTerms: [command, ...defaultKeys],
    secondary: true,
    ...(defaultKeys.length === 0 ? { targetId: "keybindings" } : {}),
  };
});

export function sourceControlHostSettingsSearchId(kind: string) {
  return `source-control-host-${kind}` as const;
}

const SOURCE_CONTROL_HOST_TITLES: Readonly<Record<string, string>> = {
  "GitHub accounts and token": msg("GitHub accounts and token"),
  "GitLab accounts and token": msg("GitLab accounts and token"),
  "GitCafe credentials": msg("GitCafe credentials"),
  "Bitbucket credentials": msg("Bitbucket credentials"),
  "Forgejo credentials": msg("Forgejo credentials"),
  "Gitea credentials": msg("Gitea credentials"),
};

/** Each host's own settings: its accounts and token, or the fields of its settings form. */
export function sourceControlHostSearchItems(
  definitions: ReadonlyArray<SourceControlDefinition>,
): ReadonlyArray<
  SettingsSearchItem & { readonly id: ReturnType<typeof sourceControlHostSettingsSearchId> }
> {
  return definitions.flatMap((definition) => {
    if (!definition.settings) return [];
    const names = [definition.label, ...(definition.searchKeywords ?? [])].join(" ");
    const { credentials } = definition;
    const rawTitle = credentials
      ? `${definition.label} accounts and token`
      : `${definition.label} credentials`;
    return [
      {
        id: sourceControlHostSettingsSearchId(definition.kind),
        title: SOURCE_CONTROL_HOST_TITLES[rawTitle] ?? rawTitle,
        to: "/settings/source-control" as const,
        searchTerms: [
          credentials
            ? `${names} ${credentials.cliName} account login user host switch multiple accounts disable sign in token personal access token pat api key credential 账户 账号 令牌 凭据 登录 切换`
            : `${names} ${Object.keys(definition.settings.fields).join(" ")} token credentials sign in 令牌 凭据 登录`,
        ],
        environmentOnly: true,
        scope: "environment-defaults" as const,
      },
    ];
  });
}

/** For settings that apply to every host. */
const SOURCE_CONTROL_HOST_LABELS = sourceControlClients.definitions
  .map((definition) => definition.label)
  .join(" ");
const SOURCE_CONTROL_HOST_TERMS = sourceControlClients.definitions
  .flatMap((definition) => [definition.label, ...(definition.searchKeywords ?? [])])
  .join(" ");

export const SETTINGS_SEARCH_ITEMS = [
  {
    id: "storage-worktree-keep-when",
    targetId: "storage-worktrees",
    title: msg("Keep worktrees with local changes"),
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: [
      "any local files uncommitted changes edited tracked files ignored env build output cleanup 保留 本地更改 未提交 工作树 清理",
    ],
  },
  {
    id: "storage-delete-now",
    title: msg("Delete now"),
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: [
      "storage cleanup run now results report removed kept failed 立即删除 存储清理 释放空间",
    ],
  },
  {
    id: "storage-worktrees",
    title: msg("Worktree cleanup"),
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: [
      "disk storage automatic delete deleted archived threads old inactive merged settled unchanged worktrees retention days project inherit off custom 工作树清理 磁盘空间 自动删除 归档 保留天数",
    ],
  },
  {
    id: "storage-worktrees-location",
    title: msg("Worktree location"),
    to: "/settings/worktrees",
    scope: "environment-defaults",
    searchTerms: [
      "worktree location folder directory path drive external disk 工作树位置 目录 文件夹 路径 磁盘",
    ],
  },
  {
    id: "storage-artifacts",
    title: msg("Artifacts and logs"),
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: [
      "disk storage delete old browser artifacts screenshots captures rotated logs cleanup retention 产物与日志 截图 浏览器 日志清理 保留",
    ],
  },
  {
    id: "project-defaults",
    title: msg("Project defaults and overrides"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: [
      "model workspace environments projects inheritance checkout 项目默认设置 覆盖 继承 模型 工作区",
    ],
  },
  {
    id: "project-overview",
    title: msg("Project overview"),
    to: "/settings/projects",
    searchTerms: ["name icon emoji image checkout remove delete 项目概览 名称 图标 删除 移除"],
  },
  {
    id: "default-model",
    title: msg("Default model"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["new thread project provider reasoning effort 默认模型 新建线程 提供方 推理强度"],
  },
  {
    id: "fallback-model",
    title: msg("Fallback model"),
    to: "/settings/threads",
    scope: "environment-defaults",
    searchTerms: [
      "fallback agent provider out of usage new threads 备用模型 回退模型 用量耗尽 智能体",
    ],
    environmentOnly: true,
  },
  {
    id: "default-permissions",
    title: msg("Permissions"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: [
      "new thread default runtime mode supervised approvals auto accept edits full access 权限 审批 监督 自动接受 完全访问",
    ],
  },
  {
    id: "color-scheme",
    title: msg("Color scheme"),
    to: "/settings/appearance",
    searchTerms: ["appearance light dark system mode 配色方案 浅色 深色 暗色 亮色 跟随系统"],
    targetId: "appearance",
  },
  {
    id: "theme",
    title: msg("Themes"),
    to: "/settings/appearance",
    searchTerms: ["appearance colors palette custom import 主题 外观 颜色 调色板 自定义 导入"],
    targetId: "appearance",
  },
  {
    // Prefixed because the slider control already owns the `appearance-contrast` id.
    id: "setting-appearance-contrast",
    title: msg("Contrast"),
    to: "/settings/appearance",
    searchTerms: ["colors borders interface 对比度 颜色 边框 界面"],
  },
  {
    // Prefixed because the slider control already owns the `glass-opacity` id.
    id: "setting-glass-opacity",
    title: msg("Glass opacity"),
    to: "/settings/appearance",
    searchTerms: [
      "transparent transparency solid menus dialogs composer 毛玻璃 透明度 不透明度 菜单 对话框",
    ],
  },
  {
    id: "diff-color-scheme",
    title: msg("Diff colors"),
    to: "/settings/diffs",
    searchTerms: [
      "red green blue orange additions deletions changes counts palette colorblind 差异颜色 红绿 蓝橙 新增 删除 色盲",
    ],
  },
  {
    id: "chat-width",
    title: msg("Chat width"),
    to: "/settings/appearance",
    searchTerms: [
      "wide full width column layout messages composer monitor 聊天宽度 宽屏 全宽 布局",
    ],
  },
  {
    id: "thread-details-items",
    title: msg("Thread details"),
    to: "/settings/appearance",
    searchTerms: [
      "customize show hide panel card environment editor scripts branch pull request git changes servers automations lineage usage limits 5 hour weekly quota tokens context window 线程详情 面板 显示 隐藏 用量 上下文窗口",
    ],
  },
  {
    id: "effort-display",
    title: msg("Effort display"),
    to: "/settings/appearance",
    searchTerms: [
      "reasoning effort thinking bars graph word label level composer 推理强度显示 思考 柱状 文字 等级",
    ],
  },
  {
    id: "math-rendering",
    title: msg("Render math"),
    to: "/settings/appearance",
    searchTerms: ["latex tex katex equations formulas markdown 渲染数学公式 公式 数学"],
  },
  {
    id: "panel-animations",
    title: msg("Panel animations"),
    to: "/settings/appearance",
    searchTerms: ["面板动画 过渡 动效"],
  },
  {
    id: "environment-identification",
    title: msg("Environment identification"),
    to: "/settings/appearance",
    searchTerms: ["dev nightly latest channel artwork pill label hide none 环境标识 徽标 标签"],
    targetId: "appearance-interface",
  },
  {
    id: "interface-font",
    title: msg("Interface font"),
    to: "/settings/appearance",
    searchTerms: ["typography family size system sans 界面字体 字号 字体大小"],
  },
  {
    id: "prompt-font",
    title: msg("Prompt font"),
    to: "/settings/appearance",
    searchTerms: ["typography family size composer input 提示词字体 输入框字体 字号"],
  },
  {
    id: "code-font",
    title: msg("Code font"),
    to: "/settings/appearance",
    searchTerms: [
      "typography family size monospace code blocks diffs file previews 代码字体 等宽字体 字号",
    ],
  },
  {
    id: "terminal-font",
    title: msg("Terminal font"),
    to: "/settings/appearance",
    searchTerms: ["typography family size monospace output 终端字体 等宽字体 字号"],
  },
  {
    id: "separate-fonts",
    title: msg("Separate fonts"),
    to: "/settings/appearance",
    searchTerms: [
      "typography advanced prompt code terminal font family size individually 独立字体 分别设置字体",
    ],
  },
  {
    id: "font-smoothing",
    title: msg("Font smoothing"),
    to: "/settings/appearance",
    searchTerms: ["typography text grayscale anti aliasing macos thin 字体平滑 抗锯齿"],
    macOnly: true,
  },
  {
    id: "word-wrap",
    title: msg("Word wrap"),
    to: "/settings/appearance",
    searchTerms: ["long lines code blocks diffs file previews 自动换行 长行 代码块"],
  },
  {
    id: "composer-context",
    title: msg("Composer context"),
    to: "/settings/appearance",
    searchTerms: ["编辑器上下文 输入框上下文"],
  },
  {
    id: "project-grouping",
    title: msg("Project grouping"),
    to: "/settings/general",
    searchTerms: ["combine matching repositories environments sidebar 项目分组 合并仓库 侧边栏"],
  },
  {
    id: "project-order",
    title: msg("Project order"),
    to: "/settings/general",
    searchTerms: ["sort projects sidebar manual created recent 项目排序 顺序 手动 创建时间"],
  },
  {
    id: "snooze-options",
    title: msg("Snooze options"),
    to: "/settings/threads",
    searchTerms: [
      "snooze presets times later tonight tomorrow next week remind 暂缓选项 预设 提醒 稍后 明天",
    ],
    environmentOnly: true,
    scope: "environment-defaults",
  },
  {
    id: "snooze-limited-threads",
    title: msg("Snooze until limits reset"),
    to: "/settings/threads",
    searchTerms: [
      "usage quota rate limit reset wake recover continue 暂缓至额度重置 用量限制 速率限制",
    ],
  },
  {
    id: "auto-resume-limited-threads",
    title: msg("Resume after usage limits"),
    to: "/settings/threads",
    searchTerms: ["usage quota rate limit reset recover continue 用量恢复后继续 自动恢复 额度重置"],
  },
  {
    id: "working-shelf",
    title: msg("Working section"),
    to: "/settings/general",
    searchTerms: [
      "hide fold running monitoring threads inbox sidebar shelf 进行中分区 折叠 运行中 线程",
    ],
  },
  {
    id: "boring-sidebar",
    title: msg("Boring sidebar (group by project)"),
    to: "/settings/labs",
    searchTerms: ["beta folders project tree classic sidebar 经典侧边栏 按项目分组 文件夹树"],
  },
  {
    id: "boring-sidebar-multiline",
    title: msg("Two-line folder rows"),
    to: "/settings/labs",
    // Shown inside the boring sidebar row only while it is on, so search lands on the parent.
    targetId: "boring-sidebar",
    searchTerms: [
      "beta boring sidebar folder rows multiline branch pull request details 双行文件夹行 多行",
    ],
  },
  {
    id: "tool-call-visibility",
    title: msg("Tool calls in chat"),
    to: "/settings/chat",
    searchTerms: [
      "hide tool calls commands edits searches work log activity quiet chat zen final answers only 聊天中的工具调用 隐藏 命令 活动日志",
    ],
  },
  {
    id: "screen-reader-announcements",
    title: msg("Screen reader announcements"),
    to: "/settings/chat",
    searchTerms: [
      "accessibility a11y screen reader nvda jaws voiceover orca narrator speech announce read aloud messages activity steps 屏幕阅读器播报 无障碍 朗读",
    ],
  },
  {
    id: "screen-reader-window-title",
    title: msg("Screen reader window title"),
    to: "/settings/chat",
    searchTerms: [
      "accessibility a11y screen reader nvda jaws voiceover orca narrator window title tab title alt tab taskbar thread status order working approval 屏幕阅读器窗口标题 无障碍 标签页标题",
    ],
  },
  {
    id: "guest-links",
    title: msg("Guest links"),
    to: "/settings/labs",
    scope: "environment",
    searchTerms: [
      "beta share guest invite link teammate watch t3 connect tunnel 访客链接 分享 邀请链接",
    ],
  },
  {
    id: "linked-environments-beta",
    title: msg("Linked environments"),
    to: "/settings/labs",
    scope: "environment",
    searchTerms: [
      "beta link another machine vps peer agents work there delegate 关联环境 远程机器 委派",
    ],
  },
  {
    id: "prompt-suggestions-beta",
    title: msg("Suggest next prompt"),
    to: "/settings/labs",
    scope: "environment",
    searchTerms: [
      "beta tab autocomplete predict next message claude codex ghost text 建议下一条提示词 自动补全 预测",
    ],
  },
  {
    id: "simlock-hosts",
    title: msg("Simlock device hosts (alpha)"),
    to: "/settings/labs",
    scope: "environment",
    searchTerms: [
      "beta alpha simlock callstack simulator emulator ios android pool lease gateway 设备主机 模拟器",
    ],
  },
  {
    id: "worktree-fast-checkout",
    title: msg("Fast worktree checkout"),
    to: "/settings/labs",
    scope: "environment",
    fastWorktreeCheckoutOnly: true,
    searchTerms: [
      "beta fast worktree checkout clone apfs copy-on-write cache macos speed 快速工作树检出 克隆 缓存",
    ],
  },
  {
    id: "voice-transcription-destination",
    title: msg("Transcribe with"),
    to: "/settings/voice",
    searchTerms: [
      "send microphone audio dictation destination speech voice stt transcription environment machine consent privacy cloud OpenAI Grok OpenRouter 转写方式 语音输入 听写 云端 本地",
    ],
  },
  {
    id: "voice-microphone",
    title: msg("Microphone"),
    to: "/settings/voice",
    searchTerms: ["mic input audio device order priority preferred 麦克风 音频输入 设备优先级"],
  },
  {
    id: "dictation-shortcut-mode",
    title: msg("Dictation shortcut"),
    to: "/settings/voice",
    searchTerms: ["speech voice keyboard hotkey hold toggle auto 听写快捷键 语音输入 按住 切换"],
  },
  {
    id: "speech-language",
    title: msg("Transcription language"),
    to: "/settings/voice",
    searchTerms: ["speech voice translate english auto detect 转写语言 识别语言 自动检测"],
  },
  {
    id: "speech-dictionary",
    title: msg("Dictionary"),
    to: "/settings/voice",
    searchTerms: [
      "speech voice transcription vocabulary names glossary alias 词典 词汇表 术语 专有名词",
    ],
  },
  {
    id: "speech-project-dictionary",
    title: msg("Project dictionary"),
    to: "/settings/voice",
    scope: "project-defaults",
    searchTerms: [
      "speech voice transcription vocabulary shared dictionary team environment glossary 项目词典 共享词典 团队术语",
    ],
  },
  {
    id: "speech-post-processing-model",
    title: msg("Cleanup model"),
    to: "/settings/voice",
    scope: "environment",
    searchTerms: [
      "speech voice transcript cleanup provider model post-processing 润色模型 清理模型 后处理",
    ],
  },
  {
    id: "speech-correction-word",
    title: msg("Correction cue"),
    to: "/settings/voice",
    searchTerms: ["speech voice cleanup sorry scratch that fix mistake 纠错提示词 口误 修正"],
  },
  {
    id: "speech-silence-filtering",
    title: msg("Silence filtering"),
    to: "/settings/voice",
    searchTerms: ["voice speech vad silero pauses noise 静音过滤 降噪 停顿"],
  },
  {
    id: "remove-filler-words",
    title: msg("Remove filler words"),
    to: "/settings/voice",
    searchTerms: ["voice speech transcription hesitation um uh cleanup 移除语气词 口头禅 填充词"],
  },
  {
    id: "speech-post-processing",
    title: msg("Clean up transcripts"),
    to: "/settings/voice",
    searchTerms: [
      "speech transcription polish clean provider prompt post-processing 整理转写文本 润色 后处理",
    ],
  },
  {
    id: "speech-models",
    title: msg("Transcription models"),
    to: "/settings/voice",
    searchTerms: [
      "speech voice stt download whisper parakeet canary moonshine accuracy speed benchmark languages 转写模型 语音模型 下载",
    ],
  },
  {
    id: "speech-hardware",
    title: msg("Transcription hardware and model unloading"),
    to: "/settings/voice",
    searchTerms: [
      "speech voice stt advanced gpu cpu acceleration memory unload idle 转写硬件 模型卸载 显存 内存 加速",
    ],
  },
  {
    id: "microphone-test",
    title: msg("Test microphone"),
    to: "/settings/voice",
    searchTerms: ["test mic audio playback loopback record input level 测试麦克风 录音 回放 音量"],
  },
  {
    id: "transcription-test",
    title: msg("Test model"),
    to: "/settings/voice",
    searchTerms: ["test voice speech model transcription recognition 测试模型 语音识别测试"],
  },
  {
    id: "auto-settle-inactive-threads",
    title: msg("Auto-settle inactive threads"),
    to: "/settings/threads",
    searchTerms: ["sidebar inactivity days no activity automatically 自动收纳不活跃线程 闲置 天数"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "compact-idle-threads",
    title: msg("Compact idle threads"),
    to: "/settings/providers",
    scope: "environment-defaults",
    searchTerms: [
      "claude context compaction idle cache tokens usage summary resume 压缩空闲线程 上下文压缩 缓存",
    ],
  },
  {
    id: "auto-settle-merged-threads",
    title: msg("Auto-settle merged threads"),
    to: "/settings/threads",
    searchTerms: [
      "pull request merge closed automatically sidebar 自动收纳已合并线程 拉取请求 合并",
    ],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "keep-threads-with-pull-requests",
    title: msg("Keep threads with a PR"),
    to: "/settings/threads",
    targetId: "auto-settle-inactive-threads",
    searchTerms: ["pull request inactivity auto-settle merge close sidebar 保留关联拉取请求的线程"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "days-before-auto-settle",
    title: msg("Days of inactivity before auto-settle"),
    to: "/settings/threads",
    targetId: "auto-settle-inactive-threads",
    searchTerms: ["thread timeout activity sidebar 自动收纳前的不活跃天数 超时"],
    requiresThreadAutoSettlement: true,
    scope: "project-defaults",
  },
  {
    id: "thread-notifications",
    title: msg("Thread notifications"),
    to: "/settings/general",
    searchTerms: [
      "notification sound alert completion input approval desktop 线程通知 提示音 桌面通知 完成 审批",
    ],
  },
  {
    id: "in-app-notifications",
    title: msg("In-app notifications"),
    to: "/settings/general",
    searchTerms: [
      "notification toast popup completion input approval failure 应用内通知 弹窗 提示",
    ],
  },
  {
    id: "language",
    title: msg("Language"),
    to: "/settings/general",
    searchTerms: [
      "locale translation english deutsch german español spanish français french português portuguese brasil brazilian chinese 中文 japanese 日本語 korean 한국어 russian русский sprache idioma langue 语言 言語 언어 язык 简体中文",
    ],
  },
  {
    id: "time-format",
    title: msg("Time format"),
    to: "/settings/general",
    searchTerms: [
      "timestamp clock locale system browser os 12 hour 24 hour 时间格式 时间戳 12小时制 24小时制",
    ],
  },
  {
    id: "response-streaming",
    title: msg("Response streaming"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["output token paragraph buffered wait turn legacy 回复流式输出 逐段 完整回复"],
  },
  {
    id: "hide-whitespace-changes",
    title: msg("Hide whitespace changes"),
    to: "/settings/diffs",
    searchTerms: ["diff ignore spaces edits default 隐藏空白更改 忽略空格 差异"],
  },
  {
    id: "default-diff-file-state",
    title: msg("Default diff file state"),
    to: "/settings/diffs",
    searchTerms: [
      "collapsed expanded collapse expand files pull request pr code tab 默认差异文件状态 折叠 展开",
    ],
  },
  {
    id: "diff-layout",
    title: msg("Diff layout"),
    to: "/settings/diffs",
    searchTerms: ["stacked split side by side unified inline view 差异布局 并排 上下 堆叠 分栏"],
  },
  {
    id: "proactive-panels",
    title: msg("Open pull requests and changes panels proactively"),
    to: "/settings/diffs",
    searchTerms: [
      "proactive automatically open diff pull request pr right panel agent completion 自动打开拉取请求与更改面板 右侧面板",
    ],
  },
  {
    id: "skills-in-slash-menu",
    title: msg("Show skills in slash menu"),
    to: "/settings/chat",
    searchTerms: ["command menu dollar $ slash / 在斜杠菜单中显示技能 命令菜单"],
  },
  {
    id: "composer-rich-text",
    title: msg("Rich text composer"),
    to: "/settings/chat",
    searchTerms: [
      "composer rich text tiptap bold italic markdown styled wysiwyg 富文本输入框 编辑器 所见即所得",
    ],
  },
  {
    id: "send-shortcut",
    title: msg("Send shortcut"),
    to: "/settings/chat",
    searchTerms: [
      "enter return command ctrl multiline prompt new line composer 发送快捷键 回车 换行",
    ],
  },
  {
    id: "follow-up-behavior",
    title: msg("Follow-up behavior"),
    to: "/settings/chat",
    searchTerms: [
      "queue steer running turn send default behavior composer 追问行为 排队 插队 引导",
    ],
  },
  {
    id: "provider-update-checks",
    title: msg("Provider update checks"),
    to: "/settings/maintenance",
    searchTerms: [
      "installed cli versions newer available codex claude cursor grok fx kiro opencode 提供方更新检查 版本升级",
    ],
    scope: "environment-defaults",
  },
  {
    id: "continue-threads-after-server-update",
    title: msg("Continue threads after restarts"),
    to: "/settings/maintenance",
    scope: "project-defaults",
    searchTerms: [
      "resume running active interrupted work restart reboot machine crash desktop update automatically 重启后继续线程 自动恢复 更新重启",
    ],
  },
  {
    id: "keep-awake-while-agents-work",
    title: msg("Keep awake while agents work"),
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: [
      "caffeinate sleep prevent stay awake power laptop lid inhibit 智能体工作时保持唤醒 防止休眠 睡眠",
    ],
  },
  {
    id: "background-activity",
    title: msg("Background activity"),
    to: "/settings/maintenance",
    scope: "environment-defaults",
    searchTerms: [
      "balanced performance battery saver advanced git fetch provider health refresh host power monitor idle policy 后台活动 省电 性能 均衡",
    ],
  },
  {
    id: "new-threads",
    title: msg("New threads"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: ["default workspace mode draft local worktree 新建线程 默认模式 本地 工作树"],
  },
  {
    id: "worktree-submodules",
    title: msg("Submodules"),
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: [
      "git submodule init recursive top-level none worktree t3.json 子模块 递归 初始化",
    ],
  },
  {
    id: "start-from-origin",
    title: msg("Start from remote"),
    to: "/settings/worktrees",
    scope: "project-defaults",
    searchTerms: [
      "new worktrees start remote origin latest fetched branch local 从远程分支创建 远端 origin",
    ],
  },
  {
    id: "add-project-starts-in",
    title: msg("Add project starts in"),
    to: "/settings/threads",
    scope: "environment-defaults",
    searchTerms: ["base directory folder browser path home 添加项目起始目录 默认目录 文件夹"],
  },
  {
    id: "ghq-clone-layout",
    title: msg("Clone into host folders"),
    to: "/settings/threads",
    scope: "environment-defaults",
    searchTerms: [
      "ghq clone destination host owner repository root layout 按主机文件夹克隆 目录结构",
    ],
  },
  {
    id: "unpin-confirmation",
    title: msg("Unpin confirmation"),
    to: "/settings/general",
    searchTerms: ["ask before thread pinned section 取消置顶确认 线程"],
  },
  {
    id: "archive-confirmation",
    title: msg("Archive confirmation"),
    to: "/settings/general",
    searchTerms: ["ask before thread second click inline action 归档确认 线程"],
  },
  {
    id: "delete-confirmation",
    title: msg("Delete confirmation"),
    to: "/settings/general",
    searchTerms: ["ask before thread chat history 删除确认 线程 聊天记录"],
  },
  {
    id: "quit-confirmation",
    title: msg("Quit shortcut"),
    to: "/settings/general",
    searchTerms: [
      "confirmation desktop app exit direct hold double click press twice 退出快捷键 长按 按两次",
    ],
    desktopOnly: true,
  },
  {
    id: "text-generation-model",
    title: msg("Text generation model"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: [
      "generated thread titles source control content default provider 文本生成模型 标题生成",
    ],
  },
  {
    id: "thread-title-instructions",
    title: msg("Thread title instructions"),
    to: "/settings/threads",
    scope: "project-defaults",
    searchTerms: [
      "generated thread titles prompt custom style naming rename regenerate 线程标题指令 命名 重命名",
    ],
  },
  {
    id: "app-version",
    title: msg("Version"),
    to: "/settings/about",
    searchTerms: [
      "about check for updates download install upgrade release 版本 检查更新 升级 下载",
    ],
  },
  {
    id: "update-track",
    title: msg("Update track"),
    to: "/settings/about",
    searchTerms: ["release channel stable latest nightly prerelease 更新通道 稳定版 预览版"],
    releaseChannelOnly: true,
  },
  {
    id: "cli-command",
    title: msg("t3 command"),
    to: "/settings/about",
    searchTerms: ["cli terminal shell path install command line 命令行 终端 安装"],
    desktopOnly: true,
  },
  {
    id: "mobile-app",
    title: msg("Mobile app"),
    to: "/settings/about",
    searchTerms: [
      "phone tablet iPhone iPad iOS Android App Store Google Play QR 移动应用 手机 二维码",
    ],
  },
  {
    id: "welcome-page",
    title: msg("Welcome page"),
    to: "/settings/about",
    primaryEnvironmentOnly: true,
    searchTerms: [
      "onboarding setup first run getting started agents import projects 欢迎页面 引导 初始设置",
    ],
  },
  {
    id: "privacy-policy",
    title: msg("Privacy policy"),
    to: "/settings/about",
    searchTerms: ["telemetry analytics usage data tracking legal opt out 隐私政策 遥测 数据"],
  },
  {
    id: "telemetry-export",
    title: msg("OpenTelemetry export"),
    to: "/settings/diagnostics",
    targetId: "telemetry-export",
    scope: "environment",
    searchTerms: [
      "OTel OTLP telemetry export endpoints logs traces metrics Grafana 遥测导出 日志 追踪 指标",
    ],
  },
  {
    id: "diagnostics",
    title: msg("Diagnostics"),
    to: "/settings/maintenance",
    searchTerms: [
      "logs traces processes resource history failures spans cpu memory 诊断 日志 进程 资源 内存",
    ],
  },
  {
    id: "open-source-licenses",
    title: msg("Open source licenses"),
    to: "/settings/about",
    searchTerms: ["开源许可证 第三方库"],
  },
  {
    id: "keybindings",
    title: msg("Keybindings"),
    to: "/settings/keybindings",
    searchTerms: ["keyboard shortcuts hotkeys commands bindings json 快捷键 键盘 热键 绑定"],
  },
  ...KEYBINDING_SEARCH_ITEMS,
  {
    id: "snap-shot-enabled",
    title: msg("SnapShots"),
    searchTerms: ["window capture screenshot 截图 窗口捕获"],
    to: "/settings/snap-shot",
  },
  {
    id: "snap-shot-accessibility",
    title: msg("Include app text"),
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
    searchTerms: [
      "capture accessibility data text UI structure elements privacy omit agent context 包含应用文本 辅助功能 界面结构",
    ],
  },
  {
    id: "snap-shot-shortcut",
    title: msg("Capture shortcut"),
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
    searchTerms: ["截图快捷键 捕获快捷键"],
  },
  {
    id: "snap-shot-sound",
    title: msg("Capture sound"),
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
    searchTerms: ["截图音效 捕获声音"],
  },
  {
    id: "snap-shot-flash",
    title: msg("Capture flash"),
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
    searchTerms: ["截图闪屏 捕获闪烁"],
  },
  {
    id: "snap-shot-animations",
    title: msg("Capture animations"),
    to: "/settings/snap-shot",
    targetId: "snap-shot-enabled",
    searchTerms: ["截图动画 捕获动画"],
  },
  {
    id: "providers",
    title: msg("Providers"),
    to: "/settings/providers",
    searchTerms: [
      "agents cli codex claude cursor grok fx kiro opencode antigravity google sign in sign out install subscription instances authentication api key models configuration binary path config directory codex_home shadow home endpoint arguments environment variables display name accent color custom favorite hidden auto compact native sessions import resume 提供方 智能体 登录 登出 安装 订阅 实例 认证 密钥 模型 环境变量",
    ],
  },
  {
    id: "usage-providers",
    title: msg("Usage providers"),
    to: "/settings/providers",
    searchTerms: [
      "usage sources CLIProxyAPI CLI proxy hub quota subscription limits management key add remove 用量提供方 配额 订阅限制",
    ],
    providerSettingsOnly: true,
  },
  {
    id: "text-generators",
    title: msg("Text generators"),
    to: "/settings/providers",
    searchTerms: [
      "model api api key openai openrouter anthropic ollama lm studio custom endpoint base url thread titles commit messages 文本生成器 接口密钥 自定义端点",
    ],
    providerSettingsOnly: true,
    textGeneratorsOnly: true,
  },
  {
    id: "provider-health-check-interval",
    title: msg("Health check interval"),
    to: "/settings/providers",
    searchTerms: [
      "refresh availability versions auth state models background probes seconds off 健康检查间隔 状态刷新",
    ],
    providerSettingsOnly: true,
  },
  {
    id: "scheduled-tasks",
    title: msg("Scheduled tasks"),
    to: "/settings/scheduled-tasks",
    searchTerms: ["计划任务 定时任务 自动化"],
  },
  {
    id: "agent-browser-access",
    title: msg("Agent browser access"),
    to: "/settings/browser",
    scope: "project-defaults",
    searchTerms: [
      "allow disable enable open drive preview tools sessions project override 智能体浏览器访问 允许 禁用 预览",
    ],
  },
  {
    id: "device-sources",
    title: msg("Device sources"),
    to: "/settings/devices",
    searchTerms: [
      "device hosts ssh remote mac mini identity key connection eas expo cloud simlock pool gateway local simulators 设备来源 远程主机 模拟器",
    ],
  },
  {
    id: "agent-device-access",
    title: msg("Agents can use devices"),
    to: "/settings/devices",
    targetId: "devices",
    searchTerms: [
      "allow simulator emulator ios android drive tools sessions 允许智能体使用设备 模拟器",
    ],
  },
  {
    id: "device-hub",
    title: msg("Use devices"),
    to: "/settings/devices",
    targetId: "devices",
    searchTerms: [
      "device hub simulator emulator ios android install start version 使用设备 设备中心 模拟器 安装",
    ],
  },
  {
    id: "device-platform-support",
    title: msg("Local simulators"),
    to: "/settings/devices",
    targetId: "device-sources",
    searchTerms: ["simulator support xcode android studio sdk avd runtime 本地模拟器"],
  },
  {
    id: "browser-profiles",
    title: msg("Browser profiles"),
    to: "/settings/browser",
    targetId: "browser",
    searchTerms: ["浏览器配置文件 登录态"],
  },
  {
    id: "browser-default-profile",
    title: msg("Default browser profile"),
    to: "/settings/browser",
    targetId: "browser-profiles",
    searchTerms: ["默认浏览器配置文件"],
  },
  {
    id: "browser-default-viewport",
    title: msg("Default browser viewport"),
    to: "/settings/browser",
    searchTerms: [
      "preview size width height device desktop mobile rotate 默认浏览器视口 尺寸 宽高",
    ],
  },
  {
    id: "browser-default-zoom",
    title: msg("Default browser zoom"),
    to: "/settings/browser",
    searchTerms: ["preview page scale tabs percent 默认浏览器缩放 比例"],
  },
  {
    id: "browser-default-appearance",
    title: msg("Default browser appearance"),
    to: "/settings/browser",
    searchTerms: ["preview color scheme light dark system os 默认浏览器外观 深色 浅色"],
  },
  {
    id: "browser-recording-frame-rate",
    title: msg("Browser recording frame rate"),
    to: "/settings/browser",
    searchTerms: ["浏览器录制帧率"],
  },
  {
    id: "browser-recording-key-presses",
    title: msg("Show key presses in recordings"),
    to: "/settings/browser",
    searchTerms: ["browser preview keyboard shortcuts keystrokes overlay capture 在录制中显示按键"],
  },
  {
    id: "browser-recording-mouse-presses",
    title: msg("Show mouse presses in recordings"),
    to: "/settings/browser",
    searchTerms: ["browser preview clicks buttons drag overlay capture 在录制中显示鼠标点击"],
  },
  {
    id: "browser-link-target",
    title: msg("Open links in"),
    to: "/settings/browser",
    searchTerms: [
      "links default browser in-app browser external open 链接打开方式 外部浏览器 内置浏览器",
    ],
  },
  {
    id: "browser-search-engine",
    title: msg("Search engine"),
    to: "/settings/browser",
    searchTerms: [
      "address bar duckduckgo google bing brave kagi ecosia custom url 搜索引擎 地址栏",
    ],
  },
  {
    id: "pull-request-links-open-in-app",
    title: msg("Open pull requests in T3 Code"),
    to: "/settings/diffs",
    searchTerms: [
      `pr commit links ${SOURCE_CONTROL_HOST_LABELS} browser external click default pull request view panel 在应用内打开拉取请求 链接`,
    ],
  },
  {
    id: "browser-auto-show-floating-preview",
    title: msg("Auto-show floating preview"),
    to: "/settings/browser",
    searchTerms: ["agent opens browser device simulator pop into view hide 自动显示悬浮预览"],
  },
  {
    id: "automatic-pull",
    title: msg("Automatically pull"),
    to: "/settings/source-control",
    scope: "project-defaults",
    searchTerms: [
      "auto pull default branch current checkout fast forward upstream 自动拉取 默认分支",
    ],
  },
  {
    id: "remove-agent-credits-on-merge",
    title: msg("Remove agent credits when merging"),
    to: "/settings/source-control",
    scope: "project-defaults",
    searchTerms: [
      `pull request ${SOURCE_CONTROL_HOST_LABELS} squash co-authored-by attribution claude codex generated 合并时移除智能体署名 共创者`,
    ],
  },
  {
    id: "pull-request-merge-method",
    title: msg("Default merge method"),
    to: "/settings/source-control",
    scope: "project-defaults",
    searchTerms: ["pull request merge squash rebase last selected 默认合并方式 压缩合并 变基合并"],
  },
  {
    id: "source-control",
    title: msg("Source control"),
    to: "/settings/source-control",
    scope: "environment-defaults",
    searchTerms: [
      `version control git ${SOURCE_CONTROL_HOST_TERMS} hosting integrations credentials scan server environment 源代码管理 版本控制 托管 凭据`,
    ],
  },
  {
    id: "git-fetch-interval",
    title: msg("Git fetch interval"),
    to: "/settings/maintenance",
    targetId: "background-activity",
    searchTerms: [
      "automatic remote branch refresh background credentials security keys seconds off 拉取间隔 自动获取 远程分支",
    ],
    environmentOnly: true,
    scope: "environment-defaults",
  },
  {
    id: "worktree-branch-naming",
    title: msg("Worktree branch naming"),
    to: "/settings/worktrees",
    searchTerms: [
      "static semantic prefix custom prompt instructions feat fix refactor chore 工作树分支命名 前缀 语义化",
    ],
    environmentOnly: true,
    scope: "project-defaults",
  },
  ...sourceControlHostSearchItems(sourceControlClients.definitions),
  {
    id: "source-control-writing-style",
    title: msg("Commit and pull request writing"),
    to: "/settings/source-control",
    searchTerms: [
      "repository conventions conventional commits custom instructions commit messages change pr pull request merge request titles descriptions body style prompt write my own 提交与拉取请求撰写 约定式提交 提交信息",
    ],
    environmentOnly: true,
  },
  {
    id: "follow-change-request-templates",
    title: msg("Follow pull request templates"),
    to: "/settings/source-control",
    searchTerms: [
      "repository pr pull request merge request change request description structure 遵循拉取请求模板 描述模板",
    ],
    environmentOnly: true,
  },
  {
    id: "source-control-writer-model",
    title: msg("Source control writer model"),
    to: "/settings/source-control",
    searchTerms: [
      "override generated commit change request pr titles descriptions branch bookmark 源代码管理撰写模型 提交信息模型",
    ],
    environmentOnly: true,
    scope: "project-defaults",
  },
  {
    id: "review-guides",
    title: msg("Review guides (beta)"),
    to: "/settings/source-control",
    searchTerms: ["pull request pr guided review guide tour beta experimental 代码审查指南 导览"],
    environmentOnly: true,
  },
  {
    id: "review-guide-model",
    title: msg("Review guide model"),
    to: "/settings/source-control",
    // Hidden until review guides are on, so a search lands on the switch that shows it.
    targetId: "review-guides",
    searchTerms: ["pull request pr guided review guide brief maintainer 审查指南模型"],
    environmentOnly: true,
    scope: "project-defaults",
  },
  {
    id: "review-guide-instructions",
    title: msg("Review guide instructions"),
    to: "/settings/source-control",
    targetId: "review-guides",
    searchTerms: [
      "pull request pr guided review guide preferences taste prompt custom 审查指南指令",
    ],
    environmentOnly: true,
    scope: "project-defaults",
  },
  {
    id: "project-actions",
    title: msg("Actions"),
    to: "/settings/projects",
    searchTerms: [
      "commands scripts setup run dev server checkout worktree t3.json import 项目操作 脚本 命令 启动",
    ],
  },
  {
    id: "environment-icon",
    title: msg("Environment icon"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: [
      "machine glyph sidebar mac mini studio laptop desktop server cloud vm 环境图标 机器图标",
    ],
  },
  {
    id: "local-environment",
    title: msg("Local environment"),
    to: "/settings/connections",
    searchTerms: [
      "turn off on disable enable local server agents remote only restart 本地环境 本地服务器 启用 禁用",
    ],
    desktopOnly: true,
  },
  {
    id: "network-access",
    title: msg("Network access"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: [
      "expose backend remote pairing local machine interfaces host restart 网络访问 局域网 远程配对",
    ],
    localBackendManagementOnly: true,
  },
  {
    id: "tailscale-https",
    title: msg("Tailscale HTTPS"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["serve magicdns endpoint remote secure network 远程安全网络"],
    desktopOnly: true,
    localBackendManagementOnly: true,
  },
  {
    id: "wsl-backend",
    title: msg("WSL backend"),
    to: "/settings/access",
    searchTerms: [
      "windows subsystem linux distro second server projects stop windows backend restart wsl only 后端 子系统",
    ],
    desktopOnly: true,
    windowsOnly: true,
    localBackendManagementOnly: true,
    wslAvailableOnly: true,
  },
  {
    id: "t3-connect",
    localEnvironmentOnly: true,
    title: msg("T3 Connect"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: [
      "managed tunnel cloud other devices remote tunnels limit t3 chat 托管隧道 云端 远程连接",
    ],
    desktopOnly: true,
    cloudOnly: true,
  },
  {
    id: "connect-device-approval",
    title: msg("Require approval for new devices"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: [
      "t3 connect devices approve deny trust revoke pairing code security account 新设备需要批准 设备审批 吊销",
    ],
    cloudOnly: true,
    managedTunnelOnly: true,
  },
  {
    id: "hold-webhooks-while-offline",
    localEnvironmentOnly: true,
    title: msg("Hold webhooks while offline"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: ["webhook automations offline queue mailbox t3 connect 离线时暂存 队列"],
    cloudOnly: true,
    managedTunnelOnly: true,
  },
  {
    id: "publish-agent-activity",
    localEnvironmentOnly: true,
    title: msg("Publish agent activity"),
    to: "/settings/access",
    targetId: "connections-environment",
    searchTerms: [
      "mobile push notifications live activities cloud tunnel 发布智能体活动 手机推送 实时活动",
    ],
    cloudOnly: true,
  },
  {
    id: "connections-environment",
    title: msg("This machine"),
    to: "/settings/access",
    searchTerms: [
      "connections server backend local remote access administrative permissions scope pairing links qr code authorized clients sessions revoke endpoint 当前机器 本机 已授权客户端 配对链接 二维码",
    ],
  },
  {
    id: "linked-environments",
    peerLinksOnly: true,
    title: msg("Linked environments"),
    to: "/settings/connections",
    targetId: "linked-environments",
    searchTerms: [
      "link peer another machine vps agents work there handoff pairing code 关联环境 对等连接 跨机协作",
    ],
  },
  {
    id: "remote-environments",
    title: msg("Environments"),
    to: "/settings/connections",
    searchTerms: [
      "add pair backend host code ssh config agent tunnel saved t3 connect 环境 远程主机 配对 添加环境",
    ],
  },
  {
    id: "load-balancing",
    title: msg("Load balancing"),
    to: "/settings/connections",
    searchTerms: [
      "automatic machine environment resources cpu memory capacity preference weight shared projects 负载均衡 资源权重 共享项目",
    ],
  },
  {
    id: "pull-request-routing",
    title: msg("Pull request sharing"),
    to: "/settings/connections",
    searchTerms: [
      `pull request routing trusted environments shared credentials permissions read actions source control ${SOURCE_CONTROL_HOST_LABELS} 拉取请求共享 跨环境 凭据共享`,
    ],
  },
  {
    id: "secret-providers",
    title: msg("Secret providers"),
    to: "/settings/secrets",
    searchTerms: ["1password vault credentials api key 密钥提供方 保险库 凭据"],
    secretsFeatureOnly: true,
  },
  {
    id: "secret-providers-add",
    title: msg("Add secret provider"),
    to: "/settings/secrets",
    targetId: "secret-providers",
    searchTerms: ["new 1password vault op cli account 添加密钥提供方 保险库"],
    secretsFeatureOnly: true,
  },
  {
    id: "archive",
    title: msg("Archived threads"),
    to: "/settings/archived",
    searchTerms: ["restore reopen deleted history projects 已归档线程 恢复 重新打开 历史"],
  },
] as const satisfies ReadonlyArray<SettingsSearchItem>;

export type SettingsSearchItemId = (typeof SETTINGS_SEARCH_ITEMS)[number]["id"];

const SEARCH_ITEMS_BY_ID = new Map(SETTINGS_SEARCH_ITEMS.map((item) => [item.id, item] as const));

const SETTINGS_CATEGORY_SCOPES: Readonly<Record<SettingsPath, SettingsSearchScope | null>> = {
  "/settings/diagnostics": "environment",
  "/settings/projects": "project",
  "/settings/general": null,
  "/settings/voice": null,
  "/settings/appearance": null,
  "/settings/chat": null,
  "/settings/diffs": null,
  "/settings/snap-shot": null,
  "/settings/keybindings": null,
  "/settings/providers": null,
  "/settings/threads": null,
  "/settings/browser": null,
  "/settings/devices": null,
  "/settings/source-control": "environment-defaults",
  "/settings/worktrees": "project-defaults",
  "/settings/connections": "connections",
  "/settings/access": "connections",
  "/settings/secrets": null,
  "/settings/scheduled-tasks": null,
  "/settings/maintenance": null,
  "/settings/labs": null,
  "/settings/about": null,
  "/settings/archived": "project-defaults",
};

const RENAMED_SETTINGS_PATHS: Readonly<Record<string, SettingsPath>> = {
  "/settings/integrations": "/settings/browser",
  "/settings/storage": "/settings/maintenance",
  "/settings/beta": "/settings/labs",
};
const SPLIT_SETTINGS_PATHS: ReadonlySet<string> = new Set([
  "/settings/general",
  "/settings/appearance",
  "/settings/source-control",
  "/settings/connections",
  ...Object.keys(RENAMED_SETTINGS_PATHS),
]);
// Section anchors that moved but are not search results themselves.
const MOVED_SECTION_ANCHORS: Readonly<Record<string, SettingsPath>> = {
  "authorized-clients": "/settings/access",
  "text-generation": "/settings/threads",
  about: "/settings/about",
};

/** Where an old settings link now lives. Its anchor finds the page its row moved to. */
export function movedSettingsPath(pathname: string, hash: string): SettingsPath | null {
  if (!SPLIT_SETTINGS_PATHS.has(pathname)) return null;
  const items: readonly SettingsSearchItem[] = SETTINGS_SEARCH_ITEMS;
  const anchored = hash
    ? (items.find((item) => item.id === hash) ?? items.find((item) => item.targetId === hash))
    : undefined;
  const to =
    anchored?.to ?? MOVED_SECTION_ANCHORS[hash] ?? RENAMED_SETTINGS_PATHS[pathname] ?? null;
  return to === pathname ? null : to;
}

export function getSettingsSearchTargetScope(targetId: string) {
  const items: readonly SettingsSearchItem[] = SETTINGS_SEARCH_ITEMS;
  const item =
    items.find((candidate) => candidate.id === targetId) ??
    items.find((candidate) => candidate.targetId === targetId);
  return item
    ? {
        title: item.title,
        scope: item.scope ?? SETTINGS_CATEGORY_SCOPES[item.to],
        ...(item.requiresThreadAutoSettlement ? { requiresThreadAutoSettlement: true } : {}),
      }
    : null;
}

interface AutoSettlementSearchEnvironment {
  readonly environmentId: EnvironmentId;
  readonly connection: { readonly phase: EnvironmentConnectionPhase };
  readonly serverConfig: object | null;
}

export function getThreadAutoSettlementSearchAvailability(
  environments: readonly AutoSettlementSearchEnvironment[],
  scope?: Pick<ResolvedSettingsScope, "kind" | "environmentIds">,
) {
  const connected = environments.filter(
    (environment) =>
      environment.connection.phase === "connected" && environment.serverConfig !== null,
  );
  const eligibleEnvironmentIds = connected.map((environment) => environment.environmentId);
  const selected = connected.filter((environment) =>
    scope?.environmentIds.includes(environment.environmentId),
  );
  return {
    eligibleEnvironmentIds,
    isTargetAvailable:
      scope !== undefined &&
      scope.kind !== "unavailable" &&
      selected.length > 0 &&
      selected.every((environment) => eligibleEnvironmentIds.includes(environment.environmentId)),
  };
}

export function isSettingsSearchScopeAvailable(
  requiredScope: SettingsSearchScope | null,
  scopeKind: ResolvedSettingsScope["kind"],
): boolean {
  switch (requiredScope) {
    case null:
    case "connections":
      return true;
    case "environment":
    case "checkout":
      return requiredScope === scopeKind;
    case "project":
      return scopeKind === "project" || scopeKind === "checkout";
    case "environment-defaults":
      return scopeKind === "environment" || scopeKind === "all";
    case "project-defaults":
      return (
        scopeKind === "environment" ||
        scopeKind === "all" ||
        scopeKind === "project" ||
        scopeKind === "checkout"
      );
  }
}

export function searchableSetting(id: SettingsSearchItemId): {
  readonly id: string;
  readonly title: string;
} {
  const { id: anchorId, title } = SEARCH_ITEMS_BY_ID.get(id)!;
  return { id: anchorId, title };
}

export function useTranslatedSearchableSetting() {
  const m = useMessages();
  return (id: SettingsSearchItemId) => {
    const setting = searchableSetting(id);
    return { ...setting, title: m(setting.title) };
  };
}

export function filterAvailableSettingsSearchItems(
  availability: SettingsSearchAvailability,
): ReadonlyArray<SettingsSearchItem> {
  const items: ReadonlyArray<SettingsSearchItem> = SETTINGS_SEARCH_ITEMS;
  return items.filter(
    (item) =>
      (!item.cloudOnly || availability.hasCloudPublicConfig) &&
      (!item.environmentOnly || availability.hasEnvironment) &&
      (!item.providerSettingsOnly || availability.hasProviderSettingsEnvironment) &&
      (!item.localBackendManagementOnly || availability.canManageLocalBackend) &&
      (!item.localEnvironmentOnly || !availability.localEnvironmentDisabled) &&
      (!item.primaryEnvironmentOnly || availability.hasPrimaryEnvironment === true) &&
      (!item.wslAvailableOnly || availability.isWslSettingsRowVisible) &&
      (!item.requiresThreadAutoSettlement || availability.hasThreadAutoSettlement) &&
      (!item.managedTunnelOnly || availability.managedTunnelActive === true) &&
      (!item.peerLinksOnly || availability.hasPeerLinkHost === true) &&
      (!item.fastWorktreeCheckoutOnly ||
        availability.hasFastWorktreeCheckoutEnvironment === true) &&
      (!item.textGeneratorsOnly || availability.hasTextGeneratorsEnvironment === true),
  );
}

/** The settings that exist on this platform and app channel. */
export function settingsForThisPlatform(
  items: ReadonlyArray<SettingsSearchItem>,
): ReadonlyArray<SettingsSearchItem> {
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  return items.filter(
    (item) =>
      (isElectron || item.desktopOnly !== true) &&
      (!item.releaseChannelOnly || isElectron || HOSTED_APP_CHANNEL !== null) &&
      (!item.secretsFeatureOnly || isSecretsFeatureEnabled) &&
      (!item.macOnly || isMacPlatform(platform)) &&
      (!item.windowsOnly || isWindowsPlatform(platform)),
  );
}

export function searchSettings(
  query: string,
  items: ReadonlyArray<SettingsSearchItem> = SETTINGS_SEARCH_ITEMS,
  translate: (message: string) => string = (message) => message,
): ReadonlyArray<SettingsSearchItem> {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) return [];
  const queryTokens = normalizedQuery.split(" ");

  return settingsForThisPlatform(items)
    .flatMap((item, index) => {
      const title = normalizeSearchText(item.title);
      const fields = [
        title,
        normalizeSearchText(SETTINGS_SECTION_LABELS[item.to]),
        // The labels as displayed, so search also works in the active language.
        normalizeSearchText(translate(item.title)),
        normalizeSearchText(translate(SETTINGS_SECTION_LABELS[item.to])),
        ...(item.searchTerms ?? []).map(normalizeSearchText),
      ];
      if (!queryTokens.every((token) => fields.some((field) => field.includes(token)))) return [];

      const exactPhraseField = fields.findIndex((field) => field.includes(normalizedQuery));
      const rank =
        title === normalizedQuery
          ? 5
          : title.startsWith(normalizedQuery)
            ? 4
            : title.includes(normalizedQuery)
              ? 3
              : queryTokens.every((token) => title.includes(token))
                ? 2
                : exactPhraseField >= 0
                  ? 1
                  : 0;
      return [{ item, index, rank }];
    })
    .toSorted(
      (left, right) =>
        Number(left.item.secondary ?? false) - Number(right.item.secondary ?? false) ||
        right.rank - left.rank ||
        left.index - right.index,
    )
    .map(({ item }) => item);
}

// These rows only exist with separate fonts on, so a search jump to one turns them on.
const ADVANCED_TYPOGRAPHY_TARGET_IDS: ReadonlySet<string> = new Set([
  "prompt-font",
  "terminal-font",
]);

export function isAdvancedTypographyTarget(targetId: string): boolean {
  return ADVANCED_TYPOGRAPHY_TARGET_IDS.has(targetId);
}

/**
 * Opens the persisted section a search result lives in before jumping to it, so
 * its row is mounted to scroll to. The terminal reads the same flag, so it must
 * stay on after the jump.
 */
export function revealSettingsSearchTarget(targetId: string): void {
  if (isAdvancedTypographyTarget(targetId)) {
    writeLocalStorageValue(TYPOGRAPHY_ADVANCED_STORAGE_KEY, true, false, Schema.Boolean);
  }
}
