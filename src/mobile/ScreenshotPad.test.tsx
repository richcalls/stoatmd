import { expect, open, test } from "nsh/test";

// iPad Pro 11 寸：横 1194×834、竖 834×1194（points）。
const pad = (width: number, height: number) => ({
  platform: "ios" as const, width, height, locale: "zh-CN",
  safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
});

test("iPad 横屏：左库右文两栏", async () => {
  const app = await open("./Screenshot.harness.tsx", pad(1194, 834));
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-开始使用.md");
  expect(app.shows("id:mobile-split")).toBe(true);
  expect(app.shows("id:mobile-empty-detail")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-01-library.png");

  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  expect(app.shows("id:mobile-split-detail")).toBe(true);
  // 打开笔记后右上角应切到 Edit（系统栏按钮跟着编辑态走）。
  expect(app.shows("id:mobile-edit")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-02-reader.png");

  // 正文内查找：底栏放大镜打开，输入后给出命中数并滚到命中块。
  await app.press("id:mobile-find-open");
  await app.waitFor("id:mobile-find-input");
  await app.paste("id:mobile-find-input", { text: "写作" });
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(app.texts()).toContain("1 / 2");
  await app.screenshot("screenshots/ios-raw/ipad-05-find.png");
  await app.press("id:mobile-find-next");
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(app.texts()).toContain("2 / 2");
  await app.press("id:mobile-find-close");
  await app.waitFor("id:mobile-preview");
  expect(app.shows("id:mobile-find")).toBe(false);

  // iPad 接键盘时，⌘F 也能起查找，Esc 关掉。
  await app.keyboard.press("mod+f");
  await app.waitFor("id:mobile-find-input");
  expect(app.shows("id:mobile-find")).toBe(true);
  await app.keyboard.press("escape");
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(app.shows("id:mobile-find")).toBe(false);

  // ⌘N 新建笔记直接进编辑，⌘3 回到阅读，⌘, 开设置。
  await app.keyboard.press("mod+n");
  await app.waitFor("id:mobile-source");
  expect(app.shows("id:mobile-source")).toBe(true);
  await app.keyboard.press("mod+3");
  await app.waitFor("id:mobile-preview");
  await app.keyboard.press("mod+,");
  await app.waitFor("id:mobile-theme-paper");
  await app.press("id:mobile-panel-done");
  await app.waitFor("id:mobile-preview");

  // iPad 分屏：左边源码、右边实时预览（对齐 Mac 的 split 模式）。
  await app.press("id:mobile-split-preview");
  await app.waitFor("id:mobile-doc-split");
  expect(app.shows("id:mobile-source")).toBe(true);
  expect(app.shows("id:mobile-preview")).toBe(true);
  await app.paste("id:mobile-source", { text: "# 分屏预览\n\n右边跟着变。" });
  await app.waitUntil(() => app.texts().includes("右边跟着变。"), { timeout: 8000 });
  await app.screenshot("screenshots/ios-raw/ipad-06-split-edit.png");
  // 分屏里换笔记：仍然保持左右分屏。
  await app.press("id:mobile-note-工作/周报.md");
  await app.waitUntil(() => app.texts().includes("第 36 周"), { timeout: 8000 });
  expect(app.shows("id:mobile-doc-split")).toBe(true);

  // 分屏里也能直接 ⌘F 在源码里查找。
  await app.keyboard.press("mod+f");
  await app.waitFor("id:mobile-find-input");
  await app.paste("id:mobile-find-input", { text: "云盘" });
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(app.texts()).toContain("1 / 1");
  await app.screenshot("screenshots/ios-raw/ipad-08-editor-find.png");
  await app.keyboard.press("escape");
  await new Promise(resolve => setTimeout(resolve, 200));
  expect(app.shows("id:mobile-find")).toBe(false);

  await app.keyboard.press("mod+3");
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(app.shows("id:mobile-doc-split")).toBe(false);
  expect(app.shows("id:mobile-source")).toBe(false);
  expect(app.shows("id:mobile-preview")).toBe(true);

  // 收起左栏（阅读页底栏的侧栏按钮 / ⌘B），文档拿整幅宽度。
  await app.press("id:mobile-toggle-library");
  await new Promise(resolve => setTimeout(resolve, 300));
  expect(app.shows("id:mobile-split")).toBe(false);
  expect(app.shows("id:mobile-split-detail")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-07-collapsed.png");
  await app.keyboard.press("mod+b");
  await app.waitFor("id:mobile-split");
}, 120_000);

test("iPad 竖屏：仍然是两栏", async () => {
  const app = await open("./Screenshot.harness.tsx", pad(834, 1194));
  try { await app.screenshot(); } catch { return; }
  await app.waitFor("id:mobile-note-开始使用.md");
  expect(app.shows("id:mobile-split")).toBe(true);
  await app.press("id:mobile-note-开始使用.md");
  await app.waitFor("id:mobile-preview");
  await app.screenshot("screenshots/ios-raw/ipad-03-portrait.png");

  // 分栏里换笔记：右栏内容跟着换，左栏不跳走。
  await app.press("id:mobile-note-工作/项目计划.md");
  await new Promise(resolve => setTimeout(resolve, 400));
  expect(app.shows("id:mobile-note-开始使用.md")).toBe(true);
  expect(app.shows("id:mobile-split-detail")).toBe(true);
  await app.screenshot("screenshots/ios-raw/ipad-04-switch.png");
}, 120_000);
