import { expect, test } from "nsh/test";
import {
  activeHeadingFromBlock,
  activeHeadingFromLine,
  articleModel,
  noteFormat,
} from "./articleModel";

const MD = `---
tags: [知识, 学习]
---

# 项目笔记 🚀

前言。

## 安装

正文。

## 使用

### 进阶

#### 第四层

##### 第五层

###### 第六层
`;

test("目录：解析 H1–H6、中文与 emoji，并带上源码行号与块索引", () => {
  const model = articleModel(MD);
  expect(model.headings.map((h) => [h.level, h.text])).toEqual([
    [1, "项目笔记 🚀"],
    [2, "安装"],
    [2, "使用"],
    [3, "进阶"],
    [4, "第四层"],
    [5, "第五层"],
    [6, "第六层"],
  ]);
  expect(model.headings.map((h) => h.line)).toEqual([4, 8, 12, 14, 16, 18, 20]);
  expect(model.headings[0].blockIndex).toBe(0);
  expect(model.headings[1].blockIndex).toBe(2);
});

test("目录：重复标题 id 不同，代码围栏里的 # 不算标题", () => {
  const md = "# 重复\n\n```md\n# 不是标题\n```\n\n# 重复\n";
  const model = articleModel(md);
  expect(model.headings.map((h) => h.text)).toEqual(["重复", "重复"]);
  expect(model.headings[0].id).not.toBe(model.headings[1].id);
  expect(model.headings.map((h) => h.line)).toEqual([0, 6]);
});

test("目录：Setext 标题与引用里的标题", () => {
  const model = articleModel("一级标题\n===\n\n> ## 引用标题\n\n正文\n");
  expect(model.headings.map((h) => [h.level, h.text, h.line])).toEqual([
    [1, "一级标题", 0],
    [2, "引用标题", 3],
  ]);
});

test("统计：字符数去空白，段落与标题计数，阅读时间按 CJK/拉丁规则", () => {
  const model = articleModel("# 标题\n\n你好世界。\n\n第二段 with words.\n");
  expect(model.stats.headings).toBe(1);
  expect(model.stats.paragraphs).toBe(2);
  expect(model.stats.chars).toBe(Array.from("标题你好世界。第二段withwords.").length);
  expect(model.stats.readingMinutes).toBe(1);
  expect(articleModel("").stats.readingMinutes).toBe(0);
  expect(articleModel("正文。\n").headings).toEqual([]);
});

test("标签：frontmatter 行内数组、列表与逗号写法，去重去引号", () => {
  expect(articleModel(`---\ntags: [知识, "学习", #工具, 知识]\n---\n正文\n`).tags).toEqual([
    "知识",
    "学习",
    "工具",
  ]);
  expect(articleModel("---\ntags:\n  - 甲\n  - 乙\n---\n正文\n").tags).toEqual(["甲", "乙"]);
  expect(articleModel("---\ntag: 单个, 两个\n---\n正文\n").tags).toEqual(["单个", "两个"]);
  expect(articleModel("正文\n").tags).toEqual([]);
  expect(articleModel("# 普通标题\n\n正文\n").tags).toEqual([]);
});

test("滚动高亮：源码按行、阅读按块取最近的已过标题", () => {
  const model = articleModel(MD);
  expect(activeHeadingFromLine(model.headings, 0)).toBe(model.headings[0].id);
  expect(activeHeadingFromLine(model.headings, 8 * 24 + 1)).toBe(model.headings[1].id);
  expect(activeHeadingFromBlock(model.headings, 0)).toBe(model.headings[0].id);
  expect(activeHeadingFromBlock(model.headings, 2)).toBe(model.headings[1].id);
  expect(activeHeadingFromBlock(model.headings, 999)).toBe(model.headings[6].id);
  expect(activeHeadingFromLine([], 100)).toBe("");
  expect(activeHeadingFromBlock([], 1)).toBe("");
});

test("文件格式：Markdown 与其它扩展名", () => {
  expect(noteFormat("a/b.md")).toBe("Markdown");
  expect(noteFormat("a/b.MARKDOWN")).toBe("Markdown");
  expect(noteFormat("a/b.txt")).toBe("TXT");
  expect(noteFormat("noext")).toBe("Markdown");
});
