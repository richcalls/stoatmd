import { expect, test } from "nsh/test";
import { openApp } from "./testOpen";
import { THEMES, themePreset } from "../ui/theme";

const lightTheme = themePreset("merino-light").palette;
const phone = { platform: "ios" as const, width: 390, height: 844, locale: "zh-CN", safeArea: { top: 47, right: 0, bottom: 34, left: 0 } };

test("iPhone: create a folder and note, save Chinese text, read, rename and duplicate", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.press("id:mobile-new-folder");
  await app.waitFor("id:mobile-name");
  await app.paste("id:mobile-name", { text: "想法" });
  await app.submit("id:mobile-name");
  await app.press("id:mobile-name-confirm");
  await app.waitFor("id:mobile-folder-想法");
  await app.press("id:mobile-folder-想法");
  await app.press("id:mobile-new-note");
  await app.waitFor("id:mobile-source");
  await app.paste("id:mobile-source", { text: "# 我的笔记\n\n记录第一天。\n\n## 下一步\n\n继续写作。" });
  await app.waitUntil(() => app.texts().includes("已保存"));

  // 编辑态查找：⌘F 起查找，命中后选中源码里的文字。
  await app.keyboard.press("mod+f");
  await app.waitFor("id:mobile-find-input");
  await app.paste("id:mobile-find-input", { text: "下一步" });
  await new Promise(resolve => setTimeout(resolve, 200));
  expect(app.texts()).toContain("1 / 1");
  await app.keyboard.press("escape");
  await new Promise(resolve => setTimeout(resolve, 200));
  expect(app.shows("id:mobile-find")).toBe(false);
  expect(app.shows("id:mobile-source")).toBe(true);

  await app.press("id:mobile-read");
  expect(app.shows("id:mobile-preview")).toBe(true);
  expect(app.shows("text:记录第一天。")).toBe(true);
  await app.press("id:mobile-outline");
  expect(app.shows("text:下一步")).toBe(true);
  await app.press("id:mobile-panel-done");
  await app.press("id:mobile-actions");
  await app.press("id:mobile-rename");
  await app.waitFor("id:mobile-name");
  await app.clear("id:mobile-name");
  await app.paste("id:mobile-name", { text: "第一天" });
  await app.submit("id:mobile-name");
  await app.press("id:mobile-name-confirm");
  await app.waitUntil(() => !app.shows("id:mobile-name"));
  await app.press("id:mobile-actions");
  expect(app.shows("text:想法/第一天.md")).toBe(true);
  await app.press("id:mobile-duplicate");
  await app.waitUntil(() => !app.shows("id:mobile-duplicate"));
  await app.press("id:mobile-edit");
  expect(app.value("id:mobile-source")).toBe("# 我的笔记\n\n记录第一天。\n\n## 下一步\n\n继续写作。");
  await app.back();
  await app.waitFor("id:mobile-search");
  await app.paste("id:mobile-search", { text: "记录第一天" });
  await app.submit("id:mobile-search");
  await app.waitFor("id:mobile-note-想法/第一天.md");
  await app.press("id:mobile-note-想法/第一天.md");
  await app.waitFor("id:mobile-preview");
  expect(app.shows("text:记录第一天。")).toBe(true);
}, 120_000);

test("iPhone: theme, icon, language and font settings persist after restarting", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.press("id:mobile-settings");
  await app.press("id:mobile-theme-toggle");
  expect(app.shows("text:浅色")).toBe(true);
  expect(app.shows("text:深色")).toBe(true);
  for (const theme of THEMES) expect(app.shows(`id:mobile-theme-${theme.id}`)).toBe(true);
  await app.press("id:mobile-theme-silver-point-dark");
  await app.press("id:mobile-theme-toggle");
  await app.press("id:mobile-icon-toggle");
  await app.press("id:mobile-icon-agile");
  await app.waitUntil(() => app.storage()["prefs.appLogo"] === "agile");
  await app.press("id:mobile-render-monochrome");
  await app.press("id:mobile-text-row");
  await app.press("id:settings.font.reading-increase");
  await app.press("id:settings.font.lineHeight-increase");
  await app.press("id:mobile-language-toggle");
  await app.press("id:mobile-language-en");
  await app.waitUntil(() => app.storage()["prefs.locale"] === "en" && app.storage()["prefs.theme"] === "silver-point-dark" && app.storage()["prefs.renderMode"] === "monochrome" && app.storage()["prefs.fontSize"] === "17" && app.storage()["prefs.fontLineHeight"] === "1.6");
  const again = await openApp("./MobileShell.harness.tsx", { ...phone, storage: app.storage() });
  await again.press("id:mobile-settings");
  expect(again.shows("text:Settings")).toBe(true);
  expect(again.shows("text:Kami · 17 / 1.60")).toBe(true);
  expect(again.storage()["prefs.theme"]).toBe("silver-point-dark");
  expect(again.shows("text:Agile Silhouette")).toBe(true);
  expect(again.storage()["prefs.appLogo"]).toBe("agile");
  // 重启后文稿配色仍是单色：选中的分段和未选中的颜色不同。
  expect(again.shows("id:mobile-render-mode")).toBe(true);
  expect(again.spanStyle("id:mobile-render-monochrome >> text:Monochrome").color)
    .not.toBe(again.spanStyle("id:mobile-render-color >> text:Color").color);
});

