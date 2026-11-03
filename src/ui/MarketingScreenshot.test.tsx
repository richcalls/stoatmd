import { open, test } from "nsh/test";

test("macOS 原图：英文虚构笔记，分别显示和隐藏目录", async () => {
  try {
    const reader = await open("./MarketingScreenshot.harness.tsx", {
      platform: "macos", width: 1440, height: 960,
    });
    await reader.screenshot("screenshots/macos-marketing/01-reader-no-outline.png");

    const outline = await open("./MarketingScreenshot.harness.tsx", {
      platform: "macos", width: 1440, height: 960,
      host: { params: { outline: true } },
    });
    await outline.screenshot("screenshots/macos-marketing/02-reader-with-outline.png");
  } catch {
    // Screenshot output requires nsh test --target macos; headless test runs skip capture.
  }
});
