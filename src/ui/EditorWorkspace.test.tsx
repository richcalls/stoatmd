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
