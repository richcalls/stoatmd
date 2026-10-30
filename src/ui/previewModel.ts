import { TextView } from "nsh/base";
import type { TextViewBlock, TextViewDocument } from "nsh/base";

export type PreviewModel = {
  blocks: TextViewBlock[];
  /** List 的行高初值：越接近真实块高，滚动同步与滚动条越稳定。 */
  estimatedItemSize: number;
  /** 每个块顶部相对内容起点的估算偏移（含它与上一块之间的空隙）。 */
  offsets: number[];
};

/** 阅读画布顶部留白（与 List 的 contentStyle 保持一致）。 */
export const PREVIEW_TOP_PADDING = 44;

/** 排版偏好（预览正文）；估算随字号/行高缩放。 */
export type PreviewMetrics = {
  fontSize: number;
  lineHeight: number;
};

export const DEFAULT_METRICS: PreviewMetrics = { fontSize: 15, lineHeight: 23 };

const BASE_SIZE = 15;
const BASE_CHARS_PER_LINE = 34;
const CJK = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;

/**
 * 相邻块之间的空隙。预览按块拆成独立 TextView，CSS 的 margin 折叠不会发生，
 * 所以由这里统一给出「折叠后」的间距（数值取自 Kami 的 pt 节奏，按字号缩放）。
 */
export function previewGap(
  previous: TextViewBlock | undefined,
  block: TextViewBlock,
  scale = 1,
): number {
  if (!previous) return 0;
  const gap = (n: number) => Math.round(n * scale);
  if (block.type === "heading") return gap(block.level <= 2 ? 32 : 24);
  if (previous.type === "heading") return gap(10);
  if (block.type === "blockquote" || previous.type === "blockquote") return gap(16);
  if (block.type === "codeBlock" || previous.type === "codeBlock") return gap(14);
  if (block.type === "table" || previous.type === "table") return gap(16);
  if (block.type === "math" || previous.type === "math") return gap(16);
  if (block.type === "rule") return gap(24);
  return gap(13);
}

function estimateBlockHeight(block: TextViewBlock, metrics: PreviewMetrics): number {
  const { fontSize, lineHeight } = metrics;
  const scale = fontSize / BASE_SIZE;
  if (block.type === "rule") return Math.round(25 * scale);
  if (block.type === "heading") return Math.round(36 * scale);
  if (block.type === "math") return Math.round(64 * scale);
  const text = TextView.plainText({ blocks: [block] });
  if (block.type === "codeBlock") {
    return Math.max(1, text.split("\n").length) * Math.round(20 * scale) + Math.round(30 * scale);
  }
  if (block.type === "table") {
    return Math.max(1, text.split("\n").length) * Math.round(30 * scale) + 12;
  }
  let units = 0;
  for (const ch of text) units += CJK.test(ch) ? 1 : 0.55;
  const charsPerLine = BASE_CHARS_PER_LINE / scale;
  return Math.max(1, Math.ceil(units / charsPerLine)) * lineHeight + 10;
}

let cachedKey: string | null = null;
let cached: PreviewModel = { blocks: [], estimatedItemSize: 64, offsets: [] };

let parsedKey: string | null = null;
let parsedDocumentCache: TextViewDocument | null = null;

/** 去掉 YAML frontmatter：元数据只在信息栏读取，不进入正文、目录与统计。 */
export function bodyWithoutFrontmatter(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return markdown;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "---" || line === "...") return lines.slice(i + 1).join("\n");
  }
  return markdown;
}

/** 同一正文只解析一次：预览、目录与统计共用这份解析树。 */
export function parsedDocument(markdown: string): TextViewDocument {
  if (parsedKey === markdown && parsedDocumentCache) return parsedDocumentCache;
  const document = TextView.parse(bodyWithoutFrontmatter(markdown));
  parsedKey = markdown;
  parsedDocumentCache = document;
  return document;
}

/** 预览按块拆给 List：整篇 TextView 不虚拟化，长文档会拖垮整窗帧率。 */
export function previewModel(
  markdown: string,
  metrics: PreviewMetrics = DEFAULT_METRICS,
): PreviewModel {
  const key = `${markdown}\u0000${metrics.fontSize}\u0000${metrics.lineHeight}`;
  if (key === cachedKey) return cached;
  const document = parsedDocument(markdown);
  const blocks = [...document.blocks];
  if (document.footnotes?.length) {
    for (const footnote of document.footnotes) blocks.push(...footnote.children);
  }
  let total = 0;
  let previous: TextViewBlock | undefined;
  const offsets: number[] = [];
  for (const block of blocks) {
    total += previewGap(previous, block, metrics.fontSize / BASE_SIZE);
    offsets.push(total);
    total += estimateBlockHeight(block, metrics);
    previous = block;
  }
  const average = blocks.length > 0 ? total / blocks.length : 64;
  cachedKey = key;
  cached = {
    blocks,
    estimatedItemSize: Math.round(Math.min(320, Math.max(28, average))),
    offsets,
  };
  return cached;
}

/** 第 index 个预览块顶部相对内容起点的估算偏移；越界时夹到首尾。 */
export function previewBlockOffset(
  markdown: string,
  index: number,
  metrics: PreviewMetrics = DEFAULT_METRICS,
): number {
  const model = previewModel(markdown, metrics);
  if (model.offsets.length === 0) return 0;
  const at = Math.min(model.offsets.length - 1, Math.max(0, index));
  return model.offsets[at];
}
