import { expect, open, test } from "nsh/test";

test("模式切换：点击仅预览后状态变为 preview", async () => {
  const app = await open("./ModeSwitch.harness.tsx");
  expect(app.shows("id:mode-switch")).toBe(true);
  expect(app.texts()).toContain("split");

  await app.press("id:mode-preview");
  expect(app.texts()).toContain("preview");

  await app.press("id:mode-edit");
  expect(app.texts()).toContain("edit");

  await app.press("id:mode-split");
  expect(app.texts()).toContain("split");
});
