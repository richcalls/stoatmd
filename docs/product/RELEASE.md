# 发版

## macOS（Developer ID，公开下载）

```sh
python3 scripts/macos_release.py \
  --identity "Developer ID Application: <名字> (<TEAMID>)"
```

脚本会依次：`nsh package --target macos` → Developer ID + hardened runtime 签名 →
`asc notarization submit --wait` 公证 → `stapler` 钉票 → 生成 DMG、签名、再公证并钉票 →
`spctl` 验收。产物在 `.nsh/release-macos/`：

- `StoatMD-<版本>-<构建号>.dmg`（拖拽安装，首选）
- `StoatMD-<版本>-<构建号>.zip`（公证用的原始压缩包）
- `SHA256SUMS.txt`

macOS 应用菜单的 **Check for Updates… / 检查更新…** 会查询公开仓库的最新正式版；发现新版本时，在浏览器打开固定名称的 `StoatMD-macos.dmg` 下载。退出 StoatMD 后，将 DMG 中的新 App 拖到 Applications 替换现有版本。发布时由维护者上传这个固定名称，应用版本号取本次发布 tag。

### 凭据策略

下载者的电脑上没有开发机的 `sync.json`，所以打包时必须把云盘 OAuth 凭据编进二进制
（`src/lib.rs` 的 `option_env!` 分支，值来自环境变量，由 `scripts/ios.py` 的
`build_environment()` 从 `sync.json` 读取，不打印）：

| 凭据 | 是否内置 | 说明 |
|------|----------|------|
| Google `client_id` / `client_secret` | 是 | Desktop app 属于 public client，Google 明确说 installed app 的 secret 不是机密（RFC 8252 §8.5）；必须使用 Desktop 类型客户端 |
| Dropbox `app_key` | 是 | 公开标识 |
| Dropbox `app_secret` | **否** | 走 PKCE，token 交换不需要 secret |
| 用户的 `sync.json` / 环境变量 | 优先于内置值 | 开发机与自建客户端仍可覆盖 |

打包默认 `purchaseRequired=false`（本机与云盘同步免费）。用户自己的 `sync.json`
里即使写了 `purchaseRequired: true`，桌面端也不再加锁。

### 发布前检查

- Google Cloud Console：OAuth 客户端类型是 **Desktop app**，项目处于 Production；
  `drive` 属于 restricted scope，公开分发需要完成 Google 验证（必要时 CASA）。
- 配额与错误率告警已开启；准备好客户端停用 / 用户重新授权的流程。
- 授权链路保持系统浏览器 + 随机 loopback 端口 + S256 PKCE + `state`；token 只进系统钥匙串。
- 确认待发布的 DMG 由当前提交构建：CI 从 tag 指向的提交构建；本地发版时重新跑脚本，
  不要复用旧产物。

### macOS 发布

推送 `v*` tag 后，`.github/workflows/desktop-release.yml` 的 macOS 任务在 `macos-15`
托管 runner 上完成打包、Developer ID 签名、`asc` 公证、`stapler` 钉票与 `spctl` 验收，
再把 macOS、Windows、Linux 的包附加到本仓库的 Release，校验和统一生成为
`SHA256SUMS-desktop.txt`；DMG 另存一份
`StoatMD-macos.dmg` 供官网与应用内更新的固定直链使用。

公开仓库不能使用自托管 `apple-ci`（runner group 禁止公开仓库），签名与公证凭据改放
仓库 Actions Secrets，PR 运行拿不到：

| Secret | 内容 | 怎么生成 |
|--------|------|----------|
| `MACOS_CERTIFICATE` | Developer ID Application 证书与私钥的 `.p12`，base64 单行 | 钥匙串访问里导出 `.p12`，再 `base64 -i cert.p12 \| pbcopy` |
| `MACOS_CERTIFICATE_PASSWORD` | 导出 `.p12` 时设置的密码 | 自行设置 |
| `ASC_KEY_ID` | App Store Connect API Key ID | App Store Connect → Users and Access → Integrations |
| `ASC_ISSUER_ID` | Issuer ID | 同上 |
| `ASC_PRIVATE_KEY` | `AuthKey_<KEY_ID>.p8` 全文 | 同上，只能下载一次 |

证书或 API key 轮换后更新对应 Secret，下一次 tag 发版生效。托管 runner 没有钥匙串，
workflow 每次新建临时 keychain 导入证书，机器销毁即失效。

CI 不可用时可以本地发版：在可信的 Apple Silicon Mac 上跑
`scripts/macos_release.py` 完成签名与公证，再手动上传：

```sh
TAG=v<版本>
git tag "$TAG"
git push origin "$TAG"
cp .nsh/release-macos/StoatMD-<版本>-<构建号>.dmg \
  .nsh/release-macos/StoatMD-macos.dmg
gh release create "$TAG" \
  --title "StoatMD <版本>（macOS）" --notes-file <说明.md> \
  .nsh/release-macos/StoatMD-<版本>-<构建号>.dmg \
  .nsh/release-macos/StoatMD-<版本>-<构建号>.zip \
  .nsh/release-macos/SHA256SUMS.txt \
  .nsh/release-macos/StoatMD-macos.dmg
```

