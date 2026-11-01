import { mount } from "nsh";
import { MobileShell } from "./MobileShell";
import { mobileLibrary } from "./library";
import { memoryVault } from "./testVault";
import { restoreLocale } from "../ui/i18n";
import { restoreRenderMode } from "../ui/documentAppearance";
import { restoreTheme } from "../ui/theme";
import { restoreTypography } from "../ui/typography";

// 直接落在编辑态：iOS 的「编辑 / 完成」是导航栏的系统项，测试点不到，
// 截编辑页只能从这个入口进（打开笔记后再挂载，MobileShell 保持默认的编辑态）。
const memory = memoryVault();
const stamp = Date.now();
const day = 86_400_000;
const put = (path: string, title: string, ageDays: number) => {
  const mtimeMs = stamp - ageDays * day;
  memory.files.set(path, { content: `# ${title}\n\n${title} 的第一行正文。`, mtimeMs, createdMs: mtimeMs });
};
put("开始使用.md", "欢迎使用 StoatMD", 0);
put("项目计划.md", "项目计划", 1);
put("周报.md", "第 36 周", 2);
put("写作.md", "写作", 3);

const library = mobileLibrary(memory.vault);

void Promise.all([restoreLocale(), restoreTheme(), restoreTypography(), restoreRenderMode()]).then(async () => {
  await library.refresh();
  await library.openNote("开始使用.md");
  mount(() => <MobileShell library={library} />);
});
