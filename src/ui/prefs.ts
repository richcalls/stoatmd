import { Storage } from "nsh";

const ROOT_KEY = "vault.root";
const LOCALE_KEY = "prefs.locale";
const THEME_KEY = "prefs.theme";
const FONT_FAMILY_KEY = "prefs.fontFamily";
const FONT_SIZE_KEY = "prefs.fontSize";
const FONT_LINE_KEY = "prefs.fontLineHeight";
const APP_LOGO_KEY = "prefs.appLogo";
const SETTINGS_FRAME_KEY = "prefs.settingsFrame";

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

/** 读取正文字体偏好。 */
export async function loadSavedFontFamily(): Promise<string | null> {
  return (await Storage.getItem(FONT_FAMILY_KEY)) ?? null;
}

/** 持久化正文字体。 */
export async function saveFontFamily(family: string): Promise<void> {
  await Storage.setItem(FONT_FAMILY_KEY, family);
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

/** 读取应用图标偏好。 */
export async function loadSavedAppLogo(): Promise<string | null> {
  return (await Storage.getItem(APP_LOGO_KEY)) ?? null;
}

/** 持久化应用图标。 */
export async function saveAppLogo(id: string): Promise<void> {
  await Storage.setItem(APP_LOGO_KEY, id);
}

/** 读取设置浮窗上次的位置（相对主窗口内容区）。 */
export async function loadSavedSettingsFrame(): Promise<{ x: number; y: number } | null> {
  const raw = await Storage.getItem(SETTINGS_FRAME_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof value.x !== "number" || typeof value.y !== "number") return null;
    if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    return { x: value.x, y: value.y };
  } catch {
    return null;
  }
}

/** 持久化设置浮窗的位置。 */
export async function saveSettingsFrame(x: number, y: number): Promise<void> {
  await Storage.setItem(
    SETTINGS_FRAME_KEY,
    JSON.stringify({ x: Math.round(x), y: Math.round(y) }),
  );
}
