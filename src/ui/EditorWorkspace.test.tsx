import { expect, open, test } from "nsh/test";

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
