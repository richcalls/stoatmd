import { Storage } from "nsh";
import { expect, test } from "nsh/test";
import { openApp } from "./testOpen";

const ACTIVE_KEY = "storage.active";

// iPad 首次进库、从云端下载笔记时应显示同步进度（回归：不能只剩一句「正在准备笔记本」）。
test("首次同步时库页显示进度条", async () => {
  try {
    const app = await openApp("./FirstSync.harness.tsx", { platform: "ios", width: 1194, height: 834, locale: "zh-CN" });
    // 只在真机/模拟器上跑：无头引擎里 TokenVault.isIos() 为 false，走不到跨设备恢复。
    try { await app.screenshot(); } catch { return; }
    await app.waitFor("id:mobile-library-page");
    await app.waitFor("id:mobile-sync-progress", { timeout: 8000 });
    expect(app.shows("id:mobile-sync-progress")).toBe(true);
    await app.screenshot("screenshots/ios-raw/first-sync-progress.png");
  } finally {
    await Storage.removeItem(ACTIVE_KEY);
  }
});
