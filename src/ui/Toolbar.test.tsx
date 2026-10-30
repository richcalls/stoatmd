import { expect, open, test } from "nsh/test";

const options = { width: 900, height: 600, locale: "zh-CN", platform: "macos" as const };

test("窗口栏：面包屑显示库名与笔记标题，标题为 13/600", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  expect(app.shows("text:带娃笔记")).toBe(true);
  expect(app.shows("text:写作的框架")).toBe(true);
  const title = app.spanStyle("text:写作的框架");
  expect(title.fontSize).toBe(13);
  expect(title.fontWeight).toBeGreaterThanOrEqual(600);
  expect(app.shows("id:toolbar-sidebar")).toBe(true);
  expect(app.shows("id:mode-switch")).toBe(true);
});

test("窗口栏：文件树开关常驻，点按切换并计数", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.press("id:toolbar-sidebar");
  expect(app.texts()).toContain("1");
  // 收起后开关仍在（顶栏不再依赖悬停）
  expect(app.shows("id:toolbar-sidebar")).toBe(true);
  await app.press("id:toolbar-sidebar");
  expect(app.texts()).toContain("2");
});

test("窗口栏：模式按钮切换源码/分栏/阅读", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.press("id:mode-edit");
  expect(app.texts()).toContain("edit");
  await app.press("id:mode-preview");
  expect(app.texts()).toContain("preview");
  await app.press("id:mode-split");
  expect(app.texts()).toContain("split");
});

test("窗口栏：没有库时不出现文件树开关与模式按钮", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.press("id:no-vault");
  expect(app.shows("id:toolbar-sidebar")).toBe(false);
  expect(app.shows("id:mode-switch")).toBe(false);
});
