import { expect, open, test } from "nsh/test";

const desktop = { width: 1280, height: 800, locale: "zh-CN" };

test("设置：三组字号独立生效、即时保存并在重启后恢复", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  await app.press("id:settings-tab-font");
  expect(app.spanStyle("id:ui-font-size >> text:14").fontSize).toBe(15);
  await app.press("id:ui-font-size-inc");
  await app.press("id:editor-font-size-inc");
  await app.press("id:font-size-inc");
  await app.waitUntil(() =>
    app.storage()["prefs.uiFontSize"] === "15" &&
    app.storage()["prefs.editorFontSize"] === "16" &&
    app.storage()["prefs.fontSize"] === "17",
  );
  expect(app.spanStyle("id:ui-font-size >> text:15").fontSize).toBe(16);

  const again = await open("./SettingsSheet.harness.tsx", {
    ...desktop, storage: app.storage(),
  });
  await again.press("id:settings-tab-font");
  expect(again.shows("id:ui-font-size >> text:15")).toBe(true);
  expect(again.shows("id:editor-font-size >> text:16")).toBe(true);
  expect(again.shows("id:font-size >> text:17")).toBe(true);
  expect(again.spanStyle("id:ui-font-size >> text:15").fontSize).toBe(16);
});

test("设置：字号边界禁用按钮，损坏的偏好恢复默认", async () => {
  const app = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: {
      "prefs.uiFontSize": "18", "prefs.editorFontSize": "12", "prefs.fontSize": "24",
    },
  });
  await app.press("id:settings-tab-font");
  expect(app.enabled("id:ui-font-size-inc")).toBe(false);
  expect(app.enabled("id:editor-font-size-dec")).toBe(false);
  expect(app.enabled("id:font-size-inc")).toBe(false);

  const invalid = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: {
      "prefs.uiFontSize": "Infinity", "prefs.editorFontSize": "100", "prefs.fontSize": "garbage",
    },
  });
  await invalid.press("id:settings-tab-font");
  expect(invalid.shows("id:ui-font-size >> text:14")).toBe(true);
  expect(invalid.shows("id:editor-font-size >> text:15")).toBe(true);
  expect(invalid.shows("id:font-size >> text:16")).toBe(true);
});

test("设置：浮窗呈现，点左上角关闭圆点后 open 变为 false", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("open");
  expect(app.shows("id:settings-window")).toBe(true);
  expect(app.shows("id:settings-window-bar")).toBe(true);
  expect(app.texts()).toContain("设置");
  expect(app.shows("id:settings-done")).toBe(false);

  await app.press("id:settings-close");
  expect(app.texts()).toContain("closed");
});

test("设置：Esc 只收起浮窗", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  await app.keyboard.press("escape");
  await app.waitUntil(() => app.texts().includes("closed"));
  expect(app.texts()).toContain("closed");
});

test("设置：关闭快捷键收起面板，重开后保留即时保存的主题", async () => {
  const app = await open("./SettingsSheet.harness.tsx", { ...desktop, platform: "macos" });
  await app.press("id:theme-nord");
  await app.waitUntil(() => app.storage()["prefs.theme"] === "nord");
  await app.keyboard.press("mod+w");
  await app.waitUntil(() => app.texts().includes("closed"));
  await app.press("id:reopen");
  expect(app.shows("id:settings-window")).toBe(true);
  expect(app.storage()["prefs.theme"]).toBe("nord");
});

test("设置：字体下拉打开时 Esc 只收起下拉，浮窗保留", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  await app.press("id:settings-tab-font");
  await app.press("id:font-select");
  await app.waitUntil(() => app.shows("id:font-search"));
  await app.keyboard.press("escape");
  await app.waitFor("id:font-search", { state: "gone", timeout: 3000 });
  expect(app.shows("id:settings-window")).toBe(true);
  expect(app.texts()).toContain("open");
});

