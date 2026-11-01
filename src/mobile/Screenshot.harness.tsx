import { mount } from "nsh";
import { MobileShell } from "./MobileShell";
import { mobileLibrary } from "./library";
import { memoryVault } from "./testVault";
import { restoreLocale } from "../ui/i18n";
import { restoreRenderMode } from "../ui/documentAppearance";
import { restoreTheme } from "../ui/theme";
import { restoreTypography } from "../ui/typography";

const memory = memoryVault();
memory.files.clear();
const day = 86_400_000;
let stamp = Date.now();
const put = (path: string, content: string, ageDays: number) => {
  const mtimeMs = stamp - ageDays * day;
  memory.files.set(path, { content, mtimeMs, createdMs: mtimeMs });
};

put("开始使用.md", `# 欢迎使用 StoatMD

StoatMD 是一本专注书写的 Markdown 笔记应用。

## 三条原则

- **本地优先**：笔记随时可读
- **纯文本**：不锁定任何工具
- **专注写作**：界面退到背景

> 写作不是输出，而是思考的过程。

在设置里可以切换主题、字号和界面语言。`, 0);

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

put("工作/周报.md", `# 第 36 周

## 已完成

- 云盘目录选择
- 离线缓存与冲突提示
- 导入导出 Markdown

## 下周

继续打磨阅读视图的排版细节。`, 2);

memory.vault.ensureDir("想法");
put("想法/写作.md", `# 写作

写作是把模糊的念头变清楚的过程。

## 习惯

每天写三百字，不修改，只记录。

## 素材

- 通勤时看到的路牌
- 咖啡店里的一段对话
- 深夜突然想起的句子`, 3);

memory.vault.ensureDir("阅读");
put("阅读/设计系统.md", `# 设计系统

好的设计系统不是组件库，而是共识。

## 颜色

纸面、墨色与一线细边，构成安静的阅读空间。

## 字体

正文使用系统衬线字体，界面使用无衬线字体。`, 5);

memory.vault.ensureDir("随笔");
for (let index = 1; index <= 20; index += 1) {
  put(`随笔/随笔 ${index}.md`, `# 随笔 ${index}\n\n第 ${index} 篇随手记。`, 10 + index);
}

void Promise.all([restoreLocale(), restoreTheme(), restoreTypography(), restoreRenderMode()]).then(() => {
  mount(() => <MobileShell library={mobileLibrary(memory.vault)} settingsTap />);
});
