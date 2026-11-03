import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const website = fileURLToPath(new URL("../", import.meta.url));
const locales = ["en", "zh-hans", "zh-hant", "ja", "ko", "de", "fr", "es"];

// Capture through CDP: the browser's fullPage wrapper can alter mobile metrics.
async function screenshot(page, path, fullPage = false) {
  const clip = await page.evaluate(
    (full) => ({
      x: 0,
      y: 0,
      width: innerWidth,
      height: full ? document.documentElement.scrollHeight : innerHeight,
      scale: 1,
    }),
    fullPage,
  );
  const { data } = await page.cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip,
  });
  await writeFile(path, Buffer.from(data, "base64"));
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
      // Share cards are always light; the page tokens would otherwise follow
      // the capture browser's dark mode and render light ink on white.
      document.documentElement.dataset.theme = "light";
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

    // Compose the 1200 × 630 share card from the same localized page.
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const built = await page.evaluate(async () => {
      const brand = document.querySelector(".brand")?.cloneNode(true);
      const title = document.querySelector(".hero-title")?.cloneNode(true);
      const lead = document.querySelector(".hero-lead")?.cloneNode(true);
      const action = document
        .querySelector(".hero-actions .btn")
        ?.cloneNode(true);
      const noteText =
        document.querySelector(".hero-note")?.textContent?.trim() || "";
      const productImage = document.querySelector(".preview img")?.cloneNode(true);
      if (!brand || !title || !lead || !action || !productImage) return false;

      const style = document.createElement("style");
      style.textContent = `
        html, body { margin:0 !important; padding:0 !important; overflow:hidden !important; width:1200px; height:630px; background:#fbfbf8; }
        #og { position:fixed; inset:0; width:1200px; height:630px; padding:56px 64px 52px; display:grid; grid-template-columns:minmax(0,1fr) 428px; gap:56px; background:#fbfbf8; font-family:var(--font-ui); color:var(--ink); }
        #og .og-left { display:flex; flex-direction:column; min-width:0; }
        #og .brand { display:flex; align-items:center; gap:8px; text-decoration:none; color:var(--ink); }
        #og .brand-mark { width:28px; height:28px; }
        #og .brand-word { font-size:20px; font-weight:600; letter-spacing:-.02em; line-height:1; }
        #og .hero-title { margin:44px 0 0; max-width:640px; font-size:52px; font-weight:600; line-height:1.04; letter-spacing:-.035em; text-wrap:balance; }
        #og .hero-lead { margin:20px 0 0; max-width:520px; color:var(--muted); font-size:17px; line-height:1.6; }
        #og .og-bottom { margin-top:auto; display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
        #og .og-bottom .btn { min-height:42px; padding:10px 16px; font-size:13px; }
        #og .og-note { color:var(--muted); font-size:12px; line-height:1.5; max-width:230px; }
        #og .og-preview { align-self:center; width:428px; }
        #og .og-preview img { display:block; width:100%; height:auto; }
      `;
      document.head.appendChild(style);

      const og = document.createElement("div");
      og.id = "og";
      const left = document.createElement("div");
      left.className = "og-left";
      left.appendChild(brand);
      left.appendChild(title);
      left.appendChild(lead);

      const bottom = document.createElement("div");
      bottom.className = "og-bottom";
      bottom.appendChild(action);
      const note = document.createElement("span");
      note.className = "og-note";
      note.textContent = noteText;
      bottom.appendChild(note);
      left.appendChild(bottom);

      const preview = document.createElement("div");
      preview.className = "og-preview";
      preview.appendChild(productImage);
      og.append(left, preview);

      document.body.innerHTML = "";
      document.body.appendChild(og);
      await og.querySelector("img")?.decode();
      window.scrollTo(0, 0);
      return true;
    });
    if (!built) throw new Error(`Could not compose share card for ${locale}`);
    await page.waitForTimeout(150);
    await screenshot(page, join(assets, `og-${locale}.png`));
    console.log(`Captured ${locale}: desktop, mobile, 1200 × 630 share card`);
  }
}
