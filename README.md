# StoatMD

使用自有文件与云盘的 Markdown 笔记本（**多语言 · 出海**）。用 [nsh](https://nsh.dev)（Rust + TSX 混合）构建，**macOS + iOS**。

- 定名 **StoatMD** · 域名 [stoatmd.com](https://stoatmd.com) · 曾用名 LoomMD
- macOS 自选本地文件夹或云盘；**iOS 无本地文件 / 本地库**，一期仅选 Google Drive / Dropbox；笔记使用普通 `.md` 文件（Vault：open / list / read / write / create / rename / delete）
- 两栏：左栏全库搜索（标题、路径与正文）+ 可折叠文件树（笔记嵌在文件夹下），右栏编辑 / 分栏 / 预览；正文搜索在后台执行，包含嵌套目录与当前未保存正文
- 侧栏库名与下拉箭头共同展开笔记库菜单：显示当前库与路径，选择当前库回到根目录，通过「打开文件夹…」切换库；右侧铅笔新建笔记
- 笔记右键菜单：打开、在 Finder 中显示、复制路径 / 相对路径、重命名、创建副本、移到废纸篓；文案随界面语言
- 源码编辑 + 仅编辑 / 分栏 / 仅预览；停顿自动保存；外部改文件冲突提示
- 文件内搜索：编辑区右上角紧凑浮窗，macOS `⌘F`，Windows/Linux `Ctrl+F`；匹配高亮与计数，`Enter` / `Shift+Enter` 循环跳转，`Esc` 关闭并返回编辑器。系统结果快捷键为 macOS `⌘G` / `⇧⌘G`、Windows/Linux `F3` / `Shift+F3`；纯预览模式发起搜索时展开分栏显示匹配源码。
- 分栏时**编辑区与预览 60fps 双向滚动同步，丝滑跟手**（硬性验收标准）
- 预览默认采用 [Kami](https://github.com/tw93/kami) 文章排版（衬线正文、克制留白）；配色内置 **25 套 [Otty](https://otty.sh) 主题**（默认 Paper，9 浅色 / 16 深色），设置 → 外观即切即换（归属见 `THIRD_PARTY_NOTICES.md`）
- 设置使用独立的 macOS 原生窗口，支持系统红黄绿按钮、拖动、调整大小、全屏与窗口平铺；关闭设置后主窗口继续工作。
- 设置 → 外观 → **文稿配色**：默认彩色，标题、引用、链接与代码随主题着色；单色保留字号、字重与排版层级。源码与预览即时切换，偏好在重启后恢复。
- macOS 提供本地 / Dropbox / Google Drive，切换时迁移并校验，原数据默认保留；**iOS 仅 Dropbox / Google Drive**（无本地库入口，也不做本地库迁移）
- macOS 本机免费、云盘同步买断；iOS 付费应用包含云盘同步（不做订阅制，不绑 iCloud）
- **不做 MCP**

## iOS 产品约束（正海已定）

**iOS = 只能绑定云盘，没有独立本地库。**

- **没有**独立本地库，也**不能**只选本地文件 / 本机文件夹当库。
- **只能绑定云盘**（一期：**Google Drive / Dropbox**）。首启：绑定云盘 → 选远程文件夹 → 进库；**不做本地库迁移**。
- 云盘文件会**缓存到本地**，方便离线浏览与编辑；**云盘仍是真相源**。本地缓存 ≠「本地库模式」，勿与 macOS 自选本机文件夹混淆。

详见 [iOS 实现状态](docs/ios-v1/README.md)。

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
- macOS 本机免费、云盘同步买断；iOS 付费应用包含云盘同步（不做订阅制）

### 和妙言一类产品相比

理念接近：原生轻量、源码编辑 + 独立预览、普通 Markdown 文件。但妙言类产品多锁在**全苹果生态**，通常也不能让 AI 远程推笔记、给 Agent 调用同一库。StoatMD **不锁死全苹果生态**，正式支持云盘同步，并让 AI / Agent 可远程读写归档。

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
- [iOS v0.1 交互设计稿](docs/ios-v1/README.md)（笔记库、源码编辑、阅读与存储设置）
- [Logo 方向草案](docs/brand/stoatmd-logo/NOTES.md)（默认 A 织线白鼬 · C 敏捷剪影可在设置 → 外观切换 · 浅/暗两版随主题）
- [官网设计稿 website-v1](docs/website-v1/DESIGN-NOTES.md) · [正式静态站](website/README.md)（Astro · Cloudflare Pages）
- [Mac 一期实现计划](docs/superpowers/plans/2026-10-29-stoatmd-mac-v1.md)

## 工程结构

```
App.tsx                 # nsh 入口
src/mobile/             # iPhone 原生文库、编辑 / 阅读、设置与自动保存
src/ui/                 # TSX：Mac 两栏壳（文件树 + 编辑/预览）+ Vault 接线
src/sync/               # 同步引擎、OAuth PKCE、Google Drive / Dropbox Provider
src/storage/            # 单一存储记录、校验迁移、离线缓存、清理重试
src/lib.rs              # stoatmd/native 薄桥（选文件夹 / 监视 / OAuth / 钥匙串）
crates/stoatmd-core/    # Vault 路径沙箱与 CRUD
theme.json              # Paper / Nord 基础 token（nsh 原生控件兜底）
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
3. 编辑正文，源码区按主题语法色高亮（标题 accent、粗体标记 syntaxBold、行内代码浅底、引用绿），停顿约 0.7s 应出现「已保存」
4. 用外部编辑器改同一文件 → 应弹出冲突：保留本地 / 从磁盘重载
5. 分栏模式下分别滚动编辑区和预览 → 两侧应保持 60fps 双向同步，跟手无迟滞
6. 设置 → 外观：25 套 Otty 主题（浅色 9 / 深色 16，默认 Paper，含纯白 Floating Card）；切换后两栏、预览与设置自身配色即时更新
7. 设置 → 字体：界面字号（默认 14，范围 12–18）、编辑字号（默认 15，范围 12–24）与阅读字号（默认 16，范围 12–24）独立调整，即时保存并在重启后恢复。阅读字体支持搜索系统字体、调整行高；「恢复默认」复位全部排版设置
8. 左栏顶部可搜索全库笔记；文件夹可折叠、点笔记在右侧打开；鼠标移到顶栏右侧（或按 ⌘B）展开/隐藏文件树，工具条左侧显示当前笔记标题；⌘1–3 / ⌘, 均有菜单项
9. 语言默认跟随系统（识别简体中文、繁體中文、日本語、한국어、Deutsch、Français、Español），也可在设置中强制其中任一种（菜单文案随之切换）
10. 右键任意笔记：打开 / 在 Finder 中显示 / 复制路径 / 复制相对路径 / 重命名 / 创建副本 / 移到废纸篓；菜单与弹窗随界面语言切换

11. 设置 → 存储：本地 / Dropbox / Google Drive 三选一；免费安装默认开放本地，云盘通过 Pro 开发配置解锁
12. 切换位置：选目标文件夹 → 确认迁移（默认保留原位置数据）→ 复制与校验 → 切换。迁移期间暂停编辑与同步；同名差异以独立目录保留整套迁入资料
13. 云盘模式使用应用管理的离线副本；同步冲突逐文件选择。云盘之间、云盘返回本地与更换本地文件夹都使用相同迁移流程；清理失败可重试或保留剩余文件

> **本 Cloud / Linux 环境限制**：无 macOS AppKit，无法真机弹出系统选文件夹做端到端验证；可用 `nsh check`、`nsh test` 与 `cargo test -p stoatmd-core` 验收编译与 Vault 单元测试。选文件夹在桌面依赖 `rfd`（macOS 为系统面板；Linux 需 GTK 文件对话框）。

Linux 可做类型/编译冒烟：`nsh check`；有 GTK 4.14+ 时可 `nsh run`（非 AppKit，仅作开发参考）。

## 在 iPhone 模拟器运行

需要完整 Xcode、iOS Simulator 和 rustup。在 Apple Silicon Mac 上执行：

```sh
rustup target add aarch64-apple-ios-sim
python3 scripts/ios.py run
```

**约束重申**：iOS **没有独立本地库、不能只选本地文件**；**只能绑定云盘**（一期 Google Drive / Dropbox）。首启即绑定云盘 → 选远程文件夹 → 进库；**不做本地库迁移**。云盘文件会缓存到设备以便离线浏览与编辑，但**云盘仍是真相源**，这不是「本地库模式」。额外 Pro 付费墙已移除（云盘含在应用售价中）。核心读写包含搜索、文件夹、源码输入与键盘工具、阅读目录、重命名 / 副本 / 移动、回收站、系统文件导入导出和主题 / 语言 / 字号。自动保存使用原子写入与持久草稿。系统授权与钥匙串已接入代码，真实账号联调需要配置公共客户端 ID，详见 [iOS 实现状态](docs/ios-v1/README.md)。

## 云盘同步（开发者配置）

云盘支持 **Google Drive / Dropbox**。一个笔记库同一时间使用一个存储位置。选择云盘后，应用管理离线缓存，原本地目录解除绑定；缓存负责离线编辑。OAuth 令牌在 macOS / iOS 使用系统钥匙串（`TokenVault`），与 `Storage` 中的存储记录分离。

开发者需自备 OAuth 客户端，二选一：环境变量，或 `~/Library/Application Support/StoatMD/sync.json`（可用 `STOATMD_CONFIG_PATH` 改路径）。

| 提供商 | 环境变量 | 控制台配置 |
|--------|----------|-----------|
| Google Drive | `STOATMD_GOOGLE_CLIENT_ID` / `STOATMD_GOOGLE_CLIENT_SECRET` | 应用类型选「桌面应用」；启用 Drive API；回环 `http://127.0.0.1/callback`（端口随机） |
| Dropbox | `STOATMD_DROPBOX_APP_KEY` / `STOATMD_DROPBOX_APP_SECRET` | Scoped app，勾选 `files.content.read/write`、`files.metadata.read/write`；回调 `http://127.0.0.1:53682/callback`（端口可用 `STOATMD_DROPBOX_REDIRECT_PORT` 改，必须与后台一致） |

iOS 使用 `STOATMD_GOOGLE_IOS_CLIENT_ID`（iOS 客户端）和现有 `STOATMD_DROPBOX_APP_KEY`。`scripts/ios.py` 自动读取 Mac 配置中的 `googleIosClientId`、`dropboxAppKey`，将公共标识传入构建。平台回调和调试宿主配置见 [iOS 实现状态](docs/ios-v1/README.md)。

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

macOS 的 `purchaseRequired` 默认 `true`，免费状态开放本地。`STOATMD_PURCHASE_REQUIRED=0` / 上例 `purchaseRequired: false` 用于开发测试 Pro；macOS 购买流程和真实权益校验仍待接入。iOS 的应用购买已包含云盘访问，运行时统一关闭额外付费墙。受限状态暂停云盘同步与写入，允许重新授权原账号并迁回本地，包含离线修改及远程独有文件。

当前存储根、云盘连接与待清理任务统一保存在 `Storage` 的 `storage.active` 记录中。迁移校验完成后一次提交该记录；旧版本 `sync.connection` 仅用于兼容读取。配置变量参见 [.env.example](.env.example)，nsh 启动前需要显式导出环境变量。完整规则见 [存储与迁移](docs/product/SYNC.md)。

## 第三方

- 默认文章排版移植自 [Kami](https://github.com/tw93/kami)（MIT License，Copyright (c) 2026 Tw93）。
- 25 套外观主题取自 [Otty](https://otty.sh) 的内置主题（Apache-2.0，Copyright © 2026 appmakes），其中 Nord / Catppuccin / Dracula / Gruvbox / Solarized / Tokyo Night 等配色来自各自作者。
- 完整许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 当前进度

- [x] Phase 0/1：混合工程 + Mac 两栏壳 + Editor/TextView 分栏
- [x] Phase 2：Vault 读写、选文件夹、自动保存、冲突提示
- [x] Phase 3：25 套 Otty 主题网格、字体偏好、文件树折叠、菜单快捷键、跟随系统多语言（8 种界面语言）
- [x] Phase 4：Google Drive / Dropbox 同步（OAuth PKCE、选/建远程库、锚点增量、冲突逐文件弹选、自动推送与定时拉取）

- [x] 存储迁移：本地 / Dropbox / Google Drive 三选一，笔记与二进制附件校验，默认保留原数据，清理任务持久化

- [x] iPhone 核心读写：原生导航、文库搜索、源码输入、阅读目录、设置、自动保存、草稿恢复与冲突副本
- [x] iOS 云盘入口与平台桥接：付费应用直接连接 Google Drive / Dropbox、系统 OAuth、钥匙串和离线缓存
- [ ] iOS 真实云盘账号授权与同步端到端验收
