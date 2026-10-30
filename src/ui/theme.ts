import { setColorScheme, signal } from "nsh";
import { loadSavedTheme, saveTheme } from "./prefs";

/** 外观预设：25 套 Otty 主题，颜色映射到 StoatMD 的 UI token。 */
export type ThemeId =
  | "paper"
  | "newsprint"
  | "april"
  | "one-light"
  | "solarized-light"
  | "ayu-light"
  | "glass-light"
  | "floating-card"
  | "pink"
  | "nord"
  | "tokyo-night"
  | "catppuccin-mocha"
  | "dracula"
  | "gruvbox-dark"
  | "one-dark"
  | "solarized-dark"
  | "rose-pine"
  | "monokai-classic"
  | "night"
  | "owl"
  | "seafoam-pastel"
  | "april-dark"
  | "ayu-dark"
  | "acrylic-dark"
  | "glass-dark";

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
  /** 强调色背景上的文字色：亮强调色用深字，深强调色用白字。 */
  accentInk: string;
  accentSoft: string;
  syntaxBold: string;
  quote: string;
  codeBg: string;
  searchBg: string;
};

export type ThemePreset = {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  palette: ThemePalette;
};

// 颜色取自 Otty 的 terminal / token / panel 段；缺少 UI token 的主题按对比度
// 派生，正文、次级文字和按钮文字都按背景校准到可读范围。
export const THEMES: readonly ThemePreset[] = [
  {
    id: "paper",
    name: "Paper",
    mode: "light",
    palette: {
      paper: "#FCFBF9",
      sidebar: "#F5F4F0",
      list: "#F3F2F0",
      editor: "#FCFBF9",
      preview: "#FCFBF9",
      ink: "#1A1A1A",
      ink2: "#5C5B54",
      ink3: "#6D6B65",
      thread: "#E0DFD5",
      accent: "#2B5937",
      accentInk: "#FFFFFF",
      accentSoft: "#DBE1DA",
      syntaxBold: "#A65920",
      quote: "#2B5937",
      codeBg: "#F5F4F0",
      searchBg: "#EEEEEC",
    },
  },
  {
    id: "newsprint",
    name: "Newsprint",
    mode: "light",
    palette: {
      paper: "#F4F4F1",
      sidebar: "#ECECE9",
      list: "#ECECE9",
      editor: "#F4F4F1",
      preview: "#F4F4F1",
      ink: "#262522",
      ink2: "#5A574F",
      ink3: "#6A6760",
      thread: "#DBD6C8",
      accent: "#2F5E89",
      accentInk: "#FFFFFF",
      accentSoft: "#D4DCE0",
      syntaxBold: "#7B6320",
      quote: "#5A783D",
      codeBg: "#E6E6E3",
      searchBg: "#E8E8E5",
    },
  },
  {
    id: "april",
    name: "April",
    mode: "light",
    palette: {
      paper: "#FFFFFF",
      sidebar: "#F4F6F4",
      list: "#F6F7F7",
      editor: "#FFFFFF",
      preview: "#FFFFFF",
      ink: "#2A332E",
      ink2: "#55605B",
      ink3: "#666F6B",
      thread: "#E0E6E2",
      accent: "#457E02",
      accentInk: "#FFFFFF",
      accentSoft: "#E2EBD7",
      syntaxBold: "#8C692C",
      quote: "#498502",
      codeBg: "#F4F6F4",
      searchBg: "#F2F3F2",
    },
  },
  {
    id: "one-light",
    name: "One Light",
    mode: "light",
    palette: {
      paper: "#F8F8F8",
      sidebar: "#F0F0F0",
      list: "#F0F0F0",
      editor: "#F8F8F8",
      preview: "#F8F8F8",
      ink: "#2A2B33",
      ink2: "#58585A",
      ink3: "#6A6A6F",
      thread: "#D7D7D8",
      accent: "#2F59F1",
      accentInk: "#FFFFFF",
      accentSoft: "#D8DFF7",
      syntaxBold: "#776746",
      quote: "#358032",
      codeBg: "#EAEAEA",
      searchBg: "#ECECEC",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    mode: "light",
    palette: {
      paper: "#FDF6E3",
      sidebar: "#F6F1DF",
      list: "#F6F1DF",
      editor: "#FDF6E3",
      preview: "#FDF6E3",
      ink: "#586E75",
      ink2: "#565854",
      ink3: "#676C6A",
      thread: "#E3E0D1",
      accent: "#1F72AD",
      accentInk: "#FFFFFF",
      accentSoft: "#DAE2DB",
      syntaxBold: "#856400",
      quote: "#687700",
      codeBg: "#F1ECDB",
      searchBg: "#F3EEDC",
    },
  },
  {
    id: "ayu-light",
    name: "Ayu Light",
    mode: "light",
    palette: {
      paper: "#FCFCFC",
      sidebar: "#F3F3F3",
      list: "#FFFFFF",
      editor: "#FCFCFC",
      preview: "#FCFCFC",
      ink: "#1A1A1A",
      ink2: "#5B5B5E",
      ink3: "#6B6B6B",
      thread: "#E0E0E0",
      accent: "#3172A9",
      accentInk: "#FFFFFF",
      accentSoft: "#DCE7F0",
      syntaxBold: "#8B612E",
      quote: "#5F7F1B",
      codeBg: "#ECECEC",
      searchBg: "#EEEEEE",
    },
  },
  {
    id: "glass-light",
    name: "Glass Light",
    mode: "light",
    palette: {
      paper: "#FFFFFF",
      sidebar: "#F7F7F7",
      list: "#F7FBFD",
      editor: "#FFFFFF",
      preview: "#FFFFFF",
      ink: "#303030",
      ink2: "#555F68",
      ink3: "#667076",
      thread: "#DEDEDE",
      accent: "#3E7799",
      accentInk: "#FFFFFF",
      accentSoft: "#E1EAF0",
      syntaxBold: "#AD541D",
      quote: "#0A7E3C",
      codeBg: "#F7FBFD",
      searchBg: "#F3F3F3",
    },
  },
  {
    id: "floating-card",
    name: "Floating Card",
    mode: "light",
    palette: {
      paper: "#FFFFFF",
      sidebar: "#F6F6F6",
      list: "#FAFAFA",
      editor: "#FFFFFF",
      preview: "#FFFFFF",
      ink: "#18181B",
      ink2: "#51515A",
      ink3: "#6D6D72",
      thread: "#E5E5E5",
      accent: "#000000",
      accentInk: "#FFFFFF",
      accentSoft: "#D6D6D6",
      syntaxBold: "#8D6E06",
      quote: "#208738",
      codeBg: "#FAFAFA",
      searchBg: "#F1F1F1",
    },
  },
  {
    id: "pink",
    name: "Pink",
    mode: "light",
    palette: {
      paper: "#F5F0F0",
      sidebar: "#F0EAEA",
      list: "#FBF7F6",
      editor: "#F5F0F0",
      preview: "#F5F0F0",
      ink: "#2A2422",
      ink2: "#5D5451",
      ink3: "#6B6562",
      thread: "#E5DCDA",
      accent: "#8D5C67",
      accentInk: "#FFFFFF",
      accentSoft: "#E5D9DB",
      syntaxBold: "#8D6623",
      quote: "#5F753B",
      codeBg: "#FBF7F6",
      searchBg: "#E9E4E4",
    },
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
    palette: {
      paper: "#2E3440",
      sidebar: "#373D49",
      list: "#3B4252",
      editor: "#2E3440",
      preview: "#2E3440",
      ink: "#E5E9F0",
      ink2: "#C1C8D3",
      ink3: "#ABAFBA",
      thread: "#434C5E",
      accent: "#89C1D0",
      accentInk: "#0A0A0A",
      accentSoft: "#3E4D5A",
      syntaxBold: "#EBCC8C",
      quote: "#A4BF8D",
      codeBg: "#3B4252",
      searchBg: "#3B404B",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    mode: "dark",
    palette: {
      paper: "#1A1B26",
      sidebar: "#222430",
      list: "#222430",
      editor: "#1A1B26",
      preview: "#1A1B26",
      ink: "#C0CAF5",
      ink2: "#9DA0AF",
      ink3: "#888DA6",
      thread: "#353747",
      accent: "#7BA3F7",
      accentInk: "#0A0A0A",
      accentSoft: "#2A3147",
      syntaxBold: "#E0B06A",
      quote: "#9FCE6B",
      codeBg: "#262734",
      searchBg: "#242632",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    mode: "dark",
    palette: {
      paper: "#1E1E2E",
      sidebar: "#272738",
      list: "#272738",
      editor: "#1E1E2E",
      preview: "#1E1E2E",
      ink: "#CDD6F4",
      ink2: "#A0A3B0",
      ink3: "#8E91A7",
      thread: "#3A3B4E",
      accent: "#8AB5FA",
      accentInk: "#0A0A0A",
      accentSoft: "#2F364F",
      syntaxBold: "#F9E2B0",
      quote: "#A7E3A2",
      codeBg: "#2A2B3C",
      searchBg: "#28293A",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    mode: "dark",
    palette: {
      paper: "#282A36",
      sidebar: "#32343F",
      list: "#32343F",
      editor: "#282A36",
      preview: "#282A36",
      ink: "#F8F8F2",
      ink2: "#B0B0B3",
      ink3: "#9FA0A2",
      thread: "#494B54",
      accent: "#BE94F9",
      accentInk: "#0A0A0A",
      accentSoft: "#403B55",
      syntaxBold: "#F1FA8D",
      quote: "#52FA7C",
      codeBg: "#373843",
      searchBg: "#343641",
    },
  },
  {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    mode: "dark",
    palette: {
      paper: "#282828",
      sidebar: "#32312F",
      list: "#32312F",
      editor: "#282828",
      preview: "#282828",
      ink: "#EBDBB2",
      ink2: "#B0ACA2",
      ink3: "#A39C88",
      thread: "#47453E",
      accent: "#71A2A4",
      accentInk: "#0A0A0A",
      accentSoft: "#313A3A",
      syntaxBold: "#D79A23",
      quote: "#99981C",
      codeBg: "#363532",
      searchBg: "#343330",
    },
  },
  {
    id: "one-dark",
    name: "One Dark",
    mode: "dark",
    palette: {
      paper: "#282C34",
      sidebar: "#2F333B",
      list: "#2F333B",
      editor: "#282C34",
      preview: "#282C34",
      ink: "#ABB2BF",
      ink2: "#AFB2B7",
      ink3: "#989DA4",
      thread: "#3D414A",
      accent: "#63B0EF",
      accentInk: "#0A0A0A",
      accentSoft: "#314152",
      syntaxBold: "#D19B68",
      quote: "#99C47A",
      codeBg: "#31353E",
      searchBg: "#30343C",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    mode: "dark",
    palette: {
      paper: "#002B36",
      sidebar: "#052E3A",
      list: "#052E3A",
      editor: "#002B36",
      preview: "#002B36",
      ink: "#8D9D9E",
      ink2: "#A0AFB2",
      ink3: "#819598",
      thread: "#153C45",
      accent: "#439AD8",
      accentInk: "#0A0A0A",
      accentSoft: "#093C50",
      syntaxBold: "#B98F0D",
      quote: "#869A03",
      codeBg: "#09323D",
      searchBg: "#052E39",
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    mode: "dark",
    palette: {
      paper: "#191724",
      sidebar: "#23212E",
      list: "#23212E",
      editor: "#191724",
      preview: "#191724",
      ink: "#E0DEF4",
      ink2: "#9E9CA7",
      ink3: "#8C8A9B",
      thread: "#393745",
      accent: "#9DCFD8",
      accentInk: "#0A0A0A",
      accentSoft: "#2E3441",
      syntaxBold: "#F6C278",
      quote: "#5089A0",
      codeBg: "#272533",
      searchBg: "#252330",
    },
  },
  {
    id: "monokai-classic",
    name: "Monokai Classic",
    mode: "dark",
    palette: {
      paper: "#272822",
      sidebar: "#32332C",
      list: "#32332C",
      editor: "#272822",
      preview: "#272822",
      ink: "#FDFFF1",
      ink2: "#ACACA7",
      ink3: "#9E9F95",
      thread: "#494A43",
      accent: "#FD9821",
      accentInk: "#0A0A0A",
      accentSoft: "#493A22",
      syntaxBold: "#E6DB75",
      quote: "#A7E230",
      codeBg: "#363730",
      searchBg: "#34352E",
    },
  },
  {
    id: "night",
    name: "Night",
    mode: "dark",
    palette: {
      paper: "#363B40",
      sidebar: "#3E4349",
      list: "#2E3033",
      editor: "#363B40",
      preview: "#363B40",
      ink: "#DCE4F3",
      ink2: "#C0C5CF",
      ink3: "#ADB2C6",
      thread: "#222426",
      accent: "#89AFFF",
      accentInk: "#0A0A0A",
      accentSoft: "#424D5F",
      syntaxBold: "#FFCC6C",
      quote: "#C4E88E",
      codeBg: "#2E3033",
      searchBg: "#40454B",
    },
  },
  {
    id: "owl",
    name: "Owl",
    mode: "dark",
    palette: {
      paper: "#2F2B2C",
      sidebar: "#383435",
      list: "#383435",
      editor: "#2F2B2C",
      preview: "#2F2B2C",
      ink: "#DEDEDE",
      ink2: "#B2B1B1",
      ink3: "#A1A0A1",
      thread: "#4B4848",
      accent: "#9E9E9E",
      accentInk: "#0A0A0A",
      accentSoft: "#3F3C3C",
      syntaxBold: "#CBCBCB",
      quote: "#999999",
      codeBg: "#3B3838",
      searchBg: "#3A3637",
    },
  },
  {
    id: "seafoam-pastel",
    name: "Seafoam Pastel",
    mode: "dark",
    palette: {
      paper: "#243435",
      sidebar: "#2D3D3D",
      list: "#2D3D3D",
      editor: "#243435",
      preview: "#243435",
      ink: "#D4E7D4",
      ink2: "#B0BAB6",
      ink3: "#9CAAA2",
      thread: "#40514E",
      accent: "#8BAAAE",
      accentInk: "#0A0A0A",
      accentSoft: "#324547",
      syntaxBold: "#B5AA7B",
      quote: "#8AA07D",
      codeBg: "#304140",
      searchBg: "#2F3F3F",
    },
  },
  {
    id: "april-dark",
    name: "April Dark",
    mode: "dark",
    palette: {
      paper: "#141B18",
      sidebar: "#202624",
      list: "#1A2420",
      editor: "#141B18",
      preview: "#141B18",
      ink: "#FFFFFF",
      ink2: "#93A19B",
      ink3: "#87928C",
      thread: "#25332D",
      accent: "#C6E86D",
      accentInk: "#0A0A0A",
      accentSoft: "#303C26",
      syntaxBold: "#E5C17C",
      quote: "#99C47A",
      codeBg: "#1A2420",
      searchBg: "#222926",
    },
  },
  {
    id: "ayu-dark",
    name: "Ayu Dark",
    mode: "dark",
    palette: {
      paper: "#0A0E14",
      sidebar: "#12161C",
      list: "#12161C",
      editor: "#0A0E14",
      preview: "#0A0E14",
      ink: "#B3B1AD",
      ink2: "#C1C1C1",
      ink3: "#A0A0A0",
      thread: "#25282C",
      accent: "#55BEFA",
      accentInk: "#0A0A0A",
      accentSoft: "#162A39",
      syntaxBold: "#F9B051",
      quote: "#92B464",
      codeBg: "#16191F",
      searchBg: "#14181D",
    },
  },
  {
    id: "acrylic-dark",
    name: "Acrylic Dark",
    mode: "dark",
    palette: {
      paper: "#202020",
      sidebar: "#2C2C2C",
      list: "#383838",
      editor: "#202020",
      preview: "#202020",
      ink: "#FFFFFF",
      ink2: "#C6C6C6",
      ink3: "#A2A2A2",
      thread: "#454545",
      accent: "#62CEFF",
      accentInk: "#0A0A0A",
      accentSoft: "#363636",
      syntaxBold: "#D5A42D",
      quote: "#41C03E",
      codeBg: "#383838",
      searchBg: "#2D2D2D",
    },
  },
  {
    id: "glass-dark",
    name: "Glass Dark",
    mode: "dark",
    palette: {
      paper: "#444445",
      sidebar: "#4D4D4E",
      list: "#4D4D4E",
      editor: "#444445",
      preview: "#444445",
      ink: "#F7F8FF",
      ink2: "#CFD3DF",
      ink3: "#BDC2CD",
      thread: "#6B7286",
      accent: "#B5D97A",
      accentInk: "#0A0A0A",
      accentSoft: "#565C4D",
      syntaxBold: "#E8C879",
      quote: "#A9D470",
      codeBg: "#515152",
      searchBg: "#4F4F50",
    },
  },
];

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

/** 旧主题 id 映射到最接近的 Otty 主题，升级后保留用户原来的明暗倾向。 */
const LEGACY_THEME_IDS: Readonly<Record<string, ThemeId>> = {
  "weave-paper": "paper",
  "pure-white": "floating-card",
  sage: "april",
  "ink-gray": "newsprint",
  sand: "paper",
  "mist-blue": "ayu-light",
  "sakura-mist": "pink",
  celadon: "april",
  "warm-charcoal": "night",
  "deep-indigo": "tokyo-night",
  "dusk-violet": "catppuccin-mocha",
  "pine-smoke": "april-dark",
};

export const themeId = signal<ThemeId>("paper");

export function themePreset(id: ThemeId = themeId()): ThemePreset {
  return BY_ID.get(id) ?? THEMES[0];
}

export function applyTheme(id: ThemeId) {
  themeId.set(id);
  setColorScheme(themePreset(id).mode);
  void saveTheme(id);
}

/** 启动时恢复主题偏好（旧 id 映射到新主题，无效值回落到 Paper）。 */
export async function restoreTheme(): Promise<void> {
  const saved = await loadSavedTheme();
  if (saved) {
    const id = BY_ID.has(saved as ThemeId)
      ? (saved as ThemeId)
      : LEGACY_THEME_IDS[saved];
    if (id) themeId.set(id);
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

/** 成功 / 冲突状态色（主题 token 没定义状态色，按明暗取通用值）。 */
export function statusColor(kind: "ok" | "danger"): string {
  const dark = isDarkTheme();
  if (kind === "ok") return dark ? "#7FB08A" : "#5A8A62";
  return dark ? "#D98B82" : "#B4544A";
}
