import { expect, open, test, type App } from "nsh/test";
import { themePreset } from "./theme";

async function clearFind(app: App) {
  // Delete the shortcut's selected query first: the native clear() driver
  // can leave part of the query when it clicks to focus the field again.
  await app.keyboard.press("mod+f");
  await app.keyboard.press("backspace");
  await app.clear("id:document-find-input");
  expect(app.value("id:document-find-input")).toBe("");
}

test("文稿配色：预览即时切换并保留正文、字号、链接下划线和代码复制", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", { width: 1000, height: 900 });
  await app.press("id:mode-preview");
  const style = (text: string) => app.spanStyle(`id:pane-preview >> text:${text} >> nth=0`);
  const paper = themePreset("everest").palette;
  const rgba = (hex: string) => `${hex.toLowerCase()}ff`;
  const headingSize = style("hi").fontSize;
  expect(style("hi").color).toBe(rgba(paper.accent));
  expect(style("引用 quote").color).toBe(rgba(paper.quote));
  expect(style("inline_code").color).toBe(rgba(paper.syntaxBold));
  expect(style("链接 link").color).toBe(rgba(paper.accent));
  expect(style("正文 plain text").color).toBe(rgba(paper.ink));

  await app.press("id:render-monochrome");
  for (const text of ["hi", "引用 quote", "inline_code", "链接 link", "正文 plain text", "const a = 1;", "1;"]) {
    expect({ text, color: style(text).color }).toEqual({ text, color: rgba(paper.ink) });
  }
  expect(style("hi").fontSize).toBe(headingSize);
  expect(style("链接 link").underline).toBe(true);
  await app.press("label:Copy code");
  await app.waitUntil(() => app.clipboard() === "const a = 1;");

  await app.press("id:theme-aurora-borealis");
  const nord = themePreset("aurora-borealis").palette;
  expect(style("hi").color).toBe(rgba(nord.ink));
  await app.press("id:render-color");
  expect(style("hi").color).toBe(rgba(nord.accent));
  expect(style("引用 quote").color).toBe(rgba(nord.quote));
});

test("文稿配色：源码切换清除高亮并在恢复彩色后重新着色", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", { width: 1000, height: 900 });
  const style = (text: string) => app.spanStyle(`id:document-editor >> text:${text}`);
  const paper = themePreset("everest").palette;
  const rgba = (hex: string) => `${hex.toLowerCase()}ff`;
  expect(style("# hi").color).toBe(rgba(paper.accent));
  await app.press("id:render-monochrome");
  await app.waitUntil(() => style("# hi").color === rgba(paper.ink));
  for (const text of ["# hi", "> 引用 quote", "[链接 link]", "`inline_code`", "const a = 1;"]) {
    expect({ text, color: style(text).color }).toEqual({ text, color: rgba(paper.ink) });
  }
  await app.press("id:render-color");
  expect(style("# hi").color).toBe(rgba(paper.accent));
  await app.press("id:theme-aurora-borealis");
  const nord = themePreset("aurora-borealis").palette;
  expect(style("# hi").color).toBe(rgba(nord.accent));
  expect(style("> 引用 quote").color).toBe(rgba(nord.quote));
});

test("EditorWorkspace：三种模式切换应真正改变面板", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", { width: 1000, height: 700 });
  expect(app.shows("id:pane-editor")).toBe(true);
  expect(app.shows("id:pane-preview")).toBe(true);

  await app.press("id:mode-preview");
  expect(app.shows("id:pane-preview")).toBe(true);
  expect(app.shows("id:pane-editor")).toBe(false);

  await app.press("id:mode-edit");
  expect(app.shows("id:pane-editor")).toBe(true);
  expect(app.shows("id:pane-preview")).toBe(false);

  await app.press("id:mode-split");
  expect(app.shows("id:pane-editor")).toBe(true);
  expect(app.shows("id:pane-preview")).toBe(true);
});

test("EditorWorkspace：代码块右上角复制按钮写入剪贴板", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", {
    width: 1000,
    height: 700,
    locale: "zh-CN",
  });
  await app.press("id:mode-preview");
  await app.waitUntil(() => app.shows("label:复制代码"));
  await app.press("label:复制代码");
  await app.waitUntil(() => app.clipboard() === "const a = 1;");
  expect(app.clipboard()).toBe("const a = 1;");
});

