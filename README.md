# StoatMD

本地优先 Markdown 笔记本（**多语言 · 出海**）。用 [nsh](https://nsh.dev)（Rust + TSX 混合）构建，**一期先做 macOS**。

- 定名 **StoatMD** · 域名 [stoatmd.com](https://stoatmd.com) · 曾用名 LoomMD
- 自选文件夹，普通 `.md` 文件（Vault：下一阶段）
- 源码编辑 + 仅编辑 / 分栏 / 仅预览
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
src/ui/                 # TSX：Mac 三栏壳
src/lib.rs              # stoatmd/native 薄桥
crates/stoatmd-core/    # Vault（本阶段 stub）
theme.json              # 织线纸白 / 暖夜炭 token
locales/                # zh / en
```

## 版本锁定

- **nsh CLI / crates：0.3.0**（`Cargo.toml` 中 `nsh-core` / `nsh-base` 与 CLI 同版本）

```sh
curl -fsSL https://nsh.dev/install.sh | NSH_VERSION=v0.3.0 sh
nsh --version   # 期望 0.3.0
```

## 在 Mac 上运行

需要：macOS 14+、Xcode Command Line Tools、Rust（rustup stable，需满足 nsh 0.3 依赖）、已安装的 `nsh` 0.3.x。

```sh
git clone https://github.com/richcalls/stoatmd.git
cd stoatmd
nsh check
nsh run --target macos
```

Linux 可做类型/编译冒烟：`nsh check`；有 GTK 4.14+ 时可 `nsh run`（非 AppKit，仅作开发参考）。

## 当前进度

- [x] Phase 0/1：混合工程 + Mac 三栏壳 + Editor/TextView 分栏 + 假数据
- [ ] Phase 2：Vault 读写与选文件夹
- [ ] 同步（Drive / Dropbox；不做 iCloud）
