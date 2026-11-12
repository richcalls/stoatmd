# macOS CI（GitHub 托管）

仓库是公开仓库，CI 统一使用 GitHub 托管的 runner，不再使用自托管 Apple CI。

| 用途 | Workflow | Runner |
|------|----------|--------|
| macOS 打包 / 签名 / 公证 / 发布 | `macos-release.yml` | `macos-latest`（Apple Silicon） |
| 环境自检 | `macos-ci-smoke.yml` | `macos-latest` |
| 官网构建与发布 | `website-pages.yml` | `ubuntu-latest` |
| Windows / Linux 桌面包 | `desktop-release.yml` | `windows-latest` / `ubuntu-24.04` |

`nsh` 由 workflow 用安装脚本固定到 `v0.5.0`，不依赖 runner 预装。macOS 发版 job
会在临时钥匙串里导入 Developer ID 证书，并把 asc 凭据写到 `~/.asc/config.json`；
runner 是一次性的，job 结束即销毁。

## macOS 发布所需的 Secrets

配置位置：仓库 Settings → Secrets and variables → Actions。

| Secret | 用途 | 必填 | 怎么生成 | 生效方式 / 轮换影响 |
|--------|------|------|----------|----------------------|
| `MACOS_CERT_P12` | Developer ID Application 证书与私钥（base64 P12），job 内导入临时钥匙串给 `codesign` 用 | 是 | 在有证书的 Mac 上：`security export -t identities -f pkcs12 -k ~/Library/Keychains/login.keychain-db -P '<导出密码>' -o ~/DeveloperID.p12`，再 `base64 -i ~/DeveloperID.p12 \| pbcopy`，粘进 secret | 下一次发版生效；证书续期后重新导出并更新，旧安装包签名不受影响 |
| `MACOS_CERT_PASSWORD` | 上面 P12 的导出密码 | 是 | 执行 `security export -P` 时自己设定 | 与 `MACOS_CERT_P12` 同时更新；旧构建需重跑 |
| `ASC_KEY_ID` | App Store Connect API Key ID，`asc` 公证用 | 是 | App Store Connect → Users and Access → Integrations → App Store Connect API → 生成 Key | 下一次发版生效；轮换时与下面两项一起更新，并在 App Store Connect 吊销旧 Key |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID | 是 | 同一页面的 Issuer ID | 随 Key 轮换一起更新 |
| `ASC_PRIVATE_KEY` | API Key 的 `.p8` 私钥全文（只可下载一次） | 是 | 生成 Key 时下载 `AuthKey_<KEY_ID>.p8`，`gh secret set ASC_PRIVATE_KEY -R richcalls/stoatmd < AuthKey_<KEY_ID>.p8` | 下一次发版生效；轮换后吊销旧 Key，旧安装包不受影响 |
| `STOATMD_COMMUNITY_TOKEN` | 发布到 `richcalls/stoatmd-community` 的 fine-grained PAT（Contents: Read and write） | 发布时必填 | GitHub Settings → Developer settings → Fine-grained tokens | 下一次发版生效；轮换后立即吊销旧 token |
| `STOATMD_GOOGLE_CLIENT_ID` / `STOATMD_GOOGLE_CLIENT_SECRET` / `STOATMD_DROPBOX_APP_KEY` | 构建时嵌入的 OAuth 凭据 | 是 | 见 `docs/product/RELEASE.md` | 更新后必须重新打包；旧安装包仍带旧凭据 |

可选仓库 Variable：`MACOS_SIGNING_IDENTITY`。证书里有多张 Developer ID 时用它
指定签名身份；不设置则取钥匙串里第一张 `Developer ID Application`。

## 发版流程

1. 创建并推送版本 tag（`v*`）。
2. Actions → **macOS · Release** → Run workflow，填 tag；`publish=false` 只构建。
3. 第一次迁移后先跑 Actions → **macOS · CI Smoke Test** 确认 GitHub 托管环境。

## 自托管 Apple CI 退役

原组织级 `apple-ci` runner 已不再被任何 workflow 使用。清理步骤（在该 Mac 上执行）：

```sh
launchctl bootout gui/$(id -u)/actions.runner.richcalls.apple-ci
cd ~/actions-runner
./config.sh remove --token <org runner token>
```

token 在 GitHub 组织 Settings → Actions → Runners → New runner 页面生成。
