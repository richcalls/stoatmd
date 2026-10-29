import { expect, open, test } from "nsh/test";

const desktop = { width: 1280, height: 800, locale: "zh-CN" };

test("设置：点右上角关闭后 open 变为 false", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("open");
  expect(app.shows("id:settings-dialog")).toBe(true);

  await app.press("id:settings-close");
  expect(app.texts()).toContain("closed");
});

test("设置：点完成按钮关闭", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("open");

  await app.press("text:完成");
  expect(app.texts()).toContain("closed");
});

test("设置：12 套主题可选并持久化", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.shows("id:theme-weave-paper")).toBe(true);
  expect(app.shows("id:theme-pure-white")).toBe(true);
  expect(app.shows("id:theme-pine-smoke")).toBe(true);

  await app.press("id:theme-pure-white");
  await app.waitUntil(() => app.storage()["prefs.theme"] === "pure-white");
  expect(app.storage()["prefs.theme"]).toBe("pure-white");
});

test("设置：字体下拉可选系统默认并持久化，语言切换即时生效", async () => {
  const app = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: {
      "prefs.fontFamily": "Menlo",
    },
  });
  await app.press("id:settings-tab-font");
  expect(app.texts()).toContain("Menlo");

  await app.press("id:font-select");
  await app.waitUntil(() => app.shows("id:font-search"));
  expect(app.shows("id:font-options")).toBe(true);
  await app.press("id:font-option-system");
  await app.press("id:font-size-18");
  await app.press("id:font-line-2");
  await app.waitUntil(
    () =>
      app.storage()["prefs.fontFamily"] === "system" &&
      app.storage()["prefs.fontSize"] === "18" &&
      app.storage()["prefs.fontLineHeight"] === "2",
  );
  expect(app.texts()).toContain("系统默认");
  expect(app.storage()["prefs.fontSize"]).toBe("18");
  expect(app.storage()["prefs.fontLineHeight"]).toBe("2");

  await app.press("id:settings-tab-appearance");
  await app.press("id:locale-en");
  await app.waitUntil(() => app.storage()["prefs.locale"] === "en");
  expect(app.texts()).toContain("Settings");
  expect(app.texts()).toContain("Done");
});