test("iPhone: 左滑笔记露出删除按钮，删进最近删除还能恢复", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.press("id:mobile-new-note");
  await app.waitFor("id:mobile-source");
  await app.paste("id:mobile-source", { text: "会被滑走" });
  await app.waitUntil(() => app.texts().includes("已保存"));
  await app.back();
  await app.waitFor("id:mobile-note-untitled.md");

  // 横向左滑：纵向仍归滚动视图，横向超过阈值才露出删除。
  await app.drag("id:mobile-note-untitled.md", { x: -120 });
  await app.waitFor("id:mobile-swipe-delete-untitled.md");
  await app.press("id:mobile-swipe-delete-untitled.md");
  await app.waitUntil(() => !app.shows("id:mobile-note-untitled.md"), { timeout: 8000 });

  // 删除是可恢复的：最近删除里能拿回来。
  await app.press("id:mobile-settings");
  await app.press("id:mobile-trash");
  await app.waitFor("id:mobile-restore-untitled.md");
  await app.press("id:mobile-restore-untitled.md");
  await app.waitUntil(() => !app.shows("id:mobile-restore-untitled.md"), { timeout: 8000 });
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-note-untitled.md");
}, 120_000);

test("iPhone: move, recycle, restore and permanently delete a note", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.press("id:mobile-new-folder");
  await app.waitFor("id:mobile-name");
  await app.paste("id:mobile-name", { text: "Archive" });
  await app.submit("id:mobile-name");
  await app.press("id:mobile-name-confirm");
  await app.waitFor("id:mobile-folder-Archive");
  await app.press("id:mobile-new-note");
  await app.waitFor("id:mobile-source");
  await app.paste("id:mobile-source", { text: "Preserved through trash" });
  await app.waitUntil(() => app.texts().includes("已保存"));
  await app.press("id:mobile-actions");
  await app.press("id:mobile-move");
  await app.press("id:mobile-move-to-Archive");
  await app.waitUntil(() => !app.shows("id:mobile-move-to-Archive"));
  await app.press("id:mobile-actions");
  await app.press("id:mobile-recycle");
  await app.waitFor("id:mobile-settings");
  await app.wait(700);
  await app.press("id:mobile-settings");
  await app.waitFor("id:mobile-trash");
  await app.press("id:mobile-trash");
  await app.waitFor("text:恢复");
  await app.press("text:恢复");
  await app.waitFor("text:最近删除为空");
  await app.press("id:mobile-panel-done");
  await app.press("id:mobile-folder-Archive");
  await app.waitFor("id:mobile-note-Archive/untitled.md");
  await app.press("id:mobile-note-Archive/untitled.md");
  await app.waitFor("id:mobile-preview");
  expect(app.shows("text:Preserved through trash")).toBe(true);
  await app.press("id:mobile-actions");
  await app.press("id:mobile-recycle");
  await app.waitFor("id:mobile-settings");
  await app.wait(700);
  await app.press("id:mobile-settings");
  await app.waitFor("id:mobile-trash");
  await app.press("id:mobile-trash");
  await app.waitFor("text:永久删除");
  await app.press("text:永久删除");
  await app.press("id:mobile-erase-confirm");
  await app.waitFor("text:最近删除为空");
}, 120_000);

