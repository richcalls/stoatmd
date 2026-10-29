import { expect, open, test } from "nsh/test";

const desktop = { width: 1280, height: 800 };

test("设置：点右上角关闭后 open 变为 false", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("open");
  expect(app.shows("id:settings-dialog")).toBe(true);

  await app.press("id:settings-close");
  expect(app.texts()).toContain("closed");
});

test("设置：点完成按钮关闭", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("open");

  await app.press("text:完成");
  expect(app.texts()).toContain("closed");
});
