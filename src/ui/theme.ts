import { setColorScheme, signal } from "nsh";
import { loadSavedTheme, saveTheme } from "./prefs";

/** 外观预设：DESIGN.md 的 12 套 token（8 light + 4 dark）。 */
export type ThemeId =
  | "weave-paper"
  | "pure-white"
  | "sage"
  | "ink-gray"
  | "sand"
  | "mist-blue"
  | "sakura-mist"
  | "celadon"
  | "warm-charcoal"
  | "deep-indigo"
  | "dusk-violet"
  | "pine-smoke";

export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  paper: string;
  sidebar: string;
  list: string;
  editor: string;
  preview: string;
  ink: string;
  ink2: string;
  ink3: string;
  thread: string;
  accent: string;
  accentSoft: string;
  syntaxBold: string;
  quote: string;
  codeBg: string;
  quoteBg: string;
  searchBg: string;
};

export type ThemePreset = {
  id: ThemeId;
  nameKey: string;
  mode: ThemeMode;
  palette: ThemePalette;
};

const lightSyntax = {
  syntaxBold: "#8B5E3C",
  quote: "#4F6B4F",
  codeBg: "rgba(139,94,60,0.08)",
  quoteBg: "rgba(90,122,90,0.07)",
};
const darkSyntax = {
  syntaxBold: "#C4A484",
  quote: "#8FAF8F",
  codeBg: "rgba(196,164,132,0.12)",
  quoteBg: "rgba(143,175,143,0.10)",
};
const lightField = { searchBg: "rgba(44,42,38,0.05)" };
const darkField = { searchBg: "rgba(255,255,255,0.06)" };