test("iPhone: 库页三 Tab、文件树、搜索与阅读底栏工作", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.waitFor("id:mobile-tab-recent");
  expect(app.shows("text:还没有笔记")).toBe(true);
  // 选中 tab 的文字颜色要跟着切换（曾经因为把 active 算成常量而不刷新）。
  expect(app.spanStyle("id:mobile-tab-recent >> text:最近").color).toBe(`${lightTheme.ink.toLowerCase()}ff`);
  expect(app.spanStyle("id:mobile-tab-all >> text:全部").color).toBe(`${lightTheme.ink3.toLowerCase()}ff`);

  await app.press("id:mobile-new-folder");
  await app.waitFor("id:mobile-name");
  await app.paste("id:mobile-name", { text: "随笔" });
  await app.submit("id:mobile-name");
  await app.press("id:mobile-name-confirm");
  await app.waitFor("id:mobile-folder-随笔");
  await app.press("id:mobile-folder-随笔");
  await app.press("id:mobile-new-note");
  await app.waitFor("id:mobile-source");
  await app.paste("id:mobile-source", { text: "# 写作的框架\n\n好的文章是结构的展开。" });
  await app.waitUntil(() => app.texts().includes("已保存"));
  await app.back();
  await app.waitFor("id:mobile-note-随笔/untitled.md");

  await app.press("id:mobile-tab-favorites");
  await app.waitFor("id:mobile-favorites-empty");
  expect(app.texts().includes("还没有收藏的笔记")).toBe(true);
  expect(app.spanStyle("id:mobile-tab-favorites >> text:收藏").color).toBe(`${lightTheme.ink.toLowerCase()}ff`);
  expect(app.spanStyle("id:mobile-tab-recent >> text:最近").color).toBe(`${lightTheme.ink3.toLowerCase()}ff`);
  expect(app.shows("id:mobile-note-随笔/untitled.md")).toBe(false);

  await app.press("id:mobile-tab-all");
  await app.waitFor("id:mobile-note-随笔/untitled.md");
  await app.paste("id:mobile-search", { text: "写作的框架" });
  await app.submit("id:mobile-search");
  await app.waitFor("id:mobile-search-meta");
  await app.waitFor("id:mobile-note-随笔/untitled.md");

  await app.press("id:mobile-note-随笔/untitled.md");
  await app.waitFor("id:mobile-preview");
  expect(app.shows("id:mobile-outline")).toBe(true);
  expect(app.shows("id:mobile-word-count")).toBe(true);
  expect(app.shows("id:mobile-type")).toBe(true);
  // 正文内查找：按块计数，命中后能上下跳。
  await app.press("id:mobile-find-open");
  await app.waitFor("id:mobile-find-input");
  await app.paste("id:mobile-find-input", { text: "文章" });
  await new Promise(resolve => setTimeout(resolve, 200));
  expect(app.texts()).toContain("1 / 1");
  await app.press("id:mobile-find-close");
  expect(app.shows("id:mobile-find")).toBe(false);

  // 笔记信息：字数、阅读时间、段落、标题与文件时间。
  await app.press("id:mobile-actions");
  await app.waitFor("id:mobile-info");
  await app.press("id:mobile-info");
  await new Promise(resolve => setTimeout(resolve, 200));
  expect(app.texts()).toContain("字符数");
  expect(app.texts()).toContain("段落");
  expect(app.texts()).toContain("随笔/untitled.md");
  await app.press("id:mobile-panel-done");

  await app.press("id:mobile-edit");
  await app.waitFor("id:mobile-source");
  expect(app.shows("id:mobile-read")).toBe(true);
  expect(app.shows("id:mobile-save-status")).toBe(true);
}, 120_000);

test("iPhone: 收藏的笔记出现在收藏 Tab，还能取消收藏", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.press("id:mobile-new-note");
  await app.waitFor("id:mobile-source");
  await app.paste("id:mobile-source", { text: "# 常看的笔记\n\n收藏成一条。" });
  await app.waitUntil(() => app.texts().includes("已保存"));
  await app.press("id:mobile-read");
  await app.waitFor("id:mobile-preview");
  await app.press("id:mobile-actions");
  await app.waitFor("id:mobile-favorite");
  await app.press("id:mobile-favorite");
  expect(app.texts()).toContain("取消收藏");
  expect(app.storage()["prefs.favorites"]).toContain("untitled.md");
  await app.press("id:mobile-panel-done");
  await app.back();
  await app.waitFor("id:mobile-search");
  await app.press("id:mobile-tab-favorites");
  await app.waitFor("id:mobile-note-untitled.md");

  // 打开收藏的笔记，取消收藏后收藏 Tab 回到空状态。
  await app.press("id:mobile-note-untitled.md");
  await app.waitFor("id:mobile-preview");
  await app.press("id:mobile-actions");
  await app.waitFor("id:mobile-favorite");
  expect(app.texts()).toContain("取消收藏");
  await app.press("id:mobile-favorite");
  await app.press("id:mobile-panel-done");
  await app.back();
  await app.waitFor("id:mobile-favorites-empty");
}, 120_000);

test("iPhone 搜索框：输入后按 Esc 清空内容（Obsidian 习惯）", async () => {
  const app = await openApp("./MobileShell.harness.tsx", phone);
  await app.waitFor("id:mobile-search");
  await app.paste("id:mobile-search", { text: "写作" });
  expect(app.value("id:mobile-search")).toBe("写作");
  await app.keyboard.press("escape");
  expect(app.value("id:mobile-search")).toBe("");
});
