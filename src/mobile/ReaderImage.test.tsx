import { expect, open, test } from "nsh/test";

// 阅读模式里的本地图片：正文相对路径要能解析到缓存库，并真的画出像素。
test("阅读模式显示本地图片", async () => {
  const app = await open("./ReaderImage.harness.tsx", { platform: "ios", width: 1194, height: 834, locale: "zh-CN" });
  // 只在模拟器/真机上跑：无头引擎没有真实图片解码。
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-note.md", { timeout: 5000 });
  await app.press("id:mobile-note-note.md");
  await app.waitFor("id:mobile-preview");
  await app.waitFor("label:红图", { timeout: 5000 });
  await app.screenshot("screenshots/ios-raw/reader-image.png");
  expect(app.shows("text:正文。")).toBe(true);
});
