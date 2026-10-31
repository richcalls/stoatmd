import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const website = fileURLToPath(new URL("../", import.meta.url));
const locales = ["en", "zh-hans", "zh-hant", "ja", "ko", "de", "fr", "es"];

// Capture through CDP: the browser's fullPage wrapper can alter mobile metrics.
async function screenshot(page, path, fullPage = false) {
  const clip = await page.evaluate((full) => ({
    x: 0, y: 0, width: innerWidth,
    height: full ? document.documentElement.scrollHeight : innerHeight,
    scale: 1,
  }), fullPage);
  const { data } = await page.cdp('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true, clip,
  });
  await writeFile(path, Buffer.from(data, 'base64'));
}

/** Run inside ego-browser nodejs; pass the goal's existing TaskSpace. */
export async function capturePreviews(
  task,
  {
    origin = "http://localhost:4322",
    reviewDir = "/tmp/stoatmd-website-shots",
  } = {},
) {
  const page = task.page("p1");
  await mkdir(reviewDir, { recursive: true });
  const assets = join(website, "public/assets");
  await mkdir(assets, { recursive: true });
  for (const locale of locales) {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    // Explicit English preference keeps the root route stable during capture.
    await page.goto(`${origin}/zh-hans/`);
    await page.evaluate(() => {
      localStorage.setItem("stoatmd.langPref", "en");
      localStorage.setItem("stoatmd.langTouched", "1");
    });
    await page.goto(`${origin}${locale === "en" ? "/" : `/${locale}/`}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.getAnimations().forEach((animation) => animation.finish());
    });
    await screenshot(page, join(reviewDir, `${locale}-desktop.png`), true);
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await screenshot(page, join(reviewDir, `${locale}-mobile.png`), true);
    // Compose the share card from the same localized heading, intro and notebook.
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.evaluate(() => {
      const brand = document.querySelector(".brand").cloneNode(true);
      const heading = document.querySelector(".hero h1").cloneNode(true);
      const intro = document.querySelector(".lead").cloneNode(true);
      const notebook = document.querySelector(".app-window").cloneNode(true);
      const card = document.createElement("div");
      card.className = "share-card";
      const copy = document.createElement("div");
      copy.className = "share-copy";
      copy.append(heading, intro);
      card.append(brand, copy, notebook);
      document.body.replaceChildren(card);
      const style = document.createElement("style");
      style.textContent = `
        html,body {width:1200px;height:630px;overflow:hidden;scroll-behavior:auto}
        .share-card {position:fixed;inset:0;background:var(--paper);overflow:hidden}
        .share-card>.brand {position:absolute;top:52px;left:56px;font-size:26px}
        .share-copy {position:absolute;left:56px;top:178px;width:450px}
        .share-copy h1 {font:400 56px/1.12 var(--serif);letter-spacing:-.03em;text-wrap:balance}
        .share-copy h1 span {color:var(--sage)}
        :lang(zh) .share-copy h1,:lang(ja) .share-copy h1,:lang(ko) .share-copy h1 {font-size:62px;line-height:1.4}
        .share-copy .lead {margin:28px 0 0;font-size:18px;max-width:405px;line-height:1.8}
        .share-card>.app-window {position:absolute;left:548px;top:118px;width:900px;transform:scale(.68);transform-origin:top left;animation:none}
        .share-card .app-body {grid-template-columns:205px minmax(0,1fr);min-height:550px}
        .share-card .reading-view {padding:34px 40px}
        .share-card .app-window {box-shadow:var(--window-shadow)}
      `;
      document.head.append(style);
      window.scrollTo(0, 0);
    });
    await screenshot(page, join(assets, `og-${locale}.png`));
    console.log(`Captured ${locale}: desktop, mobile, 1200 × 630 share card`);
  }
}
