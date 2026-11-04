# StoatMD

使用自有文件与云盘的 Markdown 笔记本，用 [nsh](https://nsh.dev)（Rust + TSX）构建，支持 macOS、iOS 与 8 种界面语言。

**桌面版免费。iOS 官方版通过 App Store 一次买断。源码公开，个人可以自行编译使用。**

[macOS 下载](https://github.com/richcalls/stoatmd/releases) · [问题反馈](https://github.com/richcalls/stoatmd/issues) · [自行编译](docs/BUILDING.md) · [参与贡献](CONTRIBUTING.md) · [安全报告](SECURITY.md)

## 使用许可与收费

本项目采用 **PolyForm Noncommercial 1.0.0**，属于 **source-available（源码公开、非商业授权）** 项目。你可以阅读、学习、修改代码，为自己编译安装，也可以依照许可证免费分享源码或修改版。

| 用途 | 授权范围 |
|------|----------|
| 个人学习、实验、兴趣项目、自己编译使用 | 允许 |
| 非商业修改、fork、免费分享 | 允许；分享时保留许可证与版权声明 |
| 售卖源码、安装包或修改版，收费上架应用商店 | 禁止 |
| 集成到商业产品、提供收费服务或其他商业用途 | 禁止 |

此表是便于理解的用途说明；完整授权范围以 [LICENSE](LICENSE) 英文原文为准，其中也定义了非商业机构适用的情况。第三方依赖、字体、图标、主题和素材各自遵循其原有许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

项目权利人保留官方版本的商业发行权，**iOS App Store 一次买断是项目的主要收入来源**。官方版为用户提供免于自行编译、配置与签名的安装方式；个人也可以按[构建指南](docs/BUILDING.md)使用自己的 OAuth 客户端和 Apple 签名配置。

## 功能

- 普通 Markdown 文件与目录，方便你和本地 / 远程 AI Agent 共同读写与归档。
- Markdown 源码编辑、分栏与独立阅读；停顿自动保存，支持文件冲突处理和双向滚动同步。
- 全库搜索、可折叠文件树、文件操作与文内查找；iOS 提供收藏夹与回收站。
- Google Drive / Dropbox 同步与离线缓存，冲突时可保留本地、云端或两份副本。
- 20 套主题、字体与独立的界面 / 编辑 / 阅读字号，基于 [Kami](https://github.com/tw93/kami) 的阅读排版。
- 简体中文、繁體中文、English、日本語、한국어、Deutsch、Français、Español。

| 平台 | 存储方式 | 发行方式 |
|------|----------|----------|
| macOS | 本地文件夹、Google Drive、Dropbox | 官方安装包免费，含云盘同步 |
| iOS / iPadOS | Google Drive、Dropbox；设备提供离线缓存 | 官方版通过 App Store 买断；个人可自行编译 |
| Windows / Linux | 本地文件夹、Google Drive、Dropbox | 按目标系统构建验证后发布，桌面免费 |

iOS 使用云盘文件夹作为笔记库，首次启动时授权云盘并选择远程文件夹。macOS 支持本地文件夹和云盘笔记库，并可在两者之间迁移。

## 快速开始

需要 Rust stable、Python 3、Xcode Command Line Tools，以及 **nsh CLI 0.3.0**。运行 iOS 模拟器和构建真机包还需要完整 Xcode。

```sh
git clone https://github.com/richcalls/stoatmd.git
cd stoatmd
curl -fsSL https://nsh.dev/install.sh | NSH_VERSION=v0.3.0 sh
nsh --version
nsh check
nsh test
nsh run --target macos
```

在 Apple Silicon Mac 上运行 iPhone 模拟器：

```sh
rustup target add aarch64-apple-ios-sim
python3 scripts/ios.py run
```

macOS 可直接打开本地 Markdown 文件夹。连接 Google Drive / Dropbox 需要在各自开发者控制台配置自己的 OAuth 客户端；iOS 需要先连接云盘。OAuth、模拟器和个人真机安装步骤见[构建指南](docs/BUILDING.md)，变量示例见 [.env.example](.env.example)。

## 工程结构

```text
App.tsx                  nsh 入口
src/mobile/              iPhone / iPad 原生文库、编辑、阅读与设置
src/ui/                  桌面界面及跨平台排版、主题、偏好
src/sync/                同步引擎、OAuth PKCE 与 Google / Dropbox Provider
src/storage/             存储记录、迁移校验与离线缓存
src/lib.rs               Rust 原生桥：文件、OAuth、钥匙串与系统窗口
crates/stoatmd-core/     Vault 路径沙箱与文件读写
locales/                 8 种界面语言
assets/                  应用图标与系统隐私清单
scripts/                 构建、签名、图标与发布工具
website/                 Astro 官网
```

## 验证

```sh
nsh check
nsh test
cargo test -p stoatmd-core
```

修改 iOS 界面时也可以用可用的模拟器执行相关原生测试，例如 `python3 scripts/ios.py test src/mobile/MobileShell.test.tsx`。修改官网时在 `website/` 执行 `npm ci`、`npm run check` 和 `npm run build`。

## 文档

- [自行编译、OAuth 与 iOS 个人签名安装](docs/BUILDING.md)
- [贡献指南](CONTRIBUTING.md) · [安全报告](SECURITY.md) · [第三方许可](THIRD_PARTY_NOTICES.md)
- [产品总述](docs/product/PRODUCT.md) · [存储与云盘同步](docs/product/SYNC.md) · [维护者发版](docs/product/RELEASE.md)
- [技术设计](docs/技术设计-v1.md) · [macOS 设计](docs/ui-v1/DESIGN-NOTES.md) · [iOS 设计](docs/ios-v1/README.md) · [官网开发](website/README.md)

`nsh.json` 保存应用清单；Rust workspace 使用 edition 2024，nsh crates 与 CLI 保持 0.3.0。`.nsh/`、`target/`、本机 OAuth 配置、签名材料与应用构建产物均由 Git 忽略。
