import { expect, test } from "nsh/test";
import { openApp } from "./testOpen";

// 阅读模式里的本地图片：正文相对路径要能解析到缓存库，并真的画出像素。
test("阅读模式显示本地图片", async () => {
  const app = await openApp("./ReaderImage.harness.tsx", { platform: "ios", width: 1194, height: 834, locale: "zh-CN" });
  // 只在模拟器/真机上跑：无头引擎没有真实图片解码。
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-日记/图片测试.md", { timeout: 5000 });
  await app.press("id:mobile-note-日记/图片测试.md");
  await app.waitFor("id:mobile-preview");
  await app.waitFor("label:红图", { timeout: 5000 });
  await app.screenshot("screenshots/ios-raw/reader-image.png");
  expect(app.shows("text:正文。")).toBe(true);
  // 附件还没同步到本机：显示占位文字，而不是一个永远加载失败的方框。
  await app.scroll("id:mobile-preview", 700);
  await app.waitFor("id:mobile-image-pending", { timeout: 5000 });
  await app.screenshot("screenshots/ios-raw/reader-image-pending.png");
});
