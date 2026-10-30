import { expect, open, test } from "nsh/test";

const options = { width: 900, height: 600, locale: "zh-CN", platform: "macos" as const };

test("窗口栏：居中标题仅显示当前笔记，标题为 14/500", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  expect(app.shows("text:带娃笔记")).toBe(false);
  expect(app.shows("text:写作的框架")).toBe(true);
  const title = app.spanStyle("text:写作的框架");
  expect(title.fontSize).toBe(14);
  expect(title.fontWeight).toBe(500);
  expect(app.shows("id:toolbar-sidebar")).toBe(true);
  expect(app.shows("id:mode-switch")).toBe(true);
});

test("窗口栏：移入顶部后可连续展开与收起文件树", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.hover("id:window-bar");
  await app.press("id:toolbar-sidebar");
  expect(app.texts()).toContain("1");
  expect(app.shows("id:toolbar-sidebar")).toBe(true);
  await app.press("id:toolbar-sidebar");
  expect(app.texts()).toContain("2");
});

test("窗口栏：模式按钮切换源码/分栏/阅读", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.hover("id:window-bar");
  await app.press("id:mode-edit");
  expect(app.texts()).toContain("edit");
  await app.press("id:mode-preview");
  expect(app.texts()).toContain("preview");
  await app.press("id:mode-split");
  expect(app.texts()).toContain("split");
});

test("窗口栏：离开后再次移入可操作，收起侧栏与窄窗保持标题", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.hover("id:window-bar");
  await app.press("id:toolbar-sidebar");
  await app.hover("id:current-mode");
  await app.setViewport(480, 500);
  expect(app.shows("text:写作的框架")).toBe(true);
  await app.hover("id:window-bar");
  await app.press("id:mode-preview");
  expect(app.texts()).toContain("preview");
  await app.press("id:toolbar-sidebar");
  expect(app.texts()).toContain("2");
});

test("窗口栏：没有库时不出现文件树开关与模式按钮", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.press("id:no-vault");
  expect(app.shows("id:toolbar-sidebar")).toBe(false);
  expect(app.shows("id:mode-switch")).toBe(false);
});
