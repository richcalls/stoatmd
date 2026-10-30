import type { TextViewBlock, TextViewInline } from "nsh/base";
import { parsedDocument } from "./previewModel";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type OutlineEntry = {
  /** 稳定的块路径（如 `3`、`5.0.2`），同名标题也互不混淆。 */
  id: string;
  level: HeadingLevel;
  text: string;
  /** 所属顶层预览块（目录跳转用）。 */
  blockIndex: number;
  /** 源码行号（0 起，目录跳转用）。 */
  line: number;
};

export type ArticleStats = {
  /** Unicode 字符数（去掉空白）。 */
  chars: number;
  /** 预计阅读分钟；空文档为 0。 */
  readingMinutes: number;
  paragraphs: number;
  headings: number;
};

export type ArticleModel = {
  headings: OutlineEntry[];
  stats: ArticleStats;
  tags: string[];
};

type RawHeading = Omit<OutlineEntry, "line">;

type TextParts = {
  text: string;
  paragraphs: number;
  headings: number;
};

type LineHeading = {
  level: HeadingLevel;
  text: string;
  line: number;
};

const CJK_GLOBAL =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

function inlineText(nodes: readonly TextViewInline[]): string {
  let out = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out += node.text;
        break;
      case "code":
        out += node.code;
        break;
      case "keyboard":
        out += node.text;
        break;
      case "image":
        out += node.alt ?? "";
        break;
      case "math":
        out += node.tex;
        break;
      case "break":
        out += " ";
        break;
      case "footnoteReference":
        break;
      case "strong":
      case "emphasis":
      case "strikethrough":
      case "underline":
      case "superscript":
      case "subscript":
      case "small":
      case "highlight":
      case "link":
        if ("content" in node) out += inlineText(node.content);
        break;
      case "custom":
        if (node.text) out += node.text;
        else if (node.content) out += inlineText(node.content);
        break;
    }
  }
  return out;
}

function walkBlock(
  block: TextViewBlock,
  path: string,
  blockIndex: number,
  raw: RawHeading[],
  parts: TextParts,
) {
  switch (block.type) {
    case "heading": {
      const text = collapse(inlineText(block.content));
      parts.headings += 1;
      parts.text += `${text}\n`;
      raw.push({ id: path, level: block.level, text, blockIndex });
      break;
    }
    case "paragraph":
      parts.paragraphs += 1;
      parts.text += `${inlineText(block.content)}\n`;
      break;
    case "blockquote":
      block.children.forEach((child, i) => {
        walkBlock(child, `${path}.${i}`, blockIndex, raw, parts);
      });
      break;
    case "list":
      block.items.forEach((item, itemIndex) => {
        item.children.forEach((child, childIndex) => {
          walkBlock(child, `${path}.${itemIndex}.${childIndex}`, blockIndex, raw, parts);
        });
      });
      break;
    case "details":
      parts.text += `${inlineText(block.summary)}\n`;
      block.children.forEach((child, i) => {
        walkBlock(child, `${path}.${i}`, blockIndex, raw, parts);
      });
      break;
    case "codeBlock":
      parts.text += `${block.code}\n`;
      break;
    case "math":
      parts.text += `${block.tex}\n`;
      break;
    case "table":
      for (const cell of block.head) parts.text += `${inlineText(cell.content)}\t`;
      for (const row of block.rows ?? []) {
        for (const cell of row) parts.text += `${inlineText(cell.content)}\t`;
      }
      parts.text += "\n";
      break;
    case "custom":
      if (block.text) parts.text += `${block.text}\n`;
      if (block.content) parts.text += `${inlineText(block.content)}\n`;
      block.children?.forEach((child, i) => {
        walkBlock(child, `${path}.${i}`, blockIndex, raw, parts);
      });
      break;
    case "rule":
      break;
  }
}

/** YAML frontmatter 的结束行（`---` / `...`）；没有 frontmatter 时为 0。 */
function frontmatterEnd(lines: string[]): number {
  if (lines[0]?.trim() !== "---") return 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "---" || line === "...") return i + 1;
  }
  return 0;
}

