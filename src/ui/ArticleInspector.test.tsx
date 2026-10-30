import { expect, open, test } from "nsh/test";

const options = {
  width: 900,
  height: 700,
  locale: "zh-CN",
  platform: "macos" as const,
};

test("文章栏：目录列出各层标题，点击上报行号与块索引", async () => {
  const app = await open("./ArticleInspector.harness.tsx", options);
  expect(app.shows("id:article-inspector")).toBe(true);
  expect(app.shows("text:文章结构")).toBe(true);
  for (const label of ["项目笔记", "安装", "使用", "进阶"]) {
    expect({ label, shown: app.shows(`text:${label}`) }).toEqual({ label, shown: true });
  }
  await app.press("id:outline-2");
  expect(app.texts()).toContain("2:8:2");
});

test("文章栏：阅读模式高亮跟随可见块", async () => {
  const app = await open("./ArticleInspector.harness.tsx", options);
  const idle = app.spanStyle("text:安装").fontWeight;
  await app.press("id:block-2");
  const active = app.spanStyle("text:安装").fontWeight;
  expect(active).toBeGreaterThan(idle);

  await app.press("id:block-5");
  expect(app.spanStyle("text:进阶").fontWeight).toBeGreaterThan(idle);
  expect(app.spanStyle("text:安装").fontWeight).toBe(idle);
});

test("文章栏：信息页显示统计、文件信息与标签", async () => {
  const app = await open("./ArticleInspector.harness.tsx", options);
  await app.press("id:inspector-tab-info");
  expect(app.shows("id:inspector-info")).toBe(true);
  expect(app.shows("text:文章结构")).toBe(false);
  expect(app.shows("text:字符数")).toBe(true);
  expect(app.shows("text:预计阅读")).toBe(true);
  expect(app.shows("text:Markdown")).toBe(true);
  expect(app.shows("text:notes/demo.md")).toBe(true);
  expect(app.shows("text:知识")).toBe(true);
  expect(app.shows("text:学习")).toBe(true);
  expect(app.texts()).toContain("info");
});

test("文章栏：没有标题时显示空状态，切到源码模式仍保留", async () => {
  const app = await open("./ArticleInspector.harness.tsx", options);
  await app.press("id:plain-note");
  expect(app.shows("id:inspector-outline-empty")).toBe(true);
  expect(app.shows("text:这篇文章还没有标题")).toBe(true);
  expect(app.shows("id:outline-0")).toBe(false);

  await app.press("id:mode-edit");
  expect(app.shows("id:article-inspector")).toBe(true);
  expect(app.texts()).toContain("edit");
});

test("文章栏：关闭按钮收起面板", async () => {
  const app = await open("./ArticleInspector.harness.tsx", options);
  await app.press("id:inspector-close");
  expect(app.shows("id:article-inspector")).toBe(false);
  expect(app.texts()).toContain("false");
});
