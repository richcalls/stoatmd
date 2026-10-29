import { TextView } from "nsh/base";
import type { TextViewBlock } from "nsh/base";

export type PreviewModel = {
  blocks: TextViewBlock[];
  /** List 的行高初值：越接近真实块高，滚动同步与滚动条越稳定。 */
  estimatedItemSize: number;
};

/** 排版偏好（预览正文）；估算随字号/行高缩放。 */
export type PreviewMetrics = {
  fontSize: number;
  lineHeight: number;
};

export const DEFAULT_METRICS: PreviewMetrics = { fontSize: 15, lineHeight: 26 };

const BASE_SIZE = 15;
const BASE_CHARS_PER_LINE = 34;
const CJK = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;

function estimateBlockHeight(block: TextViewBlock, metrics: PreviewMetrics): number {
  const { fontSize, lineHeight } = metrics;
  const scale = fontSize / BASE_SIZE;
  if (block.type === "rule") return Math.round(25 * scale);
  if (block.type === "heading") return Math.round(30 * scale);
  if (block.type === "math") return Math.round(64 * scale);
  const text = TextView.plainText({ blocks: [block] });
  if (block.type === "codeBlock") {
    return Math.max(1, text.split("\n").length) * Math.round(21 * scale) + Math.round(24 * scale);
  }
  if (block.type === "table") {
    return Math.max(1, text.split("\n").length) * Math.round(30 * scale) + 12;
  }
  let units = 0;
  for (const ch of text) units += CJK.test(ch) ? 1 : 0.55;
  const charsPerLine = BASE_CHARS_PER_LINE / scale;
  return Math.max(1, Math.ceil(units / charsPerLine)) * lineHeight + 8;
}

let cachedKey: string | null = null;
let cached: PreviewModel = { blocks: [], estimatedItemSize: 64 };

/** 预览按块拆给 List：整篇 TextView 不虚拟化，长文档会拖垮整窗帧率。 */
export function previewModel(
  markdown: string,
  metrics: PreviewMetrics = DEFAULT_METRICS,
): PreviewModel {
  const key = `${markdown}\u0000${metrics.fontSize}\u0000${metrics.lineHeight}`;
  if (key === cachedKey) return cached;
  const document = TextView.parse(markdown);
  const blocks = [...document.blocks];
  if (document.footnotes?.length) {
    for (const footnote of document.footnotes) blocks.push(...footnote.children);
  }
  let total = 0;
  for (const block of blocks) total += estimateBlockHeight(block, metrics);
  const average = blocks.length > 0 ? total / blocks.length : 64;
  cachedKey = key;
  cached = {
    blocks,
    estimatedItemSize: Math.round(Math.min(320, Math.max(28, average))),
  };
  return cached;
}