test("EditorWorkspace：编辑器接收 macOS 复制、剪切、粘贴和全选快捷键", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", {
    width: 1000,
    height: 700,
    platform: "macos",
    host: { params: { locale: "en" } },
  });
  await app.paste("id:document-editor", { text: "clipboard source" });
  await app.keyboard.press("cmd+a");
  await app.keyboard.press("cmd+c");
  expect(app.clipboard()).toContain("clipboard source");
  await app.keyboard.press("backspace");
  await app.keyboard.press("cmd+v");
  await app.keyboard.press("cmd+f");
  await app.type("id:document-find-input", "clipboard source");
  expect(app.texts()).toContain("1 of 1");
});

for (const platform of ["macos", "windows", "linux"] as const) {
  test(`EditorWorkspace：${platform} 文件内搜索、跳转、关闭及恢复焦点`, async () => {
    const app = await open("./EditorWorkspace.harness.tsx", {
      width: 1000, height: 700, platform, host: { params: { locale: "en" } },
    });
    await app.keyboard.press(platform === "macos" ? "cmd+f" : "ctrl+f");
    expect(app.shows("id:document-find")).toBe(true);
    await app.type("id:document-find-input", "hi");
    expect(app.texts()).toContain("1 of 3");
    await app.keyboard.press("enter");
    expect(app.texts()).toContain("2 of 3");
    await app.keyboard.press("shift+enter");
    expect(app.texts()).toContain("1 of 3");
    await app.keyboard.press(platform === "macos" ? "cmd+shift+g" : "shift+f3");
    expect(app.texts()).toContain("3 of 3");
    await app.keyboard.press(platform === "macos" ? "cmd+g" : "f3");
    expect(app.texts()).toContain("1 of 3");
    await app.press("id:document-find-next");
    expect(app.texts()).toContain("2 of 3");
    await app.keyboard.press("escape");
    expect(app.shows("id:document-find")).toBe(false);
    await app.keyboard.press("mod+c");
    expect(app.clipboard()).toBe("hi");
    await app.keyboard.press(platform === "macos" ? "cmd+f" : "ctrl+f");
    expect(app.value("id:document-find-input")).toBe("hi");
    await app.keyboard.press(platform === "macos" ? "cmd+f" : "ctrl+f");
    expect(app.value("id:document-find-input")).toBe("hi");
    await clearFind(app);
    expect(app.value("id:document-find-input")).toBe("");
  });
}

test("EditorWorkspace：搜索覆盖预览模式、Unicode、字面量、空结果与换文", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", {
    width: 1000, height: 700, platform: "macos", host: { params: { locale: "en" } },
  });
  await app.press("id:mode-preview");
  await app.keyboard.press("cmd+f");
  expect(app.shows("id:pane-editor")).toBe(true);
  expect(app.shows("id:pane-preview")).toBe(true);
  await app.type("id:document-find-input", "中文😀");
  expect(app.texts()).toContain("1 of 2");
  await clearFind(app);
  await app.type("id:document-find-input", "[x]");
  expect(app.value("id:document-find-input")).toBe("[x]");
  expect(app.texts()).toContain("1 of 2");
  await clearFind(app);
  await app.type("id:document-find-input", "missing");
  expect(app.texts()).toContain("No results");
  await app.keyboard.press("enter");
  expect(app.texts()).toContain("No results");
  await clearFind(app);
  await app.type("id:document-find-input", "hi");
  expect(app.value("id:document-find-input")).toBe("hi");
  expect(app.texts()).toContain("1 of 3");
  await app.press("id:switch-document");
  expect(app.texts()).toContain("1 of 1");
});

test("EditorWorkspace：搜索即时使用编辑器中的未保存正文", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", {
    width: 1000, height: 700, platform: "macos", host: { params: { locale: "en" } },
  });
  await app.paste("id:document-editor", { text: "unsaved needle " });
  await app.keyboard.press("cmd+f");
  await app.type("id:document-find-input", "needle");
  expect(app.texts()).toContain("1 of 1");
  await app.press("id:document-find-close");
  await app.keyboard.press("backspace");
  await app.keyboard.press("cmd+f");
  expect(app.texts()).toContain("No results");
});

test("EditorWorkspace：预览里的外链点击后交给系统打开", async () => {
  const app = await open("./EditorWorkspace.harness.tsx", { width: 1000, height: 900, platform: "macos" });
  await app.press("id:mode-preview");
  await app.press("text:链接 link");
  expect(app.openedUrls()).toContain("https://example.com");
});
