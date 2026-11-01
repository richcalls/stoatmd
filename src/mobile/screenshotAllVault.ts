import { memoryVault } from "./testVault";

/** 「全部」与「收藏」截图共用的示例库：一个文件夹、一篇带代码块的笔记。 */
export function screenshotAllVault() {
  const memory = memoryVault();
  memory.files.clear();
  const day = 86_400_000;
  const stamp = Date.now();
  const put = (path: string, content: string, ageDays: number) => {
    const mtimeMs = stamp - ageDays * day;
    memory.files.set(path, { content, mtimeMs, createdMs: mtimeMs });
  };

  memory.vault.ensureDir("工作");
  put("工作/项目计划.md", `# 项目计划

## 目标

在九月前完成 iOS 版本的云端同步。

## 本周

1. 完成 OAuth 授权流程
2. 验证双向同步
3. 修复冲突合并

\`\`\`swift
let vault = Vault.open(root)
\`\`\`

## 风险

- 网络不稳定时的重试策略
- 大文件同步的耗时`, 1);

  return memory;
}
