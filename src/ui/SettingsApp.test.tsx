import { expect, open, test } from "nsh/test";
import type { SettingsState } from "./settingsState";

const state: SettingsState = {
  title: "设置", vaultRoot: "/tmp/stoatmd-test-vault", tab: "appearance",
  theme: "everest", locale: "zh", logo: "thread", renderMode: "color",
  typography: { ui: 14, editor: 15, family: "system", size: 16, line: 1.55 },
  storage: { busy: false, active: null, phase: "idle", target: null, summary: null, keepOriginal: true,
    progress: { stage: "copying", done: 0, total: 0 }, error: null, warning: null },
  sync: { phase: "off", connection: null, lastSyncAt: 0, error: null, conflicts: [], progress: { done: 0, total: 0 } },
};
const options = {
  width: 820, height: 640, locale: "zh-CN",
  host: { params: { settingsWindow: true, state }, handlers: { settings: { ok: true, value: null } } },
};

test("独立设置：偏好写入通过主窗口通道提交", async () => {
  const app = await open("../../App.tsx", options);
  await app.press("id:render-mode-monochrome");
  expect(app.host.calls()).toEqual([
    { name: "settings", data: { kind: "preference", key: "prefs.renderMode", value: "monochrome" } },
  ]);
  expect(app.storage()["prefs.renderMode"]).toBe(undefined);

  await app.press("id:settings-tab-font");
  await app.press("id:ui-font-size-inc");
  expect(app.host.calls()[1]).toEqual({
    name: "settings", data: { kind: "preference", key: "prefs.uiFontSize", value: "15" },
  });
});

test("独立设置：主窗口状态更新保留当前页面，重新打开切换到请求页面", async () => {
  const app = await open("../../App.tsx", options);
  await app.press("id:settings-tab-font");
  const updated = { ...state, typography: { ...state.typography, ui: 17, editor: 19 } };
  await app.host.send("state", updated);
  expect(app.shows("id:ui-font-size >> text:17")).toBe(true);
  expect(app.shows("id:editor-font-size >> text:19")).toBe(true);
  await app.host.send("visibility", false);
  expect(app.shows("id:settings-window")).toBe(false);
  await app.host.send("open", updated);
  expect(app.shows("id:render-mode-color")).toBe(true);
  expect(app.shows("id:ui-font-size")).toBe(false);
});

test("独立设置：主窗口更新文稿配色与当前存储位置", async () => {
  const app = await open("../../App.tsx", options);
  await app.host.send("state", { ...state, renderMode: "monochrome" });
  expect(app.spanStyle("id:render-mode-monochrome >> text:单色渲染").fontWeight).toBe(600);
  await app.press("id:settings-tab-sync");
  expect(app.shows("id:storage-current-local")).toBe(true);
  expect(app.shows("id:storage-location-dropbox")).toBe(true);
});

test("独立设置：迁移请求携带保留选项，主窗口响应更新完成状态", async () => {
  const confirmation: SettingsState = { ...state, tab: "sync", storage: { ...state.storage,
    phase: "confirm", target: { kind: "local", root: "/tmp/stoatmd-target" },
    summary: { files: 2, directories: 1, bytes: 12 },
  } };
  const completed: SettingsState = { ...confirmation, vaultRoot: "/tmp/stoatmd-target",
    storage: { ...confirmation.storage, phase: "succeeded" },
  };
  const app = await open("../../App.tsx", { ...options,
    host: { params: { settingsWindow: true, state: confirmation },
      handlers: { settings: { ok: true, value: completed } } },
  });
  await app.press("id:storage-keep-original");
  // A background theme/progress publication must preserve the user's confirmation choice.
  await app.host.send("state", { ...confirmation, theme: "aurora-borealis" });
  await app.press("id:storage-start");
  await app.waitFor("id:storage-done");
  expect(app.host.calls()).toEqual([{ name: "settings", data: {
    kind: "storage", method: "migrate", keepOriginal: false,
  } }]);
  expect(app.storage()["storage.active"]).toBe(undefined);
});

test("独立设置：迁移期间保持当前页面和快捷键关闭保护，主窗口进度即时呈现", async () => {
  const copying: SettingsState = { ...state, tab: "sync", storage: { ...state.storage,
    busy: true, phase: "copying", progress: { stage: "copying", done: 2, total: 5 },
  } };
  const app = await open("../../App.tsx", { ...options,
    host: { params: { settingsWindow: true, state: copying }, handlers: { settings: { ok: true, value: copying } } },
  });
  expect(app.texts()).toContain("2 / 5");
  await app.press("id:settings-tab-font");
  expect(app.shows("id:ui-font-size")).toBe(false);
  await app.host.send("open", { ...copying, tab: "appearance" });
  expect(app.shows("id:render-mode-color")).toBe(false);
  await app.keyboard.press("escape");
  expect(app.shows("id:settings-window")).toBe(true);
  await app.host.send("state", { ...copying, storage: { ...copying.storage,
    progress: { stage: "copying", done: 4, total: 5 } } });
  expect(app.texts()).toContain("4 / 5");
});
