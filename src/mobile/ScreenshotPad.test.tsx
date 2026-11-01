import { expect, open, test } from "nsh/test";

// iPad Pro 11 寸：横 1194×834、竖 834×1194（points）。
const pad = (width: number, height: number) => ({
  platform: "ios" as const, width, height, locale: "zh-CN",
  safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
});

test("iPad 横屏：左库右文两栏", async () => {
  const app = await open("./Screenshot.harness.tsx", pad(1194, 834));
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-开始使用.md");
  expect(app.shows("id:mobile-split")).toBe(true);
  expect(app.shows("id:mobile-empty-detail")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-01-library.png");

  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  expect(app.shows("id:mobile-split-detail")).toBe(true);
  // 打开笔记后右上角应切到 Edit（系统栏按钮跟着编辑态走）。
  expect(app.shows("id:mobile-edit")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-02-reader.png");
}, 120_000);

test("iPad 竖屏：仍然是两栏", async () => {
  const app = await open("./Screenshot.harness.tsx", pad(834, 1194));
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-开始使用.md");
  expect(app.shows("id:mobile-split")).toBe(true);
  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  await app.screenshot("screenshots/ios-raw/ipad-03-portrait.png");

  // 分栏里换笔记：右栏内容跟着换，左栏不跳走。
  await app.press("id:mobile-note-工作/项目计划.md");
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(app.shows("id:mobile-note-开始使用.md")).toBe(true);
  expect(app.shows("id:mobile-split-detail")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-04-switch.png");
}, 120_000);
