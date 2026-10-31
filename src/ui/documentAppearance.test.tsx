import { expect, test } from "nsh/test";
import type { TextViewBlock } from "nsh/base";
import { displayBlock } from "./documentAppearance";

test("文稿配色：单色禁用嵌套代码高亮，原始代码与语言保留", () => {
  const code: TextViewBlock = { type: "codeBlock", code: "const a = 1;", language: "ts", meta: "example" };
  const block: TextViewBlock = {
    type: "blockquote",
    children: [{ type: "list", items: [{ children: [{ type: "details", summary: [], children: [code] }] }] }],
  };
  const plain = displayBlock(block, "monochrome");
  expect(JSON.stringify(plain)).toBe(JSON.stringify({
    type: "blockquote",
    children: [{ type: "list", items: [{ children: [{ type: "details", summary: [], children: [{ type: "codeBlock", code: "const a = 1;", meta: "example" }] }] }] }],
  }));
  expect(code.language).toBe("ts");
  expect(displayBlock(block, "color")).toBe(block);
});
