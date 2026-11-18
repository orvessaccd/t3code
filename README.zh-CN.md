<p align="center">
  <a href="https://t3.codes">
    <img src="./assets/prod/t3-black-web-icon-192x192.png" width="80" height="80" alt="T3 Code 图标" />
  </a>
</p>

<h1 align="center">T3 Code</h1>

<p align="center">面向编程智能体的开源控制中心。</p>

<p align="center">
  <a href="./README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <a href="https://t3.codes/download"><strong>下载客户端</strong></a> ·
  <a href="https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824">iOS</a> ·
  <a href="https://play.google.com/store/apps/details?id=com.t3tools.t3code">Android</a> ·
  <a href="https://app.t3.codes">Web 版</a> ·
  <a href="./docs/README.md">文档</a> ·
  <a href="https://discord.gg/jn4EGJjrvv">Discord</a>
</p>

<p align="center">
  <a href="https://t3.codes">
    <img src="./.github/readme/hero.webp" width="100%" alt="T3 Code 桌面端展示已完成的 Claude 线程，右侧手机端正在审批来自 Codex 的命令请求" />
  </a>
</p>

T3 Code 在你的机器上运行各类编程智能体（Coding Agents），并为它们提供统一、极速的图形交互界面。你可以在电脑前发起一个线程，随后在手机上随时审批下一步操作。

原生支持 Claude Code、Codex、Cursor、OpenCode、Grok Build、Antigravity、Kiro、Pi、Muse Code、fx，以及任何兼容 [ACP 协议](./docs/user/providers-acp.md)的智能体。只要智能体已在你的电脑上配置妥当，T3 Code 就能直接调度它。

> **汉化版说明**：本分支已完成桌面端、Web 端与移动端的简体中文汉化，首次启动默认使用简体中文，也可随时在 **「设置 → 通用 → 语言」** 中切换回 English 或跟随系统语言。

## 核心特性

- **沿用自有订阅**：T3 Code 不转售 Token，直接驱动你本机已登录授权的编程智能体。
- **多智能体协同**：支持在同一线程中途无缝切换模型，也可以将上下文从 Claude 直接交接给 Codex 继续执行。
- **桌面、Web 与手机三端同步**：单一服务端托管状态，所有客户端实时展示同一批项目与线程，提供原生 iOS 与 Android 应用。
- **远程就绪**：可在任意主机或开发机上运行智能体，通过局域网、Tailscale 或 [T3 Connect](./docs/user/remote-access.md) 安全连接。
- **内置 Git 与工作树**：每个线程均可在独立的 Git 工作树（Worktree）中隔离开发；就地审查差异（Diff），一键完成提交（Commit）、推送（Push）与创建拉取请求（PR）。
- **极致性能**：性能是一等公民。我们严格监控每一处渲染与传输开销，将每一次掉帧视为需要修复的缺陷。
- **真正开源**：采用 MIT 许可证开源。如果有任何不合心意的设计，随时可以 Fork 并打造成你理想中的工具。

## 安装指南

### 桌面端应用

前往下载适用于 macOS、Windows 或 Linux 的安装包（亦可在本仓库的 [Releases](../../releases) 页面获取最新中文构建安装包），或使用包管理器安装官方版本：

| 平台           | 安装命令                                                                |
| -------------- | ----------------------------------------------------------------------- |
| macOS          | `brew install --cask t3-code`                                           |
| Windows        | `winget install T3Tools.T3Code` 或 `scoop install extras/t3code`        |
| Arch Linux     | `yay -S t3code-bin`                                                     |
| Nix            | `nix profile add github:NixOS/nixpkgs/nixos-unstable#t3code`            |
| Debian, Ubuntu | 从 [Releases](https://github.com/pingdotgg/t3code/releases) 下载 `.deb` |

### 命令行工具（CLI）

安装 `t3` 命令后，运行 `t3` 即可启动本地服务端并打开 Web 界面：

```bash
curl -fsSL https://t3.codes/install.sh | sh
```

Windows PowerShell 环境：

```powershell
irm https://t3.codes/install.ps1 | iex
```

若只想临时体验而无需全局安装，可直接运行 `npx t3@latest`。

### 手机端应用

可从本仓库 [Releases](../../releases) 下载汉化版安装包（Android `.apk` 等），或前往 [App Store](https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824) 与 [Google Play](https://play.google.com/store/apps/details?id=com.t3tools.t3code) 获取官方客户端，随后参阅[远程访问指南](./docs/user/remote-access.md)配对连接你的电脑。

### 登录编程智能体

T3 Code 需要至少安装并登录一个编程智能体提供方。例如：安装 [Claude Code](https://claude.com/product/claude-code) 并执行 `claude auth login`，或安装 [Codex CLI](https://developers.openai.com/codex/cli) 并执行 `codex login`。

各智能体的详细配置步骤请参阅[提供方配置说明](./docs/user/install.md#providers)。关于 Nightly 版本、AppImage、WSL 及 NixOS 的更多说明请参阅[安装文档](./docs/user/install.md)。

## “等等，你们靠什么赚钱？”

什么也不卖。我们构建 T3 Code，纯粹是因为我们自己想要最好的智能体协作开发体验。市面上虽然已有 Codex 桌面版、Conductor、Claude Desktop、Cursor Glass 等优秀产品，但没有一款能同时满足我们的全部标准。

我们需要一款足够快、原生支持远程控制、并且彻头彻尾开源的工具。即便某一天我们的演进方向不再符合你的预期，你也拥有完整源码去 Fork 并构建属于你自己的版本。

## 文档导航

- [安装与首次运行](./docs/user/install.md)
- [从手机或其他设备远程连接](./docs/user/remote-access.md)
- [权限模式说明](./docs/user/permission-modes.md)
- [源代码管理与 PR 工作流](./docs/user/source-control.md)
- [通过 MCP 接入外部智能体](./docs/user/outside-agents.md)
- [常见问题（FAQ）](./docs/user/faq.md)

完整目录请查看[全部文档](./docs/README.md)。

## 参与贡献

上游团队的评审精力有限，聚焦且精简的问题修复最容易被合并；新功能建议请先发起讨论并获得认可。

- 提交缺陷报告或拉取请求前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 功能建议请提交至 [Ideas 讨论区](https://github.com/pingdotgg/t3code/discussions/categories/ideas)。
- 从源码构建请参考[开发手册](./docs/operations/development.md#first-checkout)，整体设计请参阅[架构概览](./docs/internals/overview.md)。
- 欢迎加入 [Discord 社区](https://discord.gg/jn4EGJjrvv)交流。

## 开源许可

[MIT](./LICENSE)