## 桌面版 CI 构建（macOS / Windows / Linux）

`.github/workflows/desktop-release.yml` 在对应的 GitHub 托管系统上分别构建三种
桌面客户端。推送 `v*` tag 后，CI 会自动把 macOS（已签名、公证的 DMG 与 ZIP）、
Windows、Linux 包及 `SHA256SUMS-desktop.txt` 附加到同一个 GitHub Release。手动运行
workflow 会构建并保存 14 天的 Actions artifact，不发布 Release。

GitHub 托管的 macOS arm64 runner 偶尔分配不到机器：任务排队 15 分钟后被取消，日志里
是 `The job was not acquired by Runner of type hosted`。这不是构建失败，
`.github/workflows/desktop-release-retry.yml` 会找出「失败但从未被机器领取」的任务并
自动重跑，同一轮最多三次；真正跑过再失败的任务不会被自动重跑，仍然需要人工查看。

每个平台都必须在原生系统上打包。nsh 0.4.0 不支持桌面交叉编译；脚本会拒绝在不匹配
的主机运行。

在 Windows 上：

```powershell
python scripts/desktop_release.py --build <构建号>
```

产物：`.nsh/release-desktop/StoatMD-<版本>-<构建号>-windows.zip`，
解压后运行 `StoatMD/StoatMD.exe`。

在 Linux 上：

```sh
python3 scripts/desktop_release.py --build <构建号>
```

产物：`.nsh/release-desktop/StoatMD-<版本>-<构建号>-linux.tar.gz`，
解压后运行 `StoatMD/StoatMD`，或安装其中的 `com.stoatmd.app.desktop`。

macOS 也会由 `macos-15` runner 生成
`.nsh/release-desktop/StoatMD-<版本>-<构建号>-macos.zip`，内含 ad hoc 签名的
`StoatMD.app`。该公开构建不含 Developer ID 签名或公证，首次打开时按 macOS 安全提示
在「系统设置 → 隐私与安全性」批准应用。维护者仍可在可信 Mac 上运行上面的签名与公证
流程，并将正式 DMG 一并上传到 Release。

各平台 workflow artifact 内含对应安装包和 `SHA256SUMS.txt`；tag Release 另附
`SHA256SUMS-desktop.txt`，并把同一套 `sync.json` OAuth 客户端配置编进桌面包。

已知限制：

- Windows 没有代码签名，首次运行会有 SmartScreen 提示
  （「更多信息 → 仍要运行」）；Linux 没有公证概念。
- Windows 的 `.exe` 图标在该平台上打包时嵌入；Linux 包内带 PNG 图标。
- 发布前必须在对应系统启动一次，确认能打开、授权云盘、保存一篇笔记。

### 配置 GitHub Actions

为让公开 Release 可直接连接 Google Drive / Dropbox，需要在仓库 Settings → Secrets and
variables → Actions 配置下面三个 OAuth 客户端值。Google Desktop client secret 属于
公开 native app 客户端的一部分，会编入安装包；不要把个人账号令牌或私钥放进这些值。

需要先配置仓库 Secrets：

| Secret | 用途 | 是否必填 | 怎么生成 | 生效方式 |
|--------|------|----------|----------|----------|
| `STOATMD_GOOGLE_CLIENT_ID` | 编进安装包，下载者可直接连 Google Drive | 是 | Google Cloud Console → OAuth 客户端（Desktop app） | Actions 以环境变量传入，`src/lib.rs` 编译期写入 |
| `STOATMD_GOOGLE_CLIENT_SECRET` | 同上，token 交换 | 是 | 同上 | 同上 |
| `STOATMD_DROPBOX_APP_KEY` | 编进安装包，连接 Dropbox（PKCE，不需要 app secret） | 是 | Dropbox App Console → App key | 同上 |

更新 Secret 后，下一次 tag build 会使用新配置；已发布安装包继续包含构建时的客户端值。
如果某个平台 OAuth 客户端轮换，应先在 Google / Dropbox 控制台更新客户端，再重发所有
平台。`sync.json` 或同名环境变量仍优先于内置值，开发机行为不变。

## iOS（App Store / TestFlight）

```sh
python3 scripts/ios_release.py \
  --identity "Apple Distribution: <名字> (<TEAMID>)" \
  --profile ".nsh/signing/StoatMD App Store.mobileprovision" --build <构建号>
asc builds upload --app 6829230372 --ipa .nsh/testflight/StoatMD.ipa --pretty
```

iOS 只内置公开的 Google iOS client id 与 Dropbox app key，token 存 iCloud 钥匙串。

iOS 图标使用 `assets/ios/` 下的满幅、不透明 PNG，圆角由系统裁切。
修改 01/03 品牌 SVG 后运行 `python3 scripts/ios_icons.py` 重新生成（需要
`rsvg-convert` 与 Pillow），再运行
`python3 -m unittest discover -s scripts -p 'test_ios_icons.py'` 验证底色与资源目录。
发布脚本会为 iPhone 和 iPad 编译主图标与四套备用图标，设置页通过 UIKit
切换主屏幕图标；01/03 的深色图标随 iOS 主屏幕的外观切换。
