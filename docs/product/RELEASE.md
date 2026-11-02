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

打包默认 `purchaseRequired=false`（本机与云盘同步免费）。需要保留付费墙时加
`--purchase-required`。用户自己的 `sync.json` 里显式写了 `purchaseRequired` 时以用户为准。

### 发布前检查

- Google Cloud Console：OAuth 客户端类型是 **Desktop app**，项目处于 Production；
  `drive` 属于 restricted scope，公开分发需要完成 Google 验证（必要时 CASA）。
- 配额与错误率告警已开启；准备好客户端停用 / 用户重新授权的流程。
- 授权链路保持系统浏览器 + 随机 loopback 端口 + S256 PKCE + `state`；token 只进系统钥匙串。
- 确认待发布的 DMG 由当前提交构建：发布前重新跑脚本，不要复用旧产物。

## iOS（App Store / TestFlight）

```sh
python3 scripts/ios_release.py \
  --identity "Apple Distribution: <名字> (<TEAMID>)" \
  --profile ".nsh/signing/StoatMD App Store.mobileprovision" --build <构建号>
asc builds upload --app 6829230372 --ipa .nsh/testflight/StoatMD.ipa --pretty
```

iOS 只内置公开的 Google iOS client id 与 Dropbox app key，token 存 iCloud 钥匙串。
