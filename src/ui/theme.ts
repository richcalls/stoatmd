import { setColorScheme, signal } from "nsh";
import { loadSavedTheme, saveTheme } from "./prefs";

/** Curated appearance presets. */
export type ThemeId =
  | "everest"
  | "aurora-borealis"
  | "sakura"
  | "sequoia"
  | "autumn"
  | "roraima"
  | "istanbul"
  | "miami"
  | "rio-de-janeiro"
  | "paris"
  | "tallinn"
  | "tokyo";

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
  /** The four source swatches shown in the appearance picker. */
  swatches: readonly [string, string, string, string];
};

type ThemeSwatches = readonly [string, string, string, string];

function rgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function hex(value: [number, number, number]): string {
  return `#${value.map(channel => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function mix(a: string, b: string, amount: number): string {
  const left = rgb(a); const right = rgb(b);
  return hex([left[0] + (right[0] - left[0]) * amount, left[1] + (right[1] - left[1]) * amount, left[2] + (right[2] - left[2]) * amount]);
}

function luminance(color: string): number {
  const channels = rgb(color).map(channel => channel / 255).map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

/** Map four theme swatches onto neutral Light/Dark document surfaces. */
function palette(colors: ThemeSwatches, mode: ThemeMode): ThemePalette {
  const [navigation, selected, presence, notifications] = colors;
  if (mode === "light") {
    const paper = "#FFFFFF";
    const ink = "#20242A";
    const syntax = mix(presence, "#000000", 0.18);
    return {
      paper, sidebar: navigation, list: mix(selected, navigation, 0.72), editor: paper, preview: paper, ink,
      ink2: "#5F6873", ink3: "#8A939E", thread: "#D9DEE5",
      accent: notifications, accentInk: luminance(notifications) > 0.48 ? "#111111" : "#FFFFFF",
      accentSoft: mix(notifications, paper, 0.86), syntaxBold: syntax, quote: syntax,
      codeBg: "#F5F6F8", searchBg: "#ECEFF2",
    };
  }
  const paper = "#17191D";
  const ink = "#F4F6F8";
  return {
    paper, sidebar: navigation, list: mix(selected, navigation, 0.48), editor: paper, preview: paper, ink,
    ink2: "#B4BBC5", ink3: "#8E96A3", thread: "#353B45",
    accent: notifications, accentInk: luminance(notifications) > 0.48 ? "#111111" : "#FFFFFF",
    accentSoft: mix(notifications, paper, 0.65), syntaxBold: presence, quote: presence,
    codeBg: "#20242A", searchBg: "#2A2F36",
  };
}

const definition = (id: ThemeId, name: string, mode: ThemeMode, colors: ThemeSwatches): ThemePreset => ({ id, name, mode, palette: palette(colors, mode), swatches: colors });

export const THEMES: readonly ThemePreset[] = [
  definition("everest", "Everest", "light", ["#CADAE0", "#B6D8E5", "#EC9C81", "#246A89"]),
  definition("aurora-borealis", "Aurora Borealis", "dark", ["#1A3746", "#1E3F53", "#A55CC8", "#7AC6F5"]),
  definition("sakura", "Sakura", "light", ["#F8DBE6", "#FFC9DC", "#EFA5BF", "#B54B66"]),
  definition("sequoia", "Sequoia", "dark", ["#394132", "#405133", "#788B40", "#73A621"]),
  definition("autumn", "Autumn", "light", ["#EFE6E0", "#F4D3BD", "#DEA51D", "#A7714C"]),
  definition("roraima", "Roraima", "dark", ["#372C2F", "#582F29", "#8F78B7", "#CC654E"]),
  definition("istanbul", "Istanbul", "light", ["#91D1DA", "#A3DDE5", "#12ACC1", "#087E8E"]),
  definition("miami", "Miami", "dark", ["#5D263A", "#722E47", "#17C7AC", "#FF5FA2"]),
  definition("rio-de-janeiro", "Rio de Janeiro", "light", ["#85B778", "#B8E5AD", "#2287D5", "#375B2E"]),
  definition("paris", "Paris", "dark", ["#6A3C4D", "#5D3F49", "#5E7BB3", "#D18FA8"]),
  definition("tallinn", "Tallinn", "light", ["#A9B9DA", "#BECCEC", "#7179CC", "#3F4494"]),
  definition("tokyo", "Tokyo", "dark", ["#323B66", "#354172", "#714CE3", "#7285DC"]),
];

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export const themeId = signal<ThemeId>("everest");

/** Accept string values at the persistence boundary so old, unpublished builds recover safely. */
export function themePreset(id: ThemeId | string = themeId()): ThemePreset {
  return BY_ID.get(id as ThemeId) ?? THEMES[0];
}

export function applyTheme(id: ThemeId | string) {
  const preset = themePreset(id);
  themeId.set(preset.id);
  setColorScheme(preset.mode);
  void saveTheme(preset.id);
}

export async function restoreTheme(): Promise<void> {
  const saved = await loadSavedTheme();
  const preset = saved ? themePreset(saved) : THEMES[0];
  themeId.set(preset.id);
  setColorScheme(preset.mode);
}

export function isDarkTheme(): boolean {
  return themePreset().mode === "dark";
}

let paletteOverride: (() => ThemePalette) | null = null;

export function setPaletteOverride(read: (() => ThemePalette) | null): void {
  paletteOverride = read;
}

export function colors(): ThemePalette {
  return paletteOverride ? paletteOverride() : themePreset().palette;
}

export function statusColor(kind: "ok" | "danger"): string {
  // Slack's Presence Indication and Notifications swatches carry status
  // meaning in the shell, including the sync dot and error messages.
  return themePreset().swatches[kind === "ok" ? 2 : 3];
}
