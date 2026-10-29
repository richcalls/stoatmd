# StoatMD

本地优先 Markdown 笔记本（**多语言 · 出海**）。用 [nsh](https://nsh.dev)（Rust + TSX 混合）构建，**一期先做 macOS**。

- 定名 **StoatMD** · 域名 [stoatmd.com](https://stoatmd.com) · 曾用名 LoomMD
- 自选文件夹，普通 `.md` 文件（Vault：open / list / read / write / create / rename / delete）
- 源码编辑 + 仅编辑 / 分栏 / 仅预览；停顿自动保存；外部改文件冲突提示
- 分栏时**编辑区与预览 60fps 双向滚动同步，丝滑跟手**（硬性验收标准）
- 本机永远免费；云盘同步在本地库跑通后接入
- **不做 MCP**

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
3. 编辑正文，停顿约 0.7s 应出现「已保存」
4. 用外部编辑器改同一文件 → 应弹出冲突：保留本地 / 从磁盘重载
5. 分栏模式下分别滚动编辑区和预览 → 两侧应保持 60fps 双向同步，跟手无迟滞

> **本 Cloud / Linux 环境限制**：无 macOS AppKit，无法真机弹出系统选文件夹做端到端验证；可用 `nsh check`、`nsh test` 与 `cargo test -p stoatmd-core` 验收编译与 Vault 单元测试。选文件夹在桌面依赖 `rfd`（macOS 为系统面板；Linux 需 GTK 文件对话框）。

Linux 可做类型/编译冒烟：`nsh check`；有 GTK 4.14+ 时可 `nsh run`（非 AppKit，仅作开发参考）。

## 当前进度

- [x] Phase 0/1：混合工程 + Mac 三栏壳 + Editor/TextView 分栏
- [x] Phase 2：Vault 读写、选文件夹、自动保存、冲突提示
- [ ] Phase 3：设置主题网格 / 字体 / 快捷键打磨
- [ ] 同步（Drive / Dropbox；不做 iCloud）
