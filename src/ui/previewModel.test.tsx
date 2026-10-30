import { expect, test } from "nsh/test";
import { previewModel, resolveAnchor } from "./previewModel";

const MD = `# 标题

${"这是一段用于估算行高的中文正文。".repeat(40)}

\`\`\`ts
const a = 1;
const b = 2;
\`\`\`
`;

test("previewModel：字号与行高变大时估算块高随之变大", () => {
  const small = previewModel(MD, { fontSize: 14, lineHeight: 24 });
  const large = previewModel(MD, { fontSize: 18, lineHeight: 32 });
  expect(large.estimatedItemSize).toBeGreaterThan(small.estimatedItemSize);
});

test("previewModel：相同正文与排版命中缓存", () => {
  const first = previewModel(MD, { fontSize: 15, lineHeight: 26 });
  const second = previewModel(MD, { fontSize: 15, lineHeight: 26 });
  expect(second === first).toBe(true);
  const other = previewModel(MD, { fontSize: 16, lineHeight: 26 });
  expect(other === first).toBe(false);
});

test("previewModel：frontmatter 不进正文，预览从第一个正文块开始", () => {
  const model = previewModel("---\ntags: [知识]\n---\n# 标题\n\n正文");
  expect(model.blocks.length).toBe(2);
  expect(model.blocks[0].type).toBe("heading");
});

test("previewModel：标题锚点指向所在顶层块，重名与嵌套标题一并收录", () => {
  const model = previewModel("# Intro\n\n> ## Nested\n\n## Intro\n\n### 标题");
  expect(model.anchors.get("intro")).toBe(0);
  expect(model.anchors.get("nested")).toBe(1);
  expect(model.anchors.get("intro-1")).toBe(2);
  expect(model.anchors.get("标题")).toBe(3);
});

test("previewModel：脚注锚点跳到脚注自己的块", () => {
  const model = previewModel("正文[^note]\n\n[^note]: 脚注内容");
  const first = model.anchors.get("footnote-note");
  expect(first).toBe(1);
  expect(model.blocks[first!].type).toBe("paragraph");
});

test("resolveAnchor：只解析预览内锚点，外链与未知锚点不处理", () => {
  const model = previewModel("# 标题\n\n正文");
  expect(resolveAnchor(model.anchors, "#标题")).toBe(0);
  expect(resolveAnchor(model.anchors, `#${encodeURIComponent("标题")}`)).toBe(0);
  expect(resolveAnchor(model.anchors, "https://example.com")).toBe(undefined);
  expect(resolveAnchor(model.anchors, "#missing")).toBe(undefined);
});
