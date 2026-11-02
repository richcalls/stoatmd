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

    // Compose the 1200 × 630 share card from the same localized log spread.
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: 1200,
      height: 630,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const built = await page.evaluate(() => {
      const brand = document.querySelector(".brand")?.cloneNode(true);
      const title = document.querySelector(".hero-title")?.cloneNode(true);
      const lead = document.querySelector(".hero-lead")?.cloneNode(true);
      const stamp = document.querySelector(
        ".hero-actions .btn-stamp",
      )?.cloneNode(true);
      const reading = document.querySelector(".reading-view")?.cloneNode(true);
      const filename =
        document.querySelector(".filename")?.textContent?.trim() || "";
      const state =
        document.querySelector(".state-live")?.textContent?.trim() || "";
      const kicker =
        document
          .querySelector(".log-brand")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "StoatMD / Field Log";
      const noteText =
        document.querySelector(".hero-note")?.textContent?.trim() || "";
      if (!brand || !title || !lead || !stamp || !reading) return false;

      const style = document.createElement("style");
      style.textContent = `
        html, body { margin:0 !important; padding:0 !important; overflow:hidden !important; width:1200px; height:630px; background:#dfe7d8; }
        #og { position:fixed; inset:0; width:1200px; height:630px; padding:58px 64px 52px; display:grid; grid-template-columns:minmax(0,1fr) 424px; gap:54px; background-color:#dfe7d8; background-image:linear-gradient(to right,rgba(36,64,143,.075) 1px,transparent 1px),linear-gradient(to bottom,rgba(36,64,143,.075) 1px,transparent 1px); background-size:24px 24px; font-family:var(--font-ui); color:var(--ink); }
        #og .og-left { display:flex; flex-direction:column; min-width:0; }
        #og .og-top { display:flex; align-items:center; justify-content:space-between; gap:18px; }
        #og .brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
        #og .brand-mark { width:38px; height:38px; }
        #og .brand-word { font-size:26px; font-weight:800; letter-spacing:-.04em; line-height:1; }
        #og .brand-word .md { color:var(--blue); }
        #og .og-kicker { font-family:var(--font-mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); white-space:nowrap; }
        #og .hero-title { margin:34px 0 0; font-size:55px; line-height:.94; letter-spacing:-.05em; max-width:650px; }
        #og .hero-title .line { display:block; }
        #og .hero-title .accent { color:var(--blue); }
        #og .hero-lead { margin-top:20px; max-width:560px; font-size:17px; line-height:1.5; color:var(--ink-soft); }
        #og .og-bottom { margin-top:auto; display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
        #og .og-bottom .btn-stamp { animation:none; transform:rotate(-1deg); font-size:11px; padding:12px 15px; }
        #og .og-bottom .btn-stamp::before { inset:3px; }
        #og .og-note { font-family:var(--font-mono); font-size:10px; line-height:1.5; color:var(--muted); max-width:220px; }
        #og .og-sheet { position:relative; align-self:start; height:512px; padding:22px 22px 18px; background-color:var(--sheet); border:1px solid #c9c2ad; box-shadow:0 22px 34px -26px rgba(20,22,19,.45),0 3px 6px rgba(20,22,19,.08); transform:rotate(-.45deg); overflow:hidden; }
        #og .og-sheet::before { content:""; position:absolute; top:-11px; left:22px; width:80px; height:22px; background:rgba(216,196,154,.8); transform:rotate(-4deg); clip-path:polygon(2% 0,100% 4%,97% 100%,0 94%); }
        #og .og-sheet::after { content:""; position:absolute; inset:5px; border:1px solid rgba(27,29,26,.07); pointer-events:none; }
        #og .og-toolbar { position:relative; z-index:1; display:flex; justify-content:space-between; gap:10px; padding-bottom:8px; border-bottom:1px solid var(--rule); font-family:var(--font-mono); font-size:8px; color:var(--blue); }
        #og .og-toolbar .state { color:var(--stamp); letter-spacing:.08em; text-transform:uppercase; }
        #og .og-sheet .reading-view { position:relative; z-index:1; padding-top:10px; }
        #og .og-sheet .doc-meta { font-size:8px; margin-bottom:5px; }
        #og .og-sheet .reading-view h2 { font-size:31px; line-height:1.06; max-width:100%; }
        #og .og-sheet .pencil-underline { width:170px; height:6px; margin:3px 0 7px; }
        #og .og-sheet .reading-view p { font-size:12.5px; line-height:1.52; margin-bottom:7px; max-width:100%; }
        #og .og-sheet .reading-view blockquote { font-size:15px; line-height:1.3; margin:10px 0 9px; padding:7px 0; max-width:100%; }
        #og .og-sheet .reading-view blockquote::before { font-size:1.4rem; left:-13px; top:2px; }
        #og .og-sheet .reading-view ul { gap:3px; margin-bottom:8px; }
        #og .og-sheet .reading-view li { font-size:11.5px; gap:6px; }
        #og .og-sheet .doc-ending { font-size:8px; padding-top:6px; }
      `;
      document.head.appendChild(style);

      const og = document.createElement("div");
      og.id = "og";
      const left = document.createElement("div");
      left.className = "og-left";
      const top = document.createElement("div");
      top.className = "og-top";
      top.appendChild(brand);
      const kick = document.createElement("span");
      kick.className = "og-kicker";
      kick.textContent = kicker;
      top.appendChild(kick);
      left.appendChild(top);
      left.appendChild(title);
      left.appendChild(lead);

      const bottom = document.createElement("div");
      bottom.className = "og-bottom";
      stamp.classList.add("og-stamp");
      bottom.appendChild(stamp);
      const note = document.createElement("span");
      note.className = "og-note";
      note.textContent = noteText;
      bottom.appendChild(note);
      left.appendChild(bottom);

      const sheet = document.createElement("div");
      sheet.className = "og-sheet";
      const toolbar = document.createElement("div");
      toolbar.className = "og-toolbar";
      const file = document.createElement("span");
      file.textContent = filename;
      const status = document.createElement("span");
      status.className = "state";
      status.textContent = state;
      toolbar.append(file, status);
      sheet.appendChild(toolbar);
      sheet.appendChild(reading);
      og.append(left, sheet);

      document.body.innerHTML = "";
      document.body.appendChild(og);
      window.scrollTo(0, 0);
      return { filename, state };
    });
    if (!built) throw new Error(`Could not compose share card for ${locale}`);
    await page.waitForTimeout(150);
    await screenshot(page, join(assets, `og-${locale}.png`));
    console.log(`Captured ${locale}: desktop, mobile, 1200 × 630 share card`);
  }
}
