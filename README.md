# StoatMD

本地优先 Markdown 笔记本（**多语言 · 出海**）。用 [nsh](https://nsh.dev)（Rust + TSX 混合）构建，**一期先做 macOS**。

- 定名 **StoatMD** · 域名 [stoatmd.com](https://stoatmd.com) · 曾用名 LoomMD
- 自选文件夹，普通 `.md` 文件（Vault：open / list / read / write / create / rename / delete）
- 源码编辑 + 仅编辑 / 分栏 / 仅预览；停顿自动保存；外部改文件冲突提示
- 分栏时**编辑区与预览 60fps 双向滚动同步，丝滑跟手**（硬性验收标准）
- 本机永远免费；云盘同步在本地库跑通后接入（**应用买断制**，不为同步再绑订阅）
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
- [Logo 方向草案](docs/brand/stoatmd-logo/NOTES.md)（A 织线白鼬 · C 敏捷剪影；主图标未定，未接入 App）
- [Mac 一期实现计划](docs/superpowers/plans/2026-10-29-stoatmd-mac-v1.md)

## 工程结构

```
App.tsx                 # nsh 入口
src/ui/                 # TSX：Mac 三栏壳 + Vault 接线
src/lib.rs              # stoatmd/native 薄桥（选文件夹 / 监视）
crates/stoatmd-core/    # Vault 路径沙箱与 CRUD
theme.json              # 织线纸白 / 暖夜炭 token
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
6. 设置 → 外观：12 套主题（浅色 8 / 深色 4，含纯白）；切换后三栏与预览配色即时更新
7. 设置 → 字体：下拉选择系统字体（可搜索）、字号、行高；预览与设置内示例即时变化
8. 编辑工具条左侧按钮循环「展开 200px → 图标轨 48px → 隐藏」；列表可独立收起；⌘B / ⌘⇧B / ⌘1–3 / ⌘, 均有菜单项
9. 语言默认跟随系统，也可在设置中强制中文 / English（菜单文案随之切换）

> **本 Cloud / Linux 环境限制**：无 macOS AppKit，无法真机弹出系统选文件夹做端到端验证；可用 `nsh check`、`nsh test` 与 `cargo test -p stoatmd-core` 验收编译与 Vault 单元测试。选文件夹在桌面依赖 `rfd`（macOS 为系统面板；Linux 需 GTK 文件对话框）。

Linux 可做类型/编译冒烟：`nsh check`；有 GTK 4.14+ 时可 `nsh run`（非 AppKit，仅作开发参考）。

## 当前进度

- [x] Phase 0/1：混合工程 + Mac 三栏壳 + Editor/TextView 分栏
- [x] Phase 2：Vault 读写、选文件夹、自动保存、冲突提示
- [x] Phase 3：12 套主题网格、字体偏好、三栏折叠 / 图标轨、菜单快捷键、跟随系统多语言
- [ ] 同步（Drive / Dropbox；不做 iCloud）
