import { setColorScheme, signal } from "nsh";
import { loadSavedTheme, saveTheme } from "./prefs";

/** Curated light and dark terminal themes. */
export type ThemeId =
  | "merino-light"
  | "silver-point-dark"
  | "alpine-milk"
  | "buttercream-diner"
  | "coastal-linen"
  | "glacier-mint"
  | "ivory-gallery"
  | "lavender-postcard"
  | "newsprint-fog"
  | "orchard-breeze"
  | "porcelain-morning"
  | "ink-meridian"
  | "merino-dark"
  | "static-noir"
  | "dracula"
  | "vesper"
  | "rose-pine"
  | "kanagawa-wave"
  | "gruvbox-dark"
  | "catppuccin-mocha";

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
  /** Background, accent, green and red source colors shown in the picker. */
  swatches: readonly [string, string, string, string];
};

function rgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function hex(value: [number, number, number]): string {
  return `#${value.map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function mix(a: string, b: string, amount: number): string {
  const left = rgb(a);
  const right = rgb(b);
  return hex([
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
  ]);
}

function luminance(color: string): number {
  const channels = rgb(color)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

/** Keep the document surfaces faithful to the terminal scheme's background. */
function palette(
  background: string,
  foreground: string,
  accent: string,
  green: string,
  red: string,
  mode: ThemeMode,
  overrides: Partial<Pick<ThemePalette, "paper" | "sidebar" | "list" | "editor" | "preview" | "ink2" | "ink3" | "thread" | "codeBg" | "searchBg">> = {},
): ThemePalette {
  const light = mode === "light";
  const paper = overrides.paper ?? background;
  const sidebar = overrides.sidebar ?? mix(background, "#000000", light ? 0.035 : 0.08);
  // Keep navigation surfaces neutral; the accent belongs to selection and controls.
  const list = overrides.list ?? mix(background, foreground, light ? 0.035 : 0.12);
  const ink2 = overrides.ink2 ?? mix(foreground, background, light ? 0.28 : 0.32);
  const ink3 = overrides.ink3 ?? mix(foreground, background, light ? 0.52 : 0.54);
  const thread = overrides.thread ?? mix(foreground, background, light ? 0.82 : 0.78);
  return {
    paper,
    sidebar,
    list,
    editor: overrides.editor ?? paper,
    preview: overrides.preview ?? paper,
    ink: foreground,
    ink2,
    ink3,
    thread,
    accent,
    accentInk: luminance(accent) > 0.48 ? "#111111" : "#FFFFFF",
    accentSoft: mix(accent, background, light ? 0.84 : 0.72),
    // Keep Markdown readable: green/red remain reserved for status indicators.
    syntaxBold: ink2,
    quote: ink2,
    codeBg: overrides.codeBg ?? mix(background, foreground, light ? 0.06 : 0.08),
    searchBg: overrides.searchBg ?? mix(background, foreground, light ? 0.1 : 0.12),
  };
}

const definition = (
  id: ThemeId,
  name: string,
  mode: ThemeMode,
  background: string,
  foreground: string,
  accent: string,
  green: string,
  red: string,
  overrides?: Parameters<typeof palette>[6],
): ThemePreset => ({
  id,
  name,
  mode,
  palette: palette(background, foreground, accent, green, red, mode, overrides),
  swatches: [background, accent, green, red],
});

export const THEMES: readonly ThemePreset[] = [
  // Rex's Merino Light source and semantic colors.
  definition("merino-light", "Merino Light", "light", "#FFFFFF", "#1F2328", "#0969DA", "#116329", "#CF222E", {
    paper: "#F6F7F9",
    sidebar: "#ECEEF2",
    list: "#F8F9FB",
    editor: "#FFFFFF",
    preview: "#F8F9FB",
    ink2: "#696D71",
    ink3: "#878A8E",
    thread: "#D7DADF",
    codeBg: "#F1F3F5",
    searchBg: "#E7E9ED",
  }),
  // Additional Rex themes selected from the local Rex Beta theme catalog.
  definition("alpine-milk", "Alpine Milk", "light", "#FAFAFA", "#333940", "#4A90D9", "#4A9256", "#C94F46"),
  definition("buttercream-diner", "Buttercream Diner", "light", "#FBF3DD", "#4D3F33", "#D1603D", "#5C8A3C", "#C8432F"),
  definition("coastal-linen", "Coastal Linen", "light", "#FAF6EE", "#3D4652", "#2F8FA6", "#57904D", "#C25547"),
  definition("glacier-mint", "Glacier Mint", "light", "#F0F9F6", "#2F4640", "#2AA88A", "#3D9060", "#C05045"),
  definition("ivory-gallery", "Ivory Gallery", "light", "#FFFFFF", "#1F2328", "#1A6FD4", "#2F7D3C", "#C13A24"),
  definition("lavender-postcard", "Lavender Postcard", "light", "#F7F4FB", "#40374F", "#7A5BBF", "#4A8F56", "#C04E56"),
  definition("newsprint-fog", "Newsprint Fog", "light", "#F2F2F0", "#333331", "#B3402E", "#5D7F52", "#B3402E"),
  definition("orchard-breeze", "Orchard Breeze", "light", "#F4F9EF", "#3A4A35", "#5DA24F", "#4F9440", "#C65043"),
  definition("porcelain-morning", "Porcelain Morning", "light", "#F7F9FA", "#2E3A42", "#2277CC", "#3D8A4E", "#C74E42"),
  // Rex's monochrome Silver Point Dark source and semantic colors.
  definition("silver-point-dark", "Silver Point Dark", "dark", "#131313", "#B4B4B4", "#767676", "#707070", "#B4B4B4", {
    paper: "#131313",
    sidebar: "#1A1A1A",
    list: "#171717",
    editor: "#171717",
    preview: "#171717",
    ink2: "#898989",
    ink3: "#6C6C6C",
    thread: "#303030",
    codeBg: "#202020",
    searchBg: "#262626",
  }),
  definition("ink-meridian", "Ink Meridian", "dark", "#101623", "#CCD6EA", "#83A8F2", "#7CBF8E", "#DE6E7C"),
  definition("merino-dark", "Merino Dark", "dark", "#0D1117", "#E6EDF3", "#2F81F7", "#3FB950", "#FF7B72"),
  definition("static-noir", "Static Noir", "dark", "#0A0A0A", "#EDEDED", "#FF3B30", "#9FD08A", "#FF4D42"),
  // Popular Ghostty themes sourced from the iTerm2 Color Schemes collection.
  definition("dracula", "Dracula", "dark", "#282A36", "#F8F8F2", "#BD93F9", "#50FA7B", "#FF5555"),
  definition("vesper", "Vesper", "dark", "#101010", "#FFFFFF", "#ACA1CF", "#90B99F", "#F5A191"),
  definition("rose-pine", "Rose Pine", "dark", "#191724", "#E0DEF4", "#9CCFD8", "#31748F", "#EB6F92"),
  definition("kanagawa-wave", "Kanagawa Wave", "dark", "#1F1F28", "#DCD7BA", "#7E9CD8", "#76946A", "#C34043"),
  definition("gruvbox-dark", "Gruvbox Dark", "dark", "#282828", "#EBDBB2", "#458588", "#98971A", "#CC241D"),
  definition("catppuccin-mocha", "Catppuccin Mocha", "dark", "#1E1E2E", "#CDD6F4", "#89B4FA", "#A6E3A1", "#F38BA8"),
];

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));
const DEFAULT_THEME_ID: ThemeId = "merino-light";

export const themeId = signal<ThemeId>(DEFAULT_THEME_ID);

/** Accept string values at the persistence boundary so old builds recover safely. */
export function themePreset(id: ThemeId | string = themeId()): ThemePreset {
  return BY_ID.get(id as ThemeId) ?? BY_ID.get(DEFAULT_THEME_ID)!;
}

export function applyTheme(id: ThemeId | string) {
  const preset = themePreset(id);
  themeId.set(preset.id);
  setColorScheme(preset.mode);
  void saveTheme(preset.id);
}

export async function restoreTheme(): Promise<void> {
  const saved = await loadSavedTheme();
  const preset = saved ? themePreset(saved) : themePreset(DEFAULT_THEME_ID);
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
  return themePreset().swatches[kind === "ok" ? 2 : 3];
}