const isBlockLine = (line: string, indented: boolean): boolean => {
  const text = line.trim();
  return (
    indented ||
    text === "" ||
    /^([-*+]|\d+[.)])\s/.test(text) ||
    text.startsWith(">") ||
    text.startsWith("#") ||
    text.startsWith("|") ||
    /^(`{3,}|~{3,})/.test(text) ||
    /^<[^>]+>/.test(text) ||
    /^-+$/.test(text) ||
    /^=+$/.test(text)
  );
};

/**
 * 扫源码里的标题行：ATX（含引用前缀）与 Setext，跳过 frontmatter 与围栏代码。
 * 行号只用于源码模式定位，标题本身以解析树为准。
 */
function scanHeadingLines(markdown: string): LineHeading[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: LineHeading[] = [];
  let fence: { char: string; length: number } | null = null;
  let paragraph: { line: number; text: string } | null = null;

  for (let i = frontmatterEnd(lines); i < lines.length; i += 1) {
    const raw = lines[i];
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(raw);
    if (fence) {
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.char &&
        fenceMatch[1].length >= fence.length &&
        raw.trim().slice(fence.length).trim() === ""
      ) {
        fence = null;
      }
      paragraph = null;
      continue;
    }
    if (fenceMatch) {
      fence = { char: fenceMatch[1][0], length: fenceMatch[1].length };
      paragraph = null;
      continue;
    }

    const atx = /^(?: {0,3}> ?)* {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/.exec(raw);
    if (atx) {
      const text = (atx[2] ?? "").replace(/[ \t]+#+[ \t]*$/, "").trim();
      out.push({ level: atx[1].length as HeadingLevel, text: collapse(text), line: i });
      paragraph = null;
      continue;
    }

    const setext = /^ {0,3}(=+|-+)[ \t]*$/.exec(raw);
    if (setext && paragraph) {
      out.push({
        level: setext[1][0] === "=" ? 1 : 2,
        text: collapse(paragraph.text),
        line: paragraph.line,
      });
      paragraph = null;
      continue;
    }

    const indented = /^(?: {4}|\t)/.test(raw);
    if (isBlockLine(raw, indented)) {
      paragraph = null;
    } else if (paragraph) {
      paragraph.text += ` ${raw.trim()}`;
    } else {
      paragraph = { line: i, text: raw.trim() };
    }
  }
  return out;
}

function alignLines(headings: RawHeading[], candidates: LineHeading[]): OutlineEntry[] {
  if (candidates.length === headings.length) {
    return headings.map((heading, i) => ({ ...heading, line: candidates[i].line }));
  }
  let cursor = 0;
  let lastLine = 0;
  return headings.map((heading) => {
    let found = -1;
    for (let i = cursor; i < candidates.length; i += 1) {
      if (candidates[i].text === heading.text) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      for (let i = cursor; i < candidates.length; i += 1) {
        if (candidates[i].level === heading.level) {
          found = i;
          break;
        }
      }
    }
    if (found < 0) return { ...heading, line: lastLine };
    cursor = found + 1;
    lastLine = candidates[found].line;
    return { ...heading, line: lastLine };
  });
}

function readTags(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return [];
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "---" || line === "...") {
      end = i;
      break;
    }
  }
  if (end < 0) return [];

  const tags: string[] = [];
  const add = (raw: string) => {
    const value = raw
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^#/, "")
      .trim();
    if (value && !tags.includes(value)) tags.push(value);
  };

  const body = lines.slice(1, end);
  for (let i = 0; i < body.length; i += 1) {
    const match = /^\s*tags?\s*:\s*(.*)$/i.exec(body[i]);
    if (!match) continue;
    const rest = match[1].trim();
    if (rest.startsWith("[")) {
      for (const part of rest.replace(/^\[|\]$/g, "").split(",")) add(part);
    } else if (rest) {
      for (const part of rest.split(",")) add(part);
    } else {
      for (let j = i + 1; j < body.length; j += 1) {
        const item = /^\s*-\s+(.*)$/.exec(body[j]);
        if (!item) break;
        add(item[1]);
      }
    }
  }
  return tags;
}

let cachedKey: string | null = null;
let cached: ArticleModel = {
  headings: [],
  stats: { chars: 0, readingMinutes: 0, paragraphs: 0, headings: 0 },
  tags: [],
};

/** 目录、统计与标签共用一次解析；同一正文直接复用结果。 */
export function articleModel(markdown: string): ArticleModel {
  if (markdown === cachedKey) return cached;

  const document = parsedDocument(markdown);
  const raw: RawHeading[] = [];
  const parts: TextParts = { text: "", paragraphs: 0, headings: 0 };

  document.blocks.forEach((block, i) => {
    walkBlock(block, String(i), i, raw, parts);
  });
  let footnoteIndex = document.blocks.length;
  for (const footnote of document.footnotes ?? []) {
    footnote.children.forEach((child, i) => {
      walkBlock(child, `fn.${footnote.label}.${i}`, footnoteIndex, raw, parts);
      footnoteIndex += 1;
    });
  }

  const compact = parts.text.replace(/\s+/g, "");
  const chars = Array.from(compact).length;
  const cjk = (parts.text.match(CJK_GLOBAL) ?? []).length;
  const words =
    (parts.text.replace(CJK_GLOBAL, " ").match(/[\p{L}\p{N}]+/gu) ?? []).length;
  const readingMinutes =
    chars === 0 ? 0 : Math.max(1, Math.ceil(cjk / 300 + words / 200));

  cachedKey = markdown;
  cached = {
    headings: alignLines(raw, scanHeadingLines(markdown)),
    stats: {
      chars,
      readingMinutes,
      paragraphs: parts.paragraphs,
      headings: parts.headings,
    },
    tags: readTags(markdown),
  };
  return cached;
}

/** 当前章节（源码/分栏）：标题行越过视口上方 3 行即算进入。 */
export function activeHeadingFromLine(
  headings: OutlineEntry[],
  editorY: number,
  lineHeight = 24,
): string {
  if (headings.length === 0) return "";
  let active = headings[0].id;
  for (const heading of headings) {
    if (heading.line * lineHeight <= editorY + lineHeight * 3) active = heading.id;
    else break;
  }
  return active;
}

/** 当前章节（阅读）：取视口顶部第一个块及其上方最近的标题。 */
export function activeHeadingFromBlock(
  headings: OutlineEntry[],
  blockIndex: number,
): string {
  if (headings.length === 0) return "";
  let active = headings[0].id;
  for (const heading of headings) {
    if (heading.blockIndex <= blockIndex) active = heading.id;
    else break;
  }
  return active;
}

export function noteFormat(path: string): string {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "Markdown";
  const ext = name.slice(dot + 1).toLowerCase();
  if (ext === "md" || ext === "markdown") return "Markdown";
  return ext ? ext.toUpperCase() : "Markdown";
}
