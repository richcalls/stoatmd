import { expect, open, test } from "nsh/test";

const desktop = { width: 1280, height: 800, locale: "zh-CN" };

test("设置：点右上角关闭后 open 变为 false", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("open");
  expect(app.shows("id:settings-dialog")).toBe(true);

  await app.press("id:settings-close");
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

test("同步：未连接展示两家网盘；缺客户端凭据时明确提示且不进入授权", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  await app.press("id:settings-tab-sync");
  expect(app.texts()).toContain("开启同步");

  await app.press("id:sync-enable");
  expect(app.shows("id:sync-provider-google")).toBe(true);
  expect(app.shows("id:sync-provider-dropbox")).toBe(true);
  expect(app.texts()).toContain("Google Drive");

  await app.press("id:sync-provider-google");
  await app.waitUntil(() => app.shows("id:sync-local-error"));
  expect(app.texts().some((text) => text.includes("STOATMD_GOOGLE_CLIENT_ID"))).toBe(true);
  expect(app.shows("id:sync-auth-cancel")).toBe(false);
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
  await app.press("id:font-size-inc");
  await app.press("id:font-size-inc");
  await app.press("id:font-size-inc");
  await app.press("id:font-line-inc");
  await app.waitUntil(
    () =>
      app.storage()["prefs.fontFamily"] === "system" &&
      app.storage()["prefs.fontSize"] === "18" &&
      app.storage()["prefs.fontLineHeight"] === "1.8",
  );
  expect(app.texts()).toContain("系统默认");
  expect(app.storage()["prefs.fontSize"]).toBe("18");
  expect(app.storage()["prefs.fontLineHeight"]).toBe("1.8");

  await app.press("id:settings-tab-appearance");
  await app.press("id:locale-en");
  await app.waitUntil(() => app.storage()["prefs.locale"] === "en");
  expect(app.texts()).toContain("Settings");
  expect(app.texts()).toContain("Appearance");
});

test("设置：字体搜索可过滤系统字体、无匹配有空态、选中后持久化", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  await app.press("id:settings-tab-font");
  await app.press("id:font-select");
  await app.waitUntil(() => app.shows("id:font-search"));

  // 输入过程中下拉与设置面板都保持打开。
  await app.type("id:font-search", "helvetica");
  await app.waitUntil(() => app.shows("text:Helvetica"));
  expect(app.shows("id:font-search")).toBe(true);
  expect(app.shows("id:settings-dialog")).toBe(true);
  expect(app.shows("text:Academy Engraved LET")).toBe(false);

  await app.press("text:Helvetica");
  await app.waitUntil(() => app.storage()["prefs.fontFamily"] === "Helvetica");
  await app.waitFor("id:font-search", { state: "gone", timeout: 3000 });
  expect(app.shows("id:settings-dialog")).toBe(true);
  expect(app.texts()).toContain("Helvetica");

  // 再次打开时查询已重置；无匹配时给出空态。
  await app.press("id:font-select");
  await app.waitFor("id:font-search", { timeout: 3000 });
  expect(app.value("id:font-search")).toBe("");
  await app.type("id:font-search", "zzzzqqqq");
  await app.waitFor("text:没有匹配的字体", { timeout: 3000 });
  expect(app.shows("id:settings-dialog")).toBe(true);
});
