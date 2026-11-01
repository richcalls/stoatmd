import { themeId, themePreset, type ThemePalette } from "../ui/theme";

export type MobileThemeId = "paper" | "nord" | "newsprint";

export type GlassTokens = {
  fill: string;
  fillStrong: string;
  stroke: string;
  strokeDark: string;
  shadow: string;
};

export type MobileTheme = {
  id: MobileThemeId;
  name: string;
  palette: ThemePalette;
  glass: GlassTokens;
  /** 设置页的小缩略图：纸面 / 标题 / 正文 / 强调色。 */
  art: { paper: string; ink: string; muted: string; accent: string; code: string };
};

/** Cream×Glass：纯色奶油纸面 + 靛蓝强调色，正文对齐 Mac 的 Kami 排版。 */
const PAPER: MobileTheme = {
  id: "paper",
  name: "Paper",
  palette: {
    paper: "#F7F3EB",
    sidebar: "#F2EEE5",
    list: "#FAF7F1",
    editor: "#F7F3EB",
    preview: "#F7F3EB",
    ink: "#2C2A26",
    ink2: "#5F5A54",
    ink3: "#6E6860",
    thread: "#DDD5C8",
    accent: "#3D5A80",
    accentInk: "#FFFFFF",
    accentSoft: "#E4EBF3",
    syntaxBold: "#7A4E2E",
    quote: "#4F6B4F",
    codeBg: "#F0EEE6",
    searchBg: "#EFEAE0",
  },
  glass: {
    fill: "rgba(255, 252, 247, 0.62)",
    fillStrong: "rgba(255, 252, 247, 0.78)",
    stroke: "rgba(255, 255, 255, 0.62)",
    strokeDark: "rgba(44, 42, 38, 0.06)",
    shadow: "0 6px 18px rgba(44, 42, 38, 0.07), 0 1px 0 rgba(255, 255, 255, 0.55) inset",
  },
  art: { paper: "#FFFCF7", ink: "#2C2A26", muted: "#6E6860", accent: "#3D5A80", code: "#8B5E3C" },
};

/** 暖炭 Nord：与稿一致的深色阅读面，而不是蓝灰 Nord 终端色。 */
const NORD: MobileTheme = {
  id: "nord",
  name: "Nord",
  palette: {
    paper: "#1C1A18",
    sidebar: "#24211E",
    list: "#26231F",
    editor: "#1C1A18",
    preview: "#1C1A18",
    ink: "#EDE9E3",
    ink2: "#B0AAA2",
    ink3: "#9A948C",
    thread: "#33302C",
    accent: "#7A9CC0",
    accentInk: "#0A0A0A",
    accentSoft: "#2A3340",
    syntaxBold: "#C4A484",
    quote: "#8FAF8F",
    codeBg: "#26231F",
    searchBg: "#2A2723",
  },
  glass: {
    fill: "rgba(38, 35, 31, 0.58)",
    fillStrong: "rgba(48, 44, 39, 0.70)",
    stroke: "rgba(255, 255, 255, 0.14)",
    strokeDark: "rgba(0, 0, 0, 0.35)",
    shadow: "0 14px 34px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 255, 255, 0.05) inset",
  },
  art: { paper: "#1C1A18", ink: "#EDE9E3", muted: "#9A948C", accent: "#7A9CC0", code: "#C4A484" },
};

const NEWSPRINT: MobileTheme = {
  id: "newsprint",
  name: "Newsprint",
  palette: {
    paper: "#F4F4F1",
    sidebar: "#ECECE9",
    list: "#F7F7F4",
    editor: "#F4F4F1",
    preview: "#F4F4F1",
    ink: "#2C2C2A",
    ink2: "#5F5F5C",
    ink3: "#6E6E6C",
    thread: "#DBD6C8",
    accent: "#2F5E89",
    accentInk: "#FFFFFF",
    accentSoft: "#DCE4EC",
    syntaxBold: "#7B6320",
    quote: "#5A783D",
    codeBg: "#E6E6E3",
    searchBg: "#E8E8E5",
  },
  glass: {
    fill: "rgba(255, 255, 252, 0.62)",
    fillStrong: "rgba(255, 255, 252, 0.80)",
    stroke: "rgba(255, 255, 255, 0.60)",
    strokeDark: "rgba(44, 44, 42, 0.06)",
    shadow: "0 6px 18px rgba(44, 44, 42, 0.07), 0 1px 0 rgba(255, 255, 255, 0.55) inset",
  },
  art: { paper: "#F4F4F1", ink: "#2C2C2A", muted: "#6E6E6C", accent: "#2F5E89", code: "#8B5E3C" },
};

/** 设置页展示的三套签名主题；其余主题在 iOS 上按明暗归到 Paper / Nord。 */
export const MOBILE_THEMES: readonly MobileTheme[] = [PAPER, NORD, NEWSPRINT];

const BY_ID = new Map(MOBILE_THEMES.map(theme => [theme.id, theme]));

export function mobileThemeId(): MobileThemeId {
  const id = themeId();
  if (id === "newsprint") return "newsprint";
  return themePreset(id).mode === "dark" ? "nord" : "paper";
}

export function mobileTheme(): MobileTheme {
  return BY_ID.get(mobileThemeId()) ?? PAPER;
}

const PALETTE_KEYS = [
  "paper", "sidebar", "list", "editor", "preview", "ink", "ink2", "ink3", "thread",
  "accent", "accentInk", "accentSoft", "syntaxBold", "quote", "codeBg", "searchBg",
] as const satisfies readonly (keyof ThemePalette)[];

const GLASS_KEYS = ["fill", "fillStrong", "stroke", "strokeDark", "shadow"] as const satisfies readonly (keyof GlassTokens)[];

/** 每次读取颜色都回查主题信号，组件里缓存下来的调色板也会随主题切换更新。 */
function live<T extends object>(keys: readonly (keyof T)[], read: () => T): T {
  const out = {} as T;
  for (const key of keys) {
    Object.defineProperty(out, key, { enumerable: true, get: () => read()[key] });
  }
  return out;
}

/** iOS 一律使用 Cream×Glass 调色板；Mac 的 25 套主题不受影响。 */
export function mobileColors(): ThemePalette {
  return live(PALETTE_KEYS, () => mobileTheme().palette);
}

export function glass(): GlassTokens {
  return live(GLASS_KEYS, () => mobileTheme().glass);
}

export function mobileIsDark(): boolean {
  return mobileThemeId() === "nord";
}
