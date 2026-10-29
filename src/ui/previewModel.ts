import { TextView } from "nsh/base";
import type { TextViewBlock } from "nsh/base";

export type PreviewModel = {
  blocks: TextViewBlock[];
  /** List 的行高初值：越接近真实块高，滚动同步与滚动条越稳定。 */
  estimatedItemSize: number;
};

const CJK = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;
const CHARS_PER_LINE = 34;
const LINE_HEIGHT = 26;

function estimateBlockHeight(block: TextViewBlock): number {
  if (block.type === "rule") return 25;
  if (block.type === "heading") return 30;
  if (block.type === "math") return 64;
  const text = TextView.plainText({ blocks: [block] });
  if (block.type === "codeBlock") return Math.max(1, text.split("\n").length) * 21 + 24;
  if (block.type === "table") return Math.max(1, text.split("\n").length) * 30 + 12;
  let units = 0;
  for (const ch of text) units += CJK.test(ch) ? 1 : 0.55;
  return Math.max(1, Math.ceil(units / CHARS_PER_LINE)) * LINE_HEIGHT + 8;
}

let cachedMarkdown: string | null = null;
let cached: PreviewModel = { blocks: [], estimatedItemSize: 64 };

/** 预览按块拆给 List：整篇 TextView 不虚拟化，长文档会拖垮整窗帧率。 */
export function previewModel(markdown: string): PreviewModel {
  if (markdown === cachedMarkdown) return cached;
  const document = TextView.parse(markdown);
  const blocks = [...document.blocks];
  if (document.footnotes?.length) {
    for (const footnote of document.footnotes) blocks.push(...footnote.children);
  }
  let total = 0;
  for (const block of blocks) total += estimateBlockHeight(block);
  const average = blocks.length > 0 ? total / blocks.length : 64;
  cachedMarkdown = markdown;
  cached = {
    blocks,
    estimatedItemSize: Math.round(Math.min(320, Math.max(28, average))),
  };
  return cached;
}
