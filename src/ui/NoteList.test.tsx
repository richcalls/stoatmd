import { expect, open, test } from "nsh/test";

test("NoteList：后到的笔记应出现在中栏（组件只运行一次）", async () => {
  const app = await open("./NoteList.harness.tsx", { width: 800, height: 600, locale: "zh-CN" });
  await app.press("id:feed");
  expect(app.texts()).toContain("万字教程");
  expect(app.texts()).toContain("草稿");
});

test("NoteList：搜索词应过滤列表", async () => {
  const app = await open("./NoteList.harness.tsx", { width: 800, height: 600, locale: "zh-CN" });
  await app.press("id:feed");
  await app.type("搜索笔记", "万字");
  expect(app.texts()).toContain("万字教程");
  expect(app.texts()).not.toContain("草稿");
});

test("NoteList：点击笔记应回调选中的路径", async () => {
  const app = await open("./NoteList.harness.tsx", { width: 800, height: 600, locale: "zh-CN" });
  await app.press("id:feed");
  await app.press("text:草稿");
  expect(app.texts()).toContain("写作/草稿.md");
});
