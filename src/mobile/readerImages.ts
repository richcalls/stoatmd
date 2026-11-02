import type { TextViewBlock, TextViewImage, TextViewInline } from "nsh/base";

/** 带 scheme 的地址（http:、https:、data:、file: …）原样保留。 */
const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function isAbsolute(src: string): boolean {
  return ABSOLUTE.test(src);
}

/** 去掉查询串 / 锚点，并解开 `%20` 这类编码，得到库内相对路径。 */
function relativePath(src: string): string {
  const raw = src.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  try { return decodeURI(raw); } catch { return raw; }
}

/** 归一化 `a/../b`，越出库根时返回 null。 */
function normalize(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

/**
 * 图片地址 → 库内相对路径。带 scheme 的地址返回 null（原样交给 `<Image>`）。
 * 先按笔记所在目录解析；老笔记常把库根附件写成相对路径，找不到时再按库根试一次。
 */
export function imageRelPath(src: string, notePath: string,
  exists?: (relPath: string) => boolean): string | null {
  if (!src || isAbsolute(src)) return null;
  const path = relativePath(src);
  const noteDir = notePath.includes("/") ? notePath.slice(0, notePath.lastIndexOf("/")) : "";
  const joined = normalize(path.startsWith("/") ? path.slice(1) : `${noteDir}/${path}`);
  if (!joined) return null;
  if (!exists || exists(joined)) return joined;
  const fromRoot = path.startsWith("/") ? joined : normalize(path);
  return fromRoot && exists(fromRoot) ? fromRoot : joined;
}

/**
 * 阅读模式里的图片：Markdown 写的是相对路径（`attachments/a.png`），
 * TextView 默认加载器只认 URL / asset:/，在 iOS 上会报 unsupported image source。
 * 这里按笔记所在目录把它解析成缓存库里的绝对路径，交给 `<Image>` 显示。
 */
export function resolveImageSrc(src: string, notePath: string, root: string,
  exists?: (relPath: string) => boolean): string {
  const rel = imageRelPath(src, notePath, exists);
  if (!rel) return src;
  return `${root.replace(/\/+$/, "")}/${rel}`;
}

function stripInlines(content: TextViewInline[], out: TextViewImage[]): TextViewInline[] {
  const kept: TextViewInline[] = [];
  for (const node of content) {
    if (node.type === "image") { out.push(node); continue; }
    if (node.type === "link" || node.type === "strong" || node.type === "emphasis" ||
      node.type === "strikethrough" || node.type === "underline" || node.type === "superscript" ||
      node.type === "subscript" || node.type === "small" || node.type === "highlight") {
      kept.push({ ...node, content: stripInlines(node.content, out) });
      continue;
    }
    if (node.type === "custom" && node.content) {
      kept.push({ ...node, content: stripInlines(node.content, out) });
      continue;
    }
    kept.push(node);
  }
  return kept;
}

/**
 * TextView 的 renderImage 在 iOS 上只占位不绘制（实测 0.3.0），
 * 所以把图片从块里摘出来，交给块下面的 `<Image>` 自己画。
 */
export function stripImages(block: TextViewBlock): { block: TextViewBlock; images: TextViewImage[] } {
  const images: TextViewImage[] = [];
  const strip = (node: TextViewBlock): TextViewBlock => {
    switch (node.type) {
      case "paragraph":
      case "heading":
        return { ...node, content: stripInlines(node.content, images) };
      case "blockquote":
        return { ...node, children: node.children.map(strip) };
      case "details":
        return { ...node, summary: stripInlines(node.summary, images), children: node.children.map(strip) };
      case "list":
        return { ...node, items: node.items.map(item => ({ ...item, children: item.children.map(strip) })) };
      case "table":
        return { ...node,
          head: node.head.map(cell => ({ ...cell, content: stripInlines(cell.content, images) })),
          rows: node.rows?.map(row => row.map(cell => ({ ...cell, content: stripInlines(cell.content, images) }))) };
      case "custom":
        return { ...node,
          ...(node.content ? { content: stripInlines(node.content, images) } : {}),
          ...(node.children ? { children: node.children.map(strip) } : {}) };
      default:
        return node;
    }
  };
  return { block: strip(block), images };
}