test("设置：拖动标题栏记住位置，重开后回到原处", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.texts()).toContain("centered");

  await app.drag("id:settings-window-bar", { x: 64, y: 40 });
  await app.waitUntil(() => typeof app.storage()["prefs.settingsFrame"] === "string");
  const saved = JSON.parse(app.storage()["prefs.settingsFrame"]) as { x: number; y: number };
  expect(saved.x).toBeGreaterThan(0);
  expect(saved.y).toBeGreaterThan(0);
  expect(app.texts()).toContain(`${saved.x},${saved.y}`);

  await app.press("id:settings-close");
  expect(app.texts()).toContain("closed");
  await app.press("id:reopen");
  expect(app.texts()).toContain(`${saved.x},${saved.y}`);

  // 重启后从偏好还原：模拟 harness 启动时的 restore。
  const again = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: { "prefs.settingsFrame": JSON.stringify(saved) },
  });
  await again.waitUntil(() => again.texts().includes(`${saved.x},${saved.y}`));
  expect(again.texts()).toContain(`${saved.x},${saved.y}`);
});

test("设置：保存的位置来自偏好时直接还原", async () => {
  const app = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: { "prefs.settingsFrame": JSON.stringify({ x: 120, y: 90 }) },
  });
  await app.waitUntil(() => app.texts().includes("120,90"));
  expect(app.texts()).toContain("120,90");
});

test("设置：25 套 Otty 主题可选并持久化", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.shows("id:theme-paper")).toBe(true);
  expect(app.shows("id:theme-nord")).toBe(true);
  expect(app.shows("id:theme-tokyo-night")).toBe(true);

  await app.press("id:theme-nord");
  await app.waitUntil(() => app.storage()["prefs.theme"] === "nord");
  expect(app.storage()["prefs.theme"]).toBe("nord");
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

test("设置：字体下拉可选默认衬线并持久化，语言切换即时生效", async () => {
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
  // 默认项写实际字体名，不再出现产品 / 规范名。
  expect(app.texts().some((text) => text.endsWith("（默认）"))).toBe(true);
  expect(app.texts().some((text) => text.includes("Kami"))).toBe(false);
  await app.press("id:font-option-default");
  await app.press("id:font-size-inc");
  await app.press("id:font-size-inc");
  await app.press("id:font-size-inc");
  await app.press("id:font-line-inc");
  await app.waitUntil(
    () =>
      app.storage()["prefs.fontFamily"] === "system" &&
      app.storage()["prefs.fontSize"] === "19" &&
      app.storage()["prefs.fontLineHeight"] === "1.6",
  );
  expect(app.texts().some((text) => text.startsWith("Kami"))).toBe(false);
  expect(app.storage()["prefs.fontSize"]).toBe("19");
  expect(app.storage()["prefs.fontLineHeight"]).toBe("1.6");

  await app.press("id:settings-tab-appearance");
  await app.press("id:locale-select");
  await app.waitUntil(() => app.shows("id:locale-options"));
  await app.press("id:locale-en");
  await app.waitUntil(() => app.storage()["prefs.locale"] === "en");
  await app.waitFor("id:locale-options", { state: "gone", timeout: 3000 });
  expect(app.texts()).toContain("Settings");
  expect(app.texts()).toContain("Appearance");
});

