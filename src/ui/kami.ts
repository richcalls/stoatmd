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

/** 阅读正文行高（Kami 1.55）。 */
export const KAMI_READING_LINE_HEIGHT = 1.55;

const SERIF_STACK = [
  "Songti SC",
  "STSong",
  "Source Han Serif SC",
  "Noto Serif CJK SC",
  "Charter",
  "Georgia",
];

const MONO_STACK = ["JetBrains Mono", "SF Mono", "Menlo", "Consolas", "Monaco"];

function firstInstalled(
  stack: readonly string[],
  installed: readonly string[],
): string | undefined {
  return stack.find((name) => installed.includes(name));
}

/**
 * nsh 的 fontFamily 只接受单个族名，不能传 CSS 字体栈；优先中文衬线，
 * 保证中英混排都落在衬线上。字体桥不可用时用 Georgia 兜底。
 */
export function kamiSerifFamily(installed: readonly string[]): string {
  return firstInstalled(SERIF_STACK, installed) ?? "Georgia";
}

export function kamiMonoFamily(installed: readonly string[]): string {
  return firstInstalled(MONO_STACK, installed) ?? "Menlo";
}

/** Kami 以 10.5pt 正文为基准的屏幕字号阶梯（1pt ≈ 1.333px）。 */
export function kamiTypeScale(body: number) {
  const at = (pt: number) => Math.round((body * pt) / 10.5);
  return {
    h1: at(22),
    h2: at(16),
    h3: at(13),
    h4: at(11),
    h5: body,
    h6: at(10),
    code: at(9),
  };
}
