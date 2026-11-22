/**
 * 文章排版 token，移植自 Kami（https://github.com/tw93/kami），MIT License。
 * 只保留屏幕预览用得到的部分；原规范见 Kami 的 skills/kami/references/design.md 与 tokens.json。
 */
export const KAMI = {
  parchment: "#f5f4ed",
  ivory: "#faf9f5",
  inlineCodeBg: "#f0eee6",
  border: "#e8e6dc",
  brand: "#1B365D",
  brandTint: "#EEF2F7",
  nearBlack: "#141413",
  darkWarm: "#3d3d3a",
  olive: "#504e49",
  stone: "#6b6a64",
} as const;

const MONO_STACK = ["JetBrains Mono", "SF Mono", "Menlo", "Consolas", "Monaco"];

let lastFontsRef: readonly string[] | null = null;
let lastMonoFamily = "Menlo";

/**
 * nsh 的 fontFamily 只接受单个族名，不能传 CSS 字体栈；按安装情况回退，
 * 字体桥不可用时用 Menlo 兜底。按字体列表引用缓存，避免每个预览块线性扫描。
 */
export function kamiMonoFamily(installed: readonly string[]): string {
  if (installed === lastFontsRef) return lastMonoFamily;
  lastFontsRef = installed;
  lastMonoFamily = MONO_STACK.find((name) => installed.includes(name)) ?? "Menlo";
  return lastMonoFamily;
}
