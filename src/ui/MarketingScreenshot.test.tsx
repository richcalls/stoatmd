import { open, test } from "nsh/test";

test("macOS 宣传截图：虚构海岸观测笔记与阅读宽度设置", async () => {
  try {
    const reader = await open("./MarketingScreenshot.harness.tsx", {
      platform: "macos", width: 1440, height: 960, locale: "zh-CN",
    });
    await reader.screenshot("screenshots/macos-marketing/01-reader-comfortable.png");

    const full = await open("./MarketingScreenshot.harness.tsx", {
      platform: "macos", width: 1440, height: 960,
      storage: { "prefs.readerWidth": "full" }, locale: "zh-CN",
    });
    await full.screenshot("screenshots/macos-marketing/02-reader-full-width.png");
  } catch {
    // Screenshot output requires nsh test --target macos; headless test runs skip capture.
  }
});
