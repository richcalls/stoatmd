import { expect, open, test } from "nsh/test";

const phone = { platform: "ios" as const, width: 440, height: 956, locale: "zh-CN", safeArea: { top: 62, right: 0, bottom: 34, left: 0 } };

test("iOS 当前界面截图", async () => {
  const app = await open("./Screenshot.harness.tsx", phone);
  // 只在真机/模拟器上跑：无头引擎画不出图，原生 TabBar 也没有 testID。
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-开始使用.md");
  await app.screenshot("screenshots/ios-raw/01-library-paper.png");

  await app.scroll("id:mobile-library-list", 320);
  await new Promise(resolve => setTimeout(resolve, 250));
  await app.screenshot("screenshots/ios-raw/01b-library-scrolled.png");
  await app.scroll("id:mobile-library-list", -320);
  await new Promise(resolve => setTimeout(resolve, 250));

  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  await app.screenshot("screenshots/ios-raw/02-reader.png");

  await app.press("id:mobile-edit");
  await app.waitFor("id:mobile-source");
  await app.screenshot("screenshots/ios-raw/03-editor.png");

  await app.press("id:mobile-read");
  await app.waitFor("id:mobile-preview");
  await app.press("id:mobile-outline");
  await app.waitFor("id:mobile-panel-done");
  await app.screenshot("screenshots/ios-raw/04-outline.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-preview");
  await app.back();
  await app.waitFor("id:mobile-search");

  await app.paste("id:mobile-search", { text: "写作" });
  await app.waitUntil(() => app.shows("id:mobile-note-想法/写作.md"));
  await app.screenshot("screenshots/ios-raw/05-search.png");
  await app.press("id:mobile-search-clear");
  await app.waitFor("id:mobile-note-开始使用.md");

  await app.press("id:mobile-settings");
  await app.waitFor("id:mobile-theme-paper");
  await app.screenshot("screenshots/ios-raw/06-settings-light.png");

  await app.press("id:mobile-theme-nord");
  await new Promise(resolve => setTimeout(resolve, 350));
  await app.screenshot("screenshots/ios-raw/07-settings-dark.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-search");
  await app.screenshot("screenshots/ios-raw/08-library-dark.png");

  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  await app.screenshot("screenshots/ios-raw/09-reader-dark.png");
  await app.press("id:mobile-edit");
  await app.waitFor("id:mobile-source");
  await app.screenshot("screenshots/ios-raw/10-editor-dark.png");

  expect(app.shows("id:mobile-source")).toBe(true);
}, 120_000);

test("iOS 首启连接云盘截图", async () => {
  const app = await open("./Connect.harness.tsx", phone);
  try { await app.screenshot(); } catch { return; }
  await new Promise(resolve => setTimeout(resolve, 600));
  await app.screenshot("screenshots/ios-raw/13-connect.png");
}, 60_000);

test("iOS 全部 Tab 与文件夹截图", async () => {
  const app = await open("./ScreenshotAll.harness.tsx", phone);
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-folder-工作");
  await app.press("id:mobile-folder-工作");
  await app.waitFor("id:mobile-note-工作/项目计划.md");
  await app.screenshot("screenshots/ios-raw/11-folder.png");

  await app.press("id:mobile-note-工作/项目计划.md");
  await app.waitFor("id:mobile-preview");
  await app.screenshot("screenshots/ios-raw/12-reader-code.png");
}, 120_000);
