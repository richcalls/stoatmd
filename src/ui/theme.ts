import { colorScheme, signal } from "nsh";
import { loadSavedTheme, saveTheme } from "./prefs";

/** 外观预设：默认织线纸白；纯白后置完整接线。 */
export type ThemeId = "weave-paper" | "warm-charcoal" | "pure-white";

export const themeId = signal<ThemeId>("weave-paper");

const VALID: ThemeId[] = ["weave-paper", "warm-charcoal", "pure-white"];

/** 跟随系统或强制浅/深；暖夜炭强制深色，织线纸白/纯白强制浅色。即时生效并写入 prefs。 */
export function applyAppearanceForTheme(id: ThemeId) {
  themeId.set(id);
  void saveTheme(id);
}

/** 启动时恢复主题偏好。 */
export async function restoreTheme(): Promise<void> {
  const saved = await loadSavedTheme();
  if (saved && (VALID as string[]).includes(saved)) {
    themeId.set(saved as ThemeId);
  }
}

export function isDarkTheme(): boolean {
  const id = themeId();
  if (id === "warm-charcoal") return true;
  if (id === "weave-paper" || id === "pure-white") return false;
  return colorScheme() === "dark";
}

/** 织线纸白 / 暖夜炭实体色（与 DESIGN.md 一致；纯白仅占位）。 */
export function colors() {
  const dark = isDarkTheme();
  if (!dark) {
    return {
      paper: "#F7F3EB",
      sidebar: "#F1EBE2",
      list: "#FAF7F1",
      editor: "#FFFCF7",
      preview: "#FFFCF7",
      ink: "#2C2A26",
      ink2: "#5F5A54",
      ink3: "#6E6860",
      thread: "#DDD5C8",
      accent: "#3D5A80",
      accentSoft: "#E4EBF3",
      syntaxBold: "#8B5E3C",
      quote: "#4F6B4F",
    };
  }
  return {
    paper: "#1C1A18",
    sidebar: "#221F1C",
    list: "#24211E",
    editor: "#1F1D1A",
    preview: "#1F1D1A",
    ink: "#EDE9E3",
    ink2: "#B0AAA2",
    ink3: "#9A948C",
    thread: "#33302C",
    accent: "#7A9CC0",
    accentSoft: "#2A3340",
    syntaxBold: "#C4A484",
    quote: "#8FAF8F",
  };
}