export const THEMES: readonly ThemePreset[] = [
  {
    id: "weave-paper",
    nameKey: "settings.theme.weavePaper",
    mode: "light",
    palette: {
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
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "pure-white",
    nameKey: "settings.theme.pureWhite",
    mode: "light",
    palette: {
      paper: "#FFFFFF",
      sidebar: "#F5F5F5",
      list: "#FAFAFA",
      editor: "#FFFFFF",
      preview: "#FFFFFF",
      ink: "#1A1A1A",
      ink2: "#5C5C5C",
      ink3: "#737373",
      thread: "#E5E5E5",
      accent: "#3D5A80",
      accentSoft: "#E8EEF5",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "sage",
    nameKey: "settings.theme.sage",
    mode: "light",
    palette: {
      paper: "#F2F4F0",
      sidebar: "#E8EBE4",
      list: "#F6F7F4",
      editor: "#F9FAF7",
      preview: "#F9FAF7",
      ink: "#2A2E28",
      ink2: "#5A6058",
      ink3: "#6E746C",
      thread: "#D0D6CC",
      accent: "#5A7A62",
      accentSoft: "#E0E8E2",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "ink-gray",
    nameKey: "settings.theme.inkGray",
    mode: "light",
    palette: {
      paper: "#F4F4F2",
      sidebar: "#EAEAE8",
      list: "#F7F7F5",
      editor: "#FAFAF8",
      preview: "#FAFAF8",
      ink: "#2C2C2A",
      ink2: "#5A5A58",
      ink3: "#6E6E6C",
      thread: "#D4D4D2",
      accent: "#555555",
      accentSoft: "#E8E8E6",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "sand",
    nameKey: "settings.theme.sand",
    mode: "light",
    palette: {
      paper: "#F5EDE3",
      sidebar: "#EDE3D6",
      list: "#F8F2EA",
      editor: "#FBF6F0",
      preview: "#FBF6F0",
      ink: "#3A2F26",
      ink2: "#6A5A4C",
      ink3: "#7E6E60",
      thread: "#D9CBB8",
      accent: "#7A5C3E",
      accentSoft: "#EDE4D8",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "mist-blue",
    nameKey: "settings.theme.mistBlue",
    mode: "light",
    palette: {
      paper: "#F0F3F7",
      sidebar: "#E8EDF3",
      list: "#F4F6F9",
      editor: "#F7F9FC",
      preview: "#F7F9FC",
      ink: "#2A3038",
      ink2: "#5A6470",
      ink3: "#6E7884",
      thread: "#D0D8E2",
      accent: "#5A7A9A",
      accentSoft: "#E2EAF2",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "sakura-mist",
    nameKey: "settings.theme.sakuraMist",
    mode: "light",
    palette: {
      paper: "#F8F2F3",
      sidebar: "#F0E8EA",
      list: "#FAF5F6",
      editor: "#FCF8F9",
      preview: "#FCF8F9",
      ink: "#3A2E32",
      ink2: "#6A5A60",
      ink3: "#7E6E74",
      thread: "#E0D4D6",
      accent: "#9A6B78",
      accentSoft: "#F0E4E7",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "celadon",
    nameKey: "settings.theme.celadon",
    mode: "light",
    palette: {
      paper: "#F0F4F1",
      sidebar: "#E6EBE7",
      list: "#F4F7F5",
      editor: "#F7FAF8",
      preview: "#F7FAF8",
      ink: "#2A322C",
      ink2: "#5A645C",
      ink3: "#6E786F",
      thread: "#D0D8D2",
      accent: "#5A7A68",
      accentSoft: "#E0E8E2",
      ...lightSyntax,
      ...lightField,
    },
  },
  {
    id: "warm-charcoal",
    nameKey: "settings.theme.warmCharcoal",
    mode: "dark",
    palette: {
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
      ...darkSyntax,
      ...darkField,
    },
  },
  {
    id: "deep-indigo",
    nameKey: "settings.theme.deepIndigo",
    mode: "dark",
    palette: {
      paper: "#151A24",
      sidebar: "#1A2130",
      list: "#1C2434",
      editor: "#171E2A",
      preview: "#171E2A",
      ink: "#E4E8F0",
      ink2: "#A8B0C0",
      ink3: "#8E96A6",
      thread: "#2A3344",
      accent: "#5B7FB5",
      accentSoft: "#243047",
      ...darkSyntax,
      ...darkField,
    },
  },
  {
    id: "dusk-violet",
    nameKey: "settings.theme.duskViolet",
    mode: "dark",
    palette: {
      paper: "#1E1A22",
      sidebar: "#242028",
      list: "#26222A",
      editor: "#211D25",
      preview: "#211D25",
      ink: "#E8E4EC",
      ink2: "#B0A8B8",
      ink3: "#968E9E",
      thread: "#342E3A",
      accent: "#9A7AB0",
      accentSoft: "#2E2836",
      ...darkSyntax,
      ...darkField,
    },
  },
  {
    id: "pine-smoke",
    nameKey: "settings.theme.pineSmoke",
    mode: "dark",
    palette: {
      paper: "#181C18",
      sidebar: "#1C221C",
      list: "#1E241E",
      editor: "#1A201A",
      preview: "#1A201A",
      ink: "#E4E8E4",
      ink2: "#A8B0A8",
      ink3: "#8E968E",
      thread: "#2C322C",
      accent: "#7A9A7A",
      accentSoft: "#243024",
      ...darkSyntax,
      ...darkField,
    },
  },
];

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export const themeId = signal<ThemeId>("weave-paper");

export function themePreset(id: ThemeId = themeId()): ThemePreset {
  return BY_ID.get(id) ?? THEMES[0];
}

export function applyTheme(id: ThemeId) {
  themeId.set(id);
  setColorScheme(themePreset(id).mode);
  void saveTheme(id);
}

/** 启动时恢复主题偏好（无效或旧值回落到默认）。 */
export async function restoreTheme(): Promise<void> {
  const saved = await loadSavedTheme();
  if (saved && BY_ID.has(saved as ThemeId)) {
    themeId.set(saved as ThemeId);
  }
  setColorScheme(themePreset(themeId()).mode);
}

export function isDarkTheme(): boolean {
  return themePreset().mode === "dark";
}

/** 当前主题的完整 token；UI 直接读它，主题切换时所有引用都会跟着更新。 */
export function colors(): ThemePalette {
  return themePreset().palette;
}

/** 成功 / 冲突状态色（token 表没铺满 12 套，按明暗取通用值）。 */
export function statusColor(kind: "ok" | "danger"): string {
  const dark = isDarkTheme();
  if (kind === "ok") return dark ? "#7FB08A" : "#5A8A62";
  return dark ? "#D98B82" : "#B4544A";
}
