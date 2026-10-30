# StoatMD

本地优先 Markdown 笔记本（**多语言 · 出海**）。用 [nsh](https://nsh.dev)（Rust + TSX 混合）构建，**一期先做 macOS**。

- 定名 **StoatMD** · 域名 [stoatmd.com](https://stoatmd.com) · 曾用名 LoomMD
- 自选文件夹，普通 `.md` 文件（Vault：open / list / read / write / create / rename / delete）
- 两栏：左栏搜索 + 可折叠文件树（笔记嵌在文件夹下），右栏编辑 / 分栏 / 预览
- 笔记右键菜单：打开、在 Finder 中显示、复制路径 / 相对路径、重命名、创建副本、移到废纸篓；文案随界面语言
- 源码编辑 + 仅编辑 / 分栏 / 仅预览；停顿自动保存；外部改文件冲突提示
- 分栏时**编辑区与预览 60fps 双向滚动同步，丝滑跟手**（硬性验收标准）
- 预览默认采用 [Kami](https://github.com/tw93/kami) 文章排版：羊皮纸底、墨蓝强调、衬线正文（MIT，见 `THIRD_PARTY_NOTICES.md`）
- Google Drive / Dropbox 云盘同步；本地库始终是真相，冲突逐文件弹选，不静默覆盖
- 本机永远免费；开启同步走**买断**付费墙（不做订阅制，不绑 iCloud）
- **不做 MCP**

## StoatMD 适合谁

### 为什么做 StoatMD

Obsidian 要多端同步，基本得买它的官方订阅。但这套同步是封闭的：很难交给远程 AI / Agent 用，手机上也不好接可用的 AI 工作流。虽有 Git / GitHub 一类第三方办法，手机难用、各端同步也不顺；若再叠 iCloud，`.git` 目录会膨胀，容量与文件数指数级增加。

StoatMD 要解决的就是这件事：**笔记用你自己的云盘（Google Drive、Dropbox）同步**，多端都能用，也方便交给 AI / Agent（含远程、手机）读写归档，而不是被锁进官方订阅同步里。应用本身是**买断制**，不为同步再绑一套订阅。**不做 iCloud**。

**典型场景**：用 Grok Bot 整理资料 → 汇总、归档进你自己的笔记库。

### 和 Typora 相比

StoatMD **不做所见即所得**，而是保留纯 Markdown 源码编辑与独立预览（仅编辑 / 分栏 / 仅预览）。更适合习惯直接编辑源文件、又需要即时看到排版效果的人。

### 和 Obsidian 相比

- Obsidian 官方同步要订阅，且难交给远程 AI / Agent
- GitHub 同步在手机上很难用；GitHub + iCloud 会让 `.git` 膨胀
- StoatMD 用你自己的 **Google Drive / Dropbox** 多端同步；笔记对 Personal Agent / 远程 AI 可读写归档
- 本机永远免费；开启同步走**买断**付费墙（不做订阅制）

### 和妙言一类产品相比

理念接近：原生轻量、源码编辑 + 独立预览、本机文件夹是真相。但妙言类产品多锁在**全苹果生态**，通常也不能让 AI 远程推笔记、给 Agent 调用同一库。StoatMD **不锁死全苹果生态**，正式支持云盘同步，并让 AI / Agent 可远程读写归档。

### 明确不做

- MCP / AgentBridge（无自有服务器；Personal Agent 走云盘文件即可）
- 所见即所得（WYSIWYG）
- 实时协作
- 自建服务器 / 自建账号同步

## 文档

- [产品总述](docs/product/PRODUCT.md) · [云盘同步](docs/product/SYNC.md)
- [技术设计 v1](docs/技术设计-v1.md)
- [UI v1 设计说明](docs/ui-v1/DESIGN-NOTES.md)（风格 B · 织线）
- [UI v2 内嵌阅读画布方案](docs/ui-v2/README.md)（交互设计稿与 Qoder 实现说明）
- [Logo 方向草案](docs/brand/stoatmd-logo/NOTES.md)（A 织线白鼬 · C 敏捷剪影；主图标未定，未接入 App）
- [Mac 一期实现计划](docs/superpowers/plans/2026-10-29-stoatmd-mac-v1.md)

## 工程结构

```
App.tsx                 # nsh 入口
src/ui/                 # TSX：Mac 两栏壳（文件树 + 编辑/预览）+ Vault 接线
src/sync/               # 同步引擎、OAuth PKCE、Google Drive / Dropbox Provider
src/lib.rs              # stoatmd/native 薄桥（选文件夹 / 监视 / OAuth / 钥匙串）
crates/stoatmd-core/    # Vault 路径沙箱与 CRUD
theme.json              # Kami 羊皮纸 / 暖夜炭 token
locales/                # zh / en
```

## 版本锁定

- **nsh CLI / crates：0.3.0**（`Cargo.toml` 中 `nsh-core` / `nsh-base` 与 CLI 同版本）

```sh
curl -fsSL https://nsh.dev/install.sh | NSH_VERSION=v0.3.0 sh
nsh --version   # 期望 0.3.0
```

## 在 Mac 上运行与验证 Vault

需要：macOS 14+、Xcode Command Line Tools、Rust（rustup stable，需满足 nsh 0.3 依赖）、已安装的 `nsh` 0.3.x。

```sh
git clone https://github.com/richcalls/stoatmd.git
cd stoatmd
nsh check
nsh test
nsh run --target macos
```

1. 启动后点「打开文件夹…」（或菜单 文件 → 打开文件夹… / ⌘O）
2. 选一个含 `.md` 的目录（或空目录后点「新建笔记」）
3. 编辑正文，源码区按 DESIGN 语法色随主题高亮（标题 accent、粗体标记 ink3、行内代码棕底、引用绿），停顿约 0.7s 应出现「已保存」
4. 用外部编辑器改同一文件 → 应弹出冲突：保留本地 / 从磁盘重载
5. 分栏模式下分别滚动编辑区和预览 → 两侧应保持 60fps 双向同步，跟手无迟滞
6. 设置 → 外观：12 套主题（浅色 8 / 深色 4，含纯白）；切换后两栏与预览配色即时更新
7. 设置 → 字体：默认显示本机实际衬线字体（如 Songti SC），可下拉搜索系统字体、调字号与行高；右上「恢复默认」复位；预览与设置内示例即时变化
8. 左栏顶部可搜索全库笔记；文件夹可折叠、点笔记在右侧打开；鼠标移到顶栏右侧（或按 ⌘B）展开/隐藏文件树，工具条左侧显示当前笔记标题；⌘1–3 / ⌘, 均有菜单项
9. 语言默认跟随系统（识别简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español），也可在设置中强制其中任一种（菜单文案随之切换）
10. 右键任意笔记：打开 / 在 Finder 中显示 / 复制路径 / 复制相对路径 / 重命名 / 创建副本 / 移到废纸篓；菜单与弹窗随界面语言切换

11. 配置好云盘 OAuth 凭据后，设置 → 同步 →「开启同步」→ 选提供商 → 浏览器授权 → 选/新建远程文件夹 → 首轮同步
12. 两台设备同时改同一篇 → 冲突表弹出，必须逐文件选择；「全部应用」有二次确认；不静默覆盖
13. 断开同步只清绑定与令牌，本地 `.md` 原样保留

> **本 Cloud / Linux 环境限制**：无 macOS AppKit，无法真机弹出系统选文件夹做端到端验证；可用 `nsh check`、`nsh test` 与 `cargo test -p stoatmd-core` 验收编译与 Vault 单元测试。选文件夹在桌面依赖 `rfd`（macOS 为系统面板；Linux 需 GTK 文件对话框）。

Linux 可做类型/编译冒烟：`nsh check`；有 GTK 4.14+ 时可 `nsh run`（非 AppKit，仅作开发参考）。

## 云盘同步（开发者配置）

一期仅 **Google Drive / Dropbox**（不做 iCloud、不出现 OneDrive 灰显入口）。本地库永远是真相；OAuth 令牌只存 macOS 钥匙串（`TokenVault`），不写 `Storage`、不进仓库。

开发者需自备 OAuth 客户端，二选一：环境变量，或 `~/Library/Application Support/StoatMD/sync.json`（可用 `STOATMD_CONFIG_PATH` 改路径）。

| 提供商 | 环境变量 | 控制台配置 |
|--------|----------|-----------|
| Google Drive | `STOATMD_GOOGLE_CLIENT_ID` / `STOATMD_GOOGLE_CLIENT_SECRET` | 应用类型选「桌面应用」；启用 Drive API；回环 `http://127.0.0.1/callback`（端口随机） |
| Dropbox | `STOATMD_DROPBOX_APP_KEY` / `STOATMD_DROPBOX_APP_SECRET` | Scoped app，勾选 `files.content.read/write`、`files.metadata.read/write`；回调 `http://127.0.0.1:53682/callback`（端口可用 `STOATMD_DROPBOX_REDIRECT_PORT` 改，必须与后台一致） |

```json
{
  "googleClientId": "…",
  "googleClientSecret": "…",
  "dropboxAppKey": "…",
  "dropboxAppSecret": "…",
  "dropboxRedirectPort": 53682,
  "purchaseRequired": false
}
```

`purchaseRequired`（或 `STOATMD_PURCHASE_REQUIRED=1`）只挡「开启同步」入口；默认关闭，等商业化接入再开。同步偏好存 `Storage`（`sync.connection` / `sync.base` / `sync.lastAt`），令牌在钥匙串，断开即清。

## 第三方

- 默认文章排版与色板移植自 [Kami](https://github.com/tw93/kami)（MIT License，Copyright (c) 2026 Tw93）；完整许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 当前进度

- [x] Phase 0/1：混合工程 + Mac 两栏壳 + Editor/TextView 分栏
- [x] Phase 2：Vault 读写、选文件夹、自动保存、冲突提示
- [x] Phase 3：12 套主题网格、字体偏好、文件树折叠、菜单快捷键、跟随系统多语言（8 种界面语言）
- [x] Phase 4：Google Drive / Dropbox 同步（OAuth PKCE、选/建远程库、锚点增量、冲突逐文件弹选、自动推送与定时拉取）
