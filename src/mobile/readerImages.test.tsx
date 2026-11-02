import { expect, test } from "nsh/test";
import type { TextViewBlock } from "nsh/base";
import { resolveImageSrc, stripImages } from "./readerImages";

const ROOT = "/cache/vault";

test("图片路径：相对路径按笔记所在目录解析", () => {
  expect(resolveImageSrc("pic.png", "note.md", ROOT)).toBe("/cache/vault/pic.png");
  expect(resolveImageSrc("attachments/a.png", "日记/2026/note.md", ROOT)).toBe("/cache/vault/日记/2026/attachments/a.png");
});

test("图片路径：以 / 开头按库根解析，.. 可以回退但不能越出库根", () => {
  expect(resolveImageSrc("/assets/a.png", "日记/note.md", ROOT)).toBe("/cache/vault/assets/a.png");
  expect(resolveImageSrc("../shared/a.png", "日记/note.md", ROOT)).toBe("/cache/vault/shared/a.png");
  expect(resolveImageSrc("../../a.png", "日记/note.md", ROOT)).toBe("../../a.png");
});

test("图片路径：带 scheme 的地址原样保留，查询串与锚点去掉，百分号编码解开", () => {
  expect(resolveImageSrc("https://example.com/a.png", "note.md", ROOT)).toBe("https://example.com/a.png");
  expect(resolveImageSrc("data:image/png;base64,AAA", "note.md", ROOT)).toBe("data:image/png;base64,AAA");
  expect(resolveImageSrc("//cdn.example.com/a.png", "note.md", ROOT)).toBe("//cdn.example.com/a.png");
  expect(resolveImageSrc("a.png?raw=1#part", "note.md", ROOT)).toBe("/cache/vault/a.png");
  expect(resolveImageSrc("my%20pic.png", "note.md", ROOT)).toBe("/cache/vault/my pic.png");
});

test("图片路径：笔记目录找不到时回退到库根，反斜杠按分隔符处理", () => {
  const files = new Set(["/cache/vault/attachments/a.png"]);
  const exists = (rel: string) => files.has(`/cache/vault/${rel}`);
  expect(resolveImageSrc("attachments/a.png", "日记/note.md", ROOT, exists)).toBe("/cache/vault/attachments/a.png");
  expect(resolveImageSrc("missing.png", "日记/note.md", ROOT, exists)).toBe("/cache/vault/日记/missing.png");
  expect(resolveImageSrc("images\\a.png", "note.md", ROOT)).toBe("/cache/vault/images/a.png");
});

const image = (src: string) => ({ type: "image", src, alt: "图" }) as const;

test("摘图：段落里的图片连同链接包着的图片都摘出来，文字保留", () => {
  const block: TextViewBlock = { type: "paragraph", content: [
    { type: "text", text: "前" },
    image("a.png"),
    { type: "link", url: "https://example.com", content: [image("b.png"), { type: "strong", content: [image("c.png")] }] },
    { type: "text", text: "后" },
  ] };
  const { block: stripped, images } = stripImages(block);
  expect(images.map(item => item.src)).toEqual(["a.png", "b.png", "c.png"]);
  expect(stripped).toEqual({ type: "paragraph", content: [
    { type: "text", text: "前" },
    { type: "link", url: "https://example.com", content: [{ type: "strong", content: [] }] },
    { type: "text", text: "后" },
  ] });
});

test("摘图：扩展节点的内联内容里的图片也能摘出来", () => {
  const block: TextViewBlock = { type: "paragraph", content: [
    { type: "custom", name: "mention", content: [image("m.png")] },
  ] };
  const { block: stripped, images } = stripImages(block);
  expect(images.map(item => item.src)).toEqual(["m.png"]);
  expect(stripped).toEqual({ type: "paragraph", content: [{ type: "custom", name: "mention", content: [] }] });
});

test("摘图：标题、引用、列表、表格和 details 里的图片都能摘出来", () => {
  const block: TextViewBlock = { type: "blockquote", children: [
    { type: "heading", level: 2, content: [image("h.png")] },
    { type: "list", items: [{ children: [{ type: "paragraph", content: [image("l.png")] }] }] },
    { type: "table", head: [{ content: [image("t1.png")] }], rows: [[{ content: [image("t2.png")] }]] },
    { type: "details", summary: [image("s.png")], children: [{ type: "paragraph", content: [image("d.png")] }] },
  ] };
  const { block: stripped, images } = stripImages(block);
  expect(images.map(item => item.src)).toEqual(["h.png", "l.png", "t1.png", "t2.png", "s.png", "d.png"]);
  expect(JSON.stringify(stripped)).not.toContain('"image"');
});
