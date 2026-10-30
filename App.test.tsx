import { expect, open, test } from "nsh/test";

test("Mac 壳挂载后可见产品名与打开库入口", async () => {
  const app = await open("./App.tsx", { locale: "zh-CN" });
  expect(app.shows("text:StoatMD")).toBe(true);
  expect(app.shows("text:打开文件夹…")).toBe(true);
});

test("语言默认跟随系统：en-US 显示英文", async () => {
  const app = await open("./App.tsx", { locale: "en-US" });
  expect(app.shows("text:Open Folder…")).toBe(true);
});

test("语言默认跟随系统：日语 / 繁体中文 / 德语 / 西班牙语", async () => {
  const cases: [string, string][] = [
    ["ja-JP", "フォルダを開く…"],
    ["zh-TW", "開啟資料夾…"],
    ["de-DE", "Ordner öffnen…"],
    ["es-ES", "Abrir carpeta…"],
  ];
  for (const [locale, text] of cases) {
    const app = await open("./App.tsx", { locale });
    expect({ locale, shown: app.shows(`text:${text}`) }).toEqual({ locale, shown: true });
  }
});

test("⌘, 打开设置，并可关闭", async () => {
  const app = await open("./App.tsx", { width: 1280, height: 800, locale: "zh-CN" });
  await app.keyboard.press("mod+,");
  expect(app.shows("id:theme-paper")).toBe(true);
  expect(app.shows("id:theme-nord")).toBe(true);
  expect(app.shows("id:settings-close")).toBe(true);
  await app.press("id:settings-close");
  expect(app.shows("text:打开文件夹…")).toBe(true);
});
