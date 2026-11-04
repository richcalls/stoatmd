# 安全报告

涉及 OAuth 令牌、私有笔记泄露、路径沙箱、任意文件访问或代码执行的问题，请通过本仓库 GitHub Security 页的 **Report a vulnerability** 私下报告。维护者需在仓库设置中启用 Private vulnerability reporting。

该入口暂未启用时，请创建只包含“请求私密安全报告渠道”的 issue，由维护者提供私密联系路径后再提交详情。问题描述使用虚构笔记和脱敏日志，真实访问令牌、账号信息和私人笔记保留在本机。

报告请包含影响版本 / 提交、操作系统、复现步骤、预期影响与可用的修复建议。

## 凭据与构建

用户访问令牌由系统钥匙串保存。自编译使用自己的 OAuth 应用。Apple 签名材料、Cloudflare 令牌和 GitHub 发布令牌由维护者本机或受控私有构建环境管理。

公开 PR 使用 GitHub 托管 runner。组织自托管 Apple CI 通过私有仓库条件限制执行，runner group 同时保持只允许私有仓库。公开发布前，维护者需检查 Git 历史与 GitHub Secrets，并为曾泄露的凭据完成轮换。
