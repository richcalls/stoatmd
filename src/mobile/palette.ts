import { THEMES, themeId, themePreset, type ThemeId, type ThemeMode, type ThemePalette } from "../ui/theme";

export type GlassTokens = {
  fill: string;
  fillStrong: string;
  stroke: string;
  strokeDark: string;
  shadow: string;
};

export type MobileTheme = {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  palette: ThemePalette;
  glass: GlassTokens;
  /** 设置页的小缩略图：纸面 / 标题 / 正文 / 强调色。 */
  art: { paper: string; ink: string; muted: string; accent: string; code: string };
};

/** 浅色主题的液态玻璃：白色半透明 + 极淡描边。 */
const LIGHT_GLASS: GlassTokens = {
  fill: "rgba(255, 255, 255, 0.22)",
  fillStrong: "rgba(255, 255, 255, 0.55)",
  stroke: "rgba(255, 255, 255, 0.42)",
  strokeDark: "rgba(0, 0, 0, 0.06)",
  shadow: "0 12px 30px rgba(0, 0, 0, 0.10)",
};

/** 深色主题：几乎不反射光，只留很轻的边缘和更深的投影。 */
const DARK_GLASS: GlassTokens = {
  fill: "rgba(28, 28, 30, 0.22)",
  fillStrong: "rgba(28, 28, 30, 0.55)",
  stroke: "rgba(255, 255, 255, 0.14)",
  strokeDark: "rgba(0, 0, 0, 0.35)",
  shadow: "0 16px 36px rgba(0, 0, 0, 0.45)",
};

function mobileThemeOf(id: ThemeId): MobileTheme {
  const preset = themePreset(id);
  // 和 Mac 共用同一份色板，不做任何明暗重排：同一个主题在两边是同一组颜色。
  const palette = preset.palette;
  return {
    id: preset.id,
    name: preset.name,
    mode: preset.mode,
    palette,
    glass: preset.mode === "dark" ? DARK_GLASS : LIGHT_GLASS,
    art: {
      paper: palette.list,
      ink: preset.palette.ink,
      muted: preset.palette.ink3,
      accent: preset.palette.accent,
      code: preset.palette.syntaxBold,
    },
  };
}

/** 与 Mac 共用同一份主题与色板，iOS 不另做映射。 */
export const MOBILE_THEMES: readonly MobileTheme[] = THEMES.map(theme => mobileThemeOf(theme.id));

const BY_ID = new Map(MOBILE_THEMES.map(theme => [theme.id, theme]));

export function mobileThemeId(): ThemeId {
  return themeId();
}

export function mobileTheme(): MobileTheme {
  return BY_ID.get(themeId()) ?? MOBILE_THEMES[0];
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

/** iOS 与 Mac 使用同一份主题色板。 */
export function mobileColors(): ThemePalette {
  return live(PALETTE_KEYS, () => mobileTheme().palette);
}

export function glass(): GlassTokens {
  return live(GLASS_KEYS, () => mobileTheme().glass);
}

export function mobileIsDark(): boolean {
  return mobileTheme().mode === "dark";
}
