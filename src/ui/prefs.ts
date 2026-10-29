import { Storage } from "nsh";

const ROOT_KEY = "vault.root";
const LOCALE_KEY = "prefs.locale";
const THEME_KEY = "prefs.theme";
const FONT_SIZE_KEY = "prefs.fontSize";
const FONT_LINE_KEY = "prefs.fontLineHeight";

/** 读取上次打开的库根。 */
export async function loadSavedRoot(): Promise<string | null> {
  return (await Storage.getItem(ROOT_KEY)) ?? null;
}

/** 持久化库根。 */
export async function saveRoot(path: string): Promise<void> {
  await Storage.setItem(ROOT_KEY, path);
}

/** 清除库根偏好。 */
export async function clearRoot(): Promise<void> {
  await Storage.removeItem(ROOT_KEY);
}

/** 读取语言偏好。 */
export async function loadSavedLocale(): Promise<string | null> {
  return (await Storage.getItem(LOCALE_KEY)) ?? null;
}

/** 持久化语言。 */
export async function saveLocale(locale: string): Promise<void> {
  await Storage.setItem(LOCALE_KEY, locale);
}

/** 读取主题偏好。 */
export async function loadSavedTheme(): Promise<string | null> {
  return (await Storage.getItem(THEME_KEY)) ?? null;
}

/** 持久化主题。 */
export async function saveTheme(theme: string): Promise<void> {
  await Storage.setItem(THEME_KEY, theme);
}

/** 读取字号偏好。 */
export async function loadSavedFontSize(): Promise<string | null> {
  return (await Storage.getItem(FONT_SIZE_KEY)) ?? null;
}

/** 持久化字号。 */
export async function saveFontSize(size: string): Promise<void> {
  await Storage.setItem(FONT_SIZE_KEY, size);
}

/** 读取行高偏好。 */
export async function loadSavedFontLineHeight(): Promise<string | null> {
  return (await Storage.getItem(FONT_LINE_KEY)) ?? null;
}

/** 持久化行高。 */
export async function saveFontLineHeight(lineHeight: string): Promise<void> {
  await Storage.setItem(FONT_LINE_KEY, lineHeight);
}
