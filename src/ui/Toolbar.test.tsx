import { expect, open, test } from "nsh/test";

const options = { width: 900, height: 600, locale: "zh-CN", platform: "macos" as const };

test("工具条：左侧显示大号加粗的笔记标题", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  expect(app.shows("text:写作的框架")).toBe(true);
  const title = app.spanStyle("text:写作的框架");
  expect(title.fontSize).toBe(16);
  expect(title.fontWeight).toBeGreaterThanOrEqual(600);
  expect(app.shows("id:toolbar-sidebar")).toBe(false);
});

test("顶栏：悬停右侧才露出文件树开关，点按切换", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  expect(app.shows("id:titlebar-sidebar-zone")).toBe(true);
  expect(app.shows("id:toolbar-sidebar")).toBe(false);

  await app.hover("id:titlebar-sidebar-zone");
  expect(app.shows("id:toolbar-sidebar")).toBe(true);

  await app.press("id:toolbar-sidebar");
  expect(app.texts()).toContain("1");

  await app.hover("id:titlebar-center");
  expect(app.shows("id:toolbar-sidebar")).toBe(false);
});

test("顶栏：没有库时不出现悬停区", async () => {
  const app = await open("./Toolbar.harness.tsx", options);
  await app.press("id:no-vault");
  expect(app.shows("id:titlebar-sidebar-zone")).toBe(false);
  await app.hover("id:titlebar-center");
  expect(app.shows("id:toolbar-sidebar")).toBe(false);
});
