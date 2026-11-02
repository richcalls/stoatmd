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

发到公开仓库：

```sh
gh release create v<版本> -R richcalls/stoatmd-community \
  --title "StoatMD <版本>（macOS）" --notes-file <说明.md> \
  .nsh/release-macos/StoatMD-<版本>-<构建号>.dmg \
  .nsh/release-macos/StoatMD-<版本>-<构建号>.zip \
  .nsh/release-macos/SHA256SUMS.txt
```

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
- 确认待发布的 DMG 由当前提交构建：发布前重新跑脚本，不要复用旧产物。

## Windows / Linux（公开下载）

**必须在对应系统上打包。** nsh 0.3.0 不做桌面端的交叉编译：在 macOS 上
`nsh package --target windows` 产出的 `StoatMD.exe` 实际是 macOS 的 Mach-O
文件，Windows 上无法启动；Linux 同理。`scripts/desktop_release.py` 会拒绝在
不匹配的主机上运行。

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

两个平台都会生成 `SHA256SUMS.txt`，并把同一套 `sync.json` 凭据编进二进制。

已知限制：

- Windows 没有代码签名，首次运行会有 SmartScreen 提示
  （「更多信息 → 仍要运行」）；Linux 没有公证概念。
- Windows 的 `.exe` 图标在该平台上打包时嵌入；Linux 包内带 PNG 图标。
- 发布前必须在对应系统启动一次，确认能打开、授权云盘、保存一篇笔记。

### 用 GitHub Actions 构建

`.github/workflows/desktop-release.yml` 在 `windows-latest` 与 `ubuntu-24.04`
上分别打包，手动触发（Actions → Desktop · Windows & Linux → Run workflow）。
产物是 workflow artifact，不会自动上传到公开 Release。

需要先配置仓库 Secrets：

| Secret | 用途 | 是否必填 | 怎么生成 | 生效方式 |
|--------|------|----------|----------|----------|
| `STOATMD_GOOGLE_CLIENT_ID` | 编进安装包，下载者可直接连 Google Drive | 是 | Google Cloud Console → OAuth 客户端（Desktop app） | Actions 以环境变量传入，`src/lib.rs` 编译期写入 |
| `STOATMD_GOOGLE_CLIENT_SECRET` | 同上，token 交换 | 是 | 同上 | 同上 |
| `STOATMD_DROPBOX_APP_KEY` | 编进安装包，连接 Dropbox（PKCE，不需要 app secret） | 是 | Dropbox App Console → App key | 同上 |

配置位置：GitHub 仓库 Settings → Secrets and variables → Actions。
轮换影响：更新 Secret 后必须重新打包并替换 Release 资产；旧安装包仍带旧凭据，
若凭据泄漏，应先在 Google / Dropbox 控制台轮换，再重发所有平台。
`sync.json` 或同名环境变量仍优先于内置值，开发机行为不变。

## iOS（App Store / TestFlight）

```sh
python3 scripts/ios_release.py \
  --identity "Apple Distribution: <名字> (<TEAMID>)" \
  --profile ".nsh/signing/StoatMD App Store.mobileprovision" --build <构建号>
asc builds upload --app 6829230372 --ipa .nsh/testflight/StoatMD.ipa --pretty
```

iOS 只内置公开的 Google iOS client id 与 Dropbox app key，token 存 iCloud 钥匙串。
