# Apple CI Runner（iOS / macOS）

这台 Mac 专门跑 iOS / macOS 构建。Windows 和 Linux 构建继续走已有的
Windows + WSL2 自托管 runner，不要把本机加进那组，也不要在本机跑 Docker
Linux 容器。

## 为什么必须是原生 macOS runner

`bestony/self-hosted-action-runner` 这类 Docker runner 在 macOS 上运行的是
Linux 虚拟机，容器里没有 Xcode、`codesign`、`notarytool`、`hdiutil`，
**不能产出 iOS / macOS 包**。所以本机用官方 `actions/runner` 原生安装，
LaunchAgent 常驻。

## 当前 runner

| 项 | 值 |
|----|----|
| 组织 | `richcalls` |
| 名称 | `apple-ci` |
| Runner group | `Apple CI` |
| 标签 | `self-hosted`, `macOS`, `ARM64`, `apple-ci`, `xcode-27` |
| 工作目录 | `~/actions-runner/_work` |
| 可用范围 | 只允许 private 仓库；不加入公开仓库 |

workflow 里这样选：

```yaml
runs-on: [self-hosted, macOS, ARM64, apple-ci]
```

`self-hosted` / `macOS` / `ARM64` 是 GitHub 自动标签；`apple-ci` 和
`xcode-27` 是本机自定义标签。

## 一次性安装（组织级）

需要组织 owner 权限，并且 `gh` token 带 `admin:org`：

```sh
gh auth refresh -h github.com -s admin:org
```

先在组织里建一个 runner group（只允许 private 仓库，禁止公开仓库）：

```sh
gh api -X POST orgs/richcalls/actions/runner-groups \
  -f name='Apple CI' \
  -f visibility='all' \
  -F allows_public_repositories=false
```

`visibility=all` + `allows_public_repositories=false` 的实际效果是：组织内
private 仓库可用，公开仓库被排除。如果只想给固定几个仓库用，改成
`-f visibility='selected'` 并传 `selected_repository_ids`。

然后在本机安装并注册：

```sh
RUNNER_VERSION=2.338.2
mkdir -p ~/actions-runner
cd ~/actions-runner
curl -fLO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz"
tar xzf "actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz"
TOKEN=$(gh api -X POST orgs/richcalls/actions/runners/registration-token --jq .token)
./config.sh --url https://github.com/richcalls --token "$TOKEN" \
  --name apple-ci --labels "apple-ci,xcode-27" --work _work \
  --runnergroup "Apple CI" --unattended
unset TOKEN
./svc.sh install
./svc.sh start
./svc.sh status
```

- **不要加 `sudo`**。非 root 的 `svc.sh install` 会装成当前用户的
  LaunchAgent，才能访问登录钥匙串里的证书；用 sudo 会变成 LaunchDaemon，
  签名会失败。
- 组织级注册后，仓库的 Settings → Actions → Runners 里不再有本机；
  在 Organization Settings → Actions → Runners 查看。

### 如果之前注册成了 repo-level

先停服务并移除旧注册，再用组织 URL 重新注册：

```sh
cd ~/actions-runner
./svc.sh stop
./svc.sh uninstall
REMOVE_TOKEN=$(gh api -X POST repos/richcalls/stoatmd/actions/runners/remove-token --jq .token)
./config.sh remove --token "$REMOVE_TOKEN"
unset REMOVE_TOKEN
# 然后按上一节的组织级命令重新 config.sh / svc.sh install / start
```

## 本机依赖

- Xcode（当前 27.1）与 Command Line Tools：`xcodebuild -version`、
  `xcode-select -p`
- 登录钥匙串里有：
  - `Developer ID Application`（macOS 公证分发）
  - `Apple Distribution`（iOS App Store / TestFlight，如需要）
- `asc` 已配置：`~/.asc/config.json`（App Store Connect API Key）
- `nsh` 0.3.0 在 `~/.local/bin/nsh`
- `gh` 在 `/opt/homebrew/bin/gh`
- 构建缓存与公证临时文件至少预留 30–40GB

## 钥匙串授权（codesign 不弹窗）

检查 `~/Library/LaunchAgents/actions.runner.richcalls.apple-ci.plist`：
`SessionCreate=true` 会为 runner 创建独立安全会话。若本机终端签名成功、
CI 中报 `errSecInternalComponent`，删除该配置项，让 LaunchAgent 复用登录会话：

```sh
cp ~/Library/LaunchAgents/actions.runner.richcalls.apple-ci.plist \
  ~/Library/LaunchAgents/actions.runner.richcalls.apple-ci.plist.backup
/usr/libexec/PlistBuddy -c 'Delete :SessionCreate' \
  ~/Library/LaunchAgents/actions.runner.richcalls.apple-ci.plist
cd ~/actions-runner
./svc.sh stop
./svc.sh start
```

重新安装 runner 服务后，检查安装脚本是否重新添加了该配置项。

第一次手动签名时点过“始终允许”通常已经可用。若 CI 里 `codesign` 卡住或报
钥匙串错误，在 Mac 上手动执行一次。密码只输入到本地终端，不要写进仓库或
Secret：

```sh
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: -s -k '<登录钥匙串密码>' \
  ~/Library/Keychains/login.keychain-db
```

iOS 还需要对应项目的 provisioning profile；可以手动装到
`~/Library/MobileDevice/Provisioning Profiles/`，或者由各项目的 workflow
用 `asc` 管理。

## 机器状态

- Mac 必须保持登录，LaunchAgent 才会运行；注销或重启后需要重新登录。
- 不要睡眠：接电源时执行 `sudo pmset -a sleep 0 disksleep 0`，或用
  `caffeinate`。
- 本机是 iOS / macOS 专用，不要接 Linux / Windows 任务，也不要在这里跑
  Docker Linux 容器。

## 安全边界

- Runner group 只对 private 仓库开放；**不要把 `richcalls/stoatmd-community`
  这类公开仓库加进去**，公开仓库的 workflow 能直接在你的 Mac 上执行代码。
- 自托管 runner 上的发布 workflow 不要监听 `pull_request`；只给 tag push
  和手动触发。能推 `v*` tag 的人就能触发签名和发布，用 tag protection /
  ruleset 限制。
- 如果以后多人协作，给 runner 单独建一个 macOS 用户账号，把证书、
  `~/.asc`、`gh` 凭据只放在该账号下。
- 定期检查 Organization Settings → Actions → Runners 里的 runner group
  可见范围。

## 常见问题

- runner offline：`cd ~/actions-runner && ./svc.sh status`，
  看 `~/actions-runner/_diag/Runner_*.log`；确认用户已登录、Mac 未睡眠。
- `codesign` 挂住/失败：先做钥匙串授权；确认
  `security find-identity -v -p codesigning` 能看到对应证书。
- `asc` 认证失败：`asc auth status`；确认 runner 用户 HOME 下有
  `~/.asc/config.json`，workflow 里 `ASC_BYPASS_KEYCHAIN=1`。
- `nsh: command not found`：workflow 会把 `$HOME/.local/bin`、
  `/opt/homebrew/bin` 注入 PATH；确认工具装在这些目录。
- 空间不足：`df -h /`、
  `du -sh target .nsh ~/Library/Developer/Xcode/DerivedData`。
- 组织级注册报 403：`gh auth refresh -h github.com -s admin:org`。
