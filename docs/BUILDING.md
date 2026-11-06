# 自行编译 StoatMD

个人可以依照 [PolyForm Noncommercial 1.0.0](../LICENSE) 编译、修改并使用 StoatMD。桌面官方包免费；iOS 官方版计划通过 App Store 一次买断，个人自编译版本使用自己的客户端与签名身份。

## 准备环境

- Rust stable（edition 2024）与 Python 3。
- nsh CLI **0.4.0**，与 `Cargo.toml` 中的 nsh crates 保持一致。
- macOS 开发：Xcode Command Line Tools。iOS 开发：完整 Xcode、对应 iOS SDK 与 Simulator。
- 官网开发单独使用 Node.js 22 与 npm。

```sh
git clone https://github.com/richcalls/stoatmd.git
cd stoatmd
curl -fsSL https://nsh.dev/install.sh | NSH_VERSION=v0.4.0 sh
nsh --version
```

首次运行 nsh 会下载类型声明、开发宿主与所需工具。以下命令从仓库根目录执行。

## macOS

```sh
nsh check
nsh test
nsh run --target macos
```

启动后通过「打开文件夹…」选择本地 Markdown 目录，即可编辑与阅读。使用云盘时先完成下节配置。

生成个人使用的 macOS 应用（ad hoc 签名）：

```sh
nsh package --target macos --out .nsh/local-macos --icon assets/app-logos/thread.png
```

官方 Developer ID 签名与公证流程见[维护者发布指南](product/RELEASE.md)。

## 配置自己的云盘客户端

应用使用 Google Drive / Dropbox 的 OAuth 授权。自编译版本需要自己的开发者客户端；个人云盘的访问令牌由应用写入系统钥匙串。

复制环境变量示例并填写自己需要的提供商：

```sh
cp .env.example .env
# 编辑 .env，填写自己的 OAuth 配置
set -a
. ./.env
set +a
```

`.env` 中的值按 shell 语法填写，包含空格的路径使用引号。nsh 和 Python 构建脚本从进程环境读取配置；每个新的终端会话均需执行上述导出步骤。

| 提供商 / 平台 | 配置 | 开发者控制台 |
|----------------|------|--------------|
| Google / 桌面 | `STOATMD_GOOGLE_CLIENT_ID`、`STOATMD_GOOGLE_CLIENT_SECRET` | 创建 Desktop app 客户端，启用 Drive API；回调使用 `http://127.0.0.1/callback`，端口随机 |
| Google / iOS | `STOATMD_GOOGLE_IOS_CLIENT_ID` | 创建 iOS 客户端，Bundle ID 与运行应用匹配 |
| Dropbox / 两个平台 | `STOATMD_DROPBOX_APP_KEY` | 创建 Scoped app，启用 `account_info.read`、`files.metadata.read/write`、`files.content.read/write`，使用 PKCE |

Dropbox 桌面回调为 `http://127.0.0.1:53682/callback`，端口由 `STOATMD_DROPBOX_REDIRECT_PORT` 控制，控制台登记值与运行时保持一致。`STOATMD_DROPBOX_APP_SECRET` 为兼容配置项，PKCE 授权使用 App Key。

也可以使用本机 JSON 配置，默认路径为 `~/Library/Application Support/StoatMD/sync.json`，或通过 `STOATMD_CONFIG_PATH` 指向自己的文件：

```json
{
  "googleClientId": "YOUR_DESKTOP_CLIENT_ID.apps.googleusercontent.com",
  "googleClientSecret": "YOUR_DESKTOP_CLIENT_SECRET",
  "googleIosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  "dropboxAppKey": "YOUR_DROPBOX_APP_KEY",
  "dropboxRedirectPort": 53682
}
```

`scripts/ios.py` 会将上述本机配置传入构建环境，显式环境变量优先。macOS 的 `nsh run` 可在运行时读取本机配置；macOS 打包时需先导出 OAuth 变量，以便将客户端标识写入构建。

## iPhone / iPad 模拟器

在 Apple Silicon Mac 上：

```sh
rustup target add aarch64-apple-ios-sim
python3 scripts/ios.py run
python3 scripts/ios.py run --device "iPhone 17 Pro Max"
```

Intel Mac 使用 `x86_64-apple-ios` Rust target，并选择 Xcode 提供的兼容模拟器。开发宿主 Bundle ID 为 `com.longbridge.nsh.host`，Google iOS 调试客户端按该标识创建。自编译独立安装包则使用自己的 Bundle ID 和匹配的 Google iOS 客户端。

iOS 首次启动时选择云盘并授权，随后选择远程文件夹进入笔记库。文件会缓存到设备供离线阅读与编辑。

## 安装到自己的 iPhone / iPad

在 Apple Developer 注册设备、创建 Apple Development provisioning profile，再用自己的签名身份与匹配应用标识打包。Bundle ID、描述文件与 Google iOS 客户端需一致。脚本会准备 OAuth 回调、隐私清单、图标并校验描述文件，将 App、框架与动态库逐层签名，输出已签名 IPA。

```sh
rustup target add aarch64-apple-ios
python3 scripts/ios_personal.py \
  --identity "Apple Development: YOUR NAME (TEAM_ID)" \
  --profile "$HOME/Library/MobileDevice/Provisioning Profiles/MyApp.mobileprovision" \
  --id com.example.my.stoatmd \
  --out .nsh/personal-ios
```

准备 `STOATMD_GOOGLE_IOS_CLIENT_ID` 与 `STOATMD_DROPBOX_APP_KEY`，并使用受描述文件授权的设备安装生成的 `.ipa`。签名有效期和设备范围由自己的 Apple 账号及描述文件决定。

`scripts/ios_release.py` 用于 App Store 分发，`scripts/ios_personal.py` 用于个人设备安装；两种流程分别校验 provisioning profile。官方发行流程见[发布指南](product/RELEASE.md#iosapp-store--testflight)。

## 验证

```sh
nsh check
nsh test
cargo test -p stoatmd-core
python3 scripts/ios.py test src/mobile/MobileShell.test.tsx
python3 -m unittest discover -s scripts -p 'test_ios_packaging.py'
```

原生 iOS 测试需要可用的模拟器。`scripts/test_ios_icons.py` 额外使用 Pillow；重新生成图标还需 `rsvg-convert`。历史设计稿的 Playwright 截图工具有各自的 `package.json`，按需在对应目录安装。

## 公开仓库与官方发布

官网 PR 构建在 GitHub 托管 runner 上执行。自托管 Apple CI 仅对私有仓库开放，公开源码仓库不能用；macOS 签名与公证凭据放在仓库 Actions Secrets，只由 tag 触发的桌面构建 workflow 使用，PR 拿不到。产物发布到本仓库的 GitHub Releases。
