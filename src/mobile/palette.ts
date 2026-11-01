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

/** 浅色界面直接采用 iOS 系统语义色，不做自绘配色。 */
const PAPER: MobileTheme = {
  id: "paper",
  name: "Paper",
  palette: {
    paper: "#F2F2F7",
    sidebar: "#F2F2F7",
    list: "#FFFFFF",
    editor: "#FFFFFF",
    preview: "#FFFFFF",
    ink: "#000000",
    ink2: "#6C6C70",
    ink3: "#8E8E93",
    thread: "#C6C6C8",
    accent: "#007AFF",
    accentInk: "#FFFFFF",
    accentSoft: "#DCEBFF",
    syntaxBold: "#A15C00",
    quote: "#2F7D4F",
    codeBg: "#F2F2F7",
    searchBg: "rgba(118, 118, 128, 0.12)",
  },
  glass: {
    fill: "rgba(255, 255, 255, 0.22)",
    fillStrong: "rgba(255, 255, 255, 0.55)",
    stroke: "rgba(255, 255, 255, 0.42)",
    strokeDark: "rgba(0, 0, 0, 0.06)",
    shadow: "0 12px 30px rgba(0, 0, 0, 0.10)",
  },
  art: { paper: "#FFFFFF", ink: "#000000", muted: "#8E8E93", accent: "#007AFF", code: "#A15C00" },
};

/** 夜间使用系统黑与 systemBlue，玻璃层只留很轻的边缘。 */
const NORD: MobileTheme = {
  id: "nord",
  name: "Nord",
  palette: {
    paper: "#000000",
    sidebar: "#000000",
    list: "#1C1C1E",
    editor: "#000000",
    preview: "#000000",
    ink: "#FFFFFF",
    ink2: "#8E8E93",
    ink3: "#8E8E93",
    thread: "#38383A",
    accent: "#0A84FF",
    accentInk: "#FFFFFF",
    accentSoft: "#0A2B4F",
    syntaxBold: "#F0B35A",
    quote: "#7DCB9A",
    codeBg: "#1C1C1E",
    searchBg: "rgba(118, 118, 128, 0.24)",
  },
  glass: {
    fill: "rgba(28, 28, 30, 0.22)",
    fillStrong: "rgba(28, 28, 30, 0.55)",
    stroke: "rgba(255, 255, 255, 0.14)",
    strokeDark: "rgba(0, 0, 0, 0.35)",
    shadow: "0 16px 36px rgba(0, 0, 0, 0.45)",
  },
  art: { paper: "#1C1C1E", ink: "#FFFFFF", muted: "#98989F", accent: "#0A84FF", code: "#F0B35A" },
};

const NEWSPRINT: MobileTheme = {
  id: "newsprint",
  name: "Newsprint",
  palette: {
    paper: "#F2F2F7",
    sidebar: "#F2F2F7",
    list: "#FFFFFF",
    editor: "#FFFFFF",
    preview: "#FFFFFF",
    ink: "#000000",
    ink2: "#6C6C70",
    ink3: "#8E8E93",
    thread: "#C6C6C8",
    accent: "#007AFF",
    accentInk: "#FFFFFF",
    accentSoft: "#DCEBFF",
    syntaxBold: "#8A5A00",
    quote: "#2F7D4F",
    codeBg: "#F2F2F7",
    searchBg: "rgba(118, 118, 128, 0.12)",
  },
  glass: {
    fill: "rgba(255, 255, 255, 0.22)",
    fillStrong: "rgba(255, 255, 255, 0.55)",
    stroke: "rgba(255, 255, 255, 0.42)",
    strokeDark: "rgba(0, 0, 0, 0.06)",
    shadow: "0 12px 30px rgba(0, 0, 0, 0.10)",
  },
  art: { paper: "#FFFFFF", ink: "#000000", muted: "#8E8E93", accent: "#007AFF", code: "#8A5A00" },
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