test("设置：字体一键恢复默认，字体 / 字号 / 行高回默认衬线并覆盖偏好", async () => {
  const app = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: {
      "prefs.fontFamily": "Helvetica",
      "prefs.uiFontSize": "18",
      "prefs.editorFontSize": "24",
      "prefs.fontSize": "18",
      "prefs.fontLineHeight": "1.6",
    },
  });
  await app.press("id:settings-tab-font");
  expect(app.texts()).toContain("Helvetica");
  expect(app.texts()).toContain("18");
  expect(app.texts()).toContain("1.6");

  await app.press("id:font-reset");
  await app.waitUntil(
    () =>
      app.storage()["prefs.fontFamily"] === "system" &&
      app.storage()["prefs.uiFontSize"] === "14" &&
      app.storage()["prefs.editorFontSize"] === "15" &&
      app.storage()["prefs.fontSize"] === "16" &&
      app.storage()["prefs.fontLineHeight"] === "1.55",
  );
  expect(app.texts()).not.toContain("Helvetica");
  expect(app.texts().some((text) => text.includes("Kami"))).toBe(false);
  expect(app.texts()).toContain("16");
  expect(app.texts()).toContain("1.55");
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
  expect(app.shows("id:settings-window")).toBe(true);
  expect(app.shows("text:Academy Engraved LET")).toBe(false);

  await app.press("text:Helvetica");
  await app.waitUntil(() => app.storage()["prefs.fontFamily"] === "Helvetica");
  await app.waitFor("id:font-search", { state: "gone", timeout: 3000 });
  expect(app.shows("id:settings-window")).toBe(true);
  expect(app.texts()).toContain("Helvetica");

  // 再次打开时查询已重置；无匹配时给出空态。
  await app.press("id:font-select");
  await app.waitFor("id:font-search", { timeout: 3000 });
  expect(app.value("id:font-search")).toBe("");
  await app.type("id:font-search", "zzzzqqqq");
  await app.waitFor("text:没有匹配的字体", { timeout: 3000 });
  expect(app.shows("id:settings-window")).toBe(true);
});

test("设置：界面语言为下拉框，切到日本語后持久化并即时翻译", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  await app.press("id:settings-tab-appearance");
  // 默认跟随系统：下拉框收起时只显示当前项，展开后列出全部九项。
  expect(app.shows("id:locale-options")).toBe(false);
  expect(app.texts()).toContain("跟随系统");
  await app.press("id:locale-select");
  await app.waitUntil(() => app.shows("id:locale-options"));
  expect(app.shows("id:locale-en")).toBe(true);
  expect(app.shows("id:locale-zh")).toBe(true);
  expect(app.shows("id:locale-zh-Hant")).toBe(true);
  expect(app.shows("id:locale-ja")).toBe(true);
  expect(app.shows("id:locale-ko")).toBe(true);
  expect(app.shows("id:locale-de")).toBe(true);
  expect(app.shows("id:locale-fr")).toBe(true);
  expect(app.shows("id:locale-es")).toBe(true);
  expect(app.texts()).toContain("简体中文");
  expect(app.texts()).toContain("繁體中文");
  expect(app.texts()).toContain("Español");
  await app.press("id:locale-ja");
  await app.waitUntil(() => app.storage()["prefs.locale"] === "ja");
  await app.waitFor("id:locale-options", { state: "gone", timeout: 3000 });
  expect(app.texts()).toContain("外観");
  expect(app.texts()).toContain("言語");
  expect(app.texts()).toContain("日本語");
});

test("设置：应用图标默认织线白鼬，可切换到敏捷剪影并持久化", async () => {
  const app = await open("./SettingsSheet.harness.tsx", desktop);
  expect(app.shows("id:logo-thread")).toBe(true);
  expect(app.shows("id:logo-agile")).toBe(true);
  expect(app.texts()).toContain("织线白鼬");
  expect(app.texts()).toContain("默认");
  expect(app.texts()).toContain("thread");

  // 暗色主题下切图标：应用图标走炭底版本（原生调用不抛错）。
  await app.press("id:theme-nord");
  await app.waitUntil(() => app.storage()["prefs.theme"] === "nord");
  await app.press("id:logo-agile");
  await app.waitUntil(() => app.storage()["prefs.appLogo"] === "agile");
  expect(app.texts()).toContain("agile");
});

test("设置：启动时恢复上次选择的应用图标", async () => {
  const app = await open("./SettingsSheet.harness.tsx", {
    ...desktop,
    storage: {
      "prefs.appLogo": "agile",
    },
  });
  await app.waitUntil(() => app.texts().includes("agile"));
  expect(app.texts()).toContain("敏捷剪影");
});
