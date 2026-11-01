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

  // 阅读页的「编辑 / 完成」是导航栏的系统项，测试按 id 点不到它
  // （系统项的最外层那个按钮只有 nsh 的槽位节点，没有原生视图），
  // 编辑态的截图改由 ScreenshotEditor.harness.tsx 直接落在编辑器里。
  await app.press("id:mobile-outline");
  await app.waitFor("id:mobile-panel-done");
  await app.screenshot("screenshots/ios-raw/04-outline.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-preview");

  await app.press("id:mobile-actions");
  await app.waitFor("id:mobile-rename");
  await app.screenshot("screenshots/ios-raw/04b-actions.png");
  await app.press("id:mobile-move");
  await app.waitFor("id:mobile-move-to-root");
  await app.screenshot("screenshots/ios-raw/04c-move.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-preview");
  await app.press("id:mobile-actions");
  await app.waitFor("id:mobile-rename");
  await app.press("id:mobile-rename");
  await app.waitFor("id:mobile-name");
  await app.screenshot("screenshots/ios-raw/04d-rename.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-preview");

  await app.back();
  await app.waitFor("id:mobile-search");
  await new Promise(resolve => setTimeout(resolve, 300));
  await app.screenshot("screenshots/ios-raw/01c-after-back.png");

  await app.paste("id:mobile-search", { text: "写作" });
  await app.waitUntil(() => app.shows("id:mobile-note-想法/写作.md"));
  await app.screenshot("screenshots/ios-raw/05-search.png");
  await app.press("id:mobile-search-clear");
  await app.waitFor("id:mobile-note-开始使用.md");

  await app.press("id:mobile-settings");
  await app.waitFor("id:mobile-theme-paper");
  await app.screenshot("screenshots/ios-raw/06-settings-light.png");

  await app.press("id:mobile-text-row");
  await app.waitFor("id:settings.font.reading-decrease");
  await app.screenshot("screenshots/ios-raw/06b-type.png");
  await app.press("id:mobile-text-row");

  await app.press("id:mobile-storage-row");
  await new Promise(resolve => setTimeout(resolve, 600));
  await app.screenshot("screenshots/ios-raw/06c-storage.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-search");
  await app.press("id:mobile-settings");
  await app.waitFor("id:mobile-trash");
  await app.press("id:mobile-trash");
  await new Promise(resolve => setTimeout(resolve, 500));
  await app.screenshot("screenshots/ios-raw/06d-trash.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-search");
  await app.press("id:mobile-settings");
  await app.waitFor("id:mobile-theme-paper");

  await app.press("id:mobile-theme-nord");
  await new Promise(resolve => setTimeout(resolve, 350));
  await app.screenshot("screenshots/ios-raw/07-settings-dark.png");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-search");
  await app.screenshot("screenshots/ios-raw/08-library-dark.png");

  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  await app.screenshot("screenshots/ios-raw/09-reader-dark.png");

  expect(app.shows("id:mobile-preview")).toBe(true);
}, 120_000);

test("iOS 编辑页截图", async () => {
  const app = await open("./ScreenshotEditor.harness.tsx", phone);
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-source");
  await app.screenshot("screenshots/ios-raw/03-editor.png");
}, 60_000);

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

test("iOS 收藏 Tab 截图", async () => {
  const app = await open("./ScreenshotFavorites.harness.tsx", phone);
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-favorites-soon");
  await app.screenshot("screenshots/ios-raw/11b-favorites.png");
}, 60_000);
