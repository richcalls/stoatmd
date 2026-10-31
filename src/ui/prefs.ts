import { host, Storage } from "nsh";

/** Settings writes are owned by the main engine so both windows see the same values. */
async function writePreference(key: string, value: string): Promise<void> {
  if (host.params.settingsWindow === true) {
    await host.call("settings", { kind: "preference", key, value });
  } else {
    await Storage.setItem(key, value);
  }
}

const ROOT_KEY = "vault.root";
const LOCALE_KEY = "prefs.locale";
const THEME_KEY = "prefs.theme";
const RENDER_MODE_KEY = "prefs.renderMode";
const FONT_FAMILY_KEY = "prefs.fontFamily";
const FONT_SIZE_KEY = "prefs.fontSize";
const UI_FONT_SIZE_KEY = "prefs.uiFontSize";
const EDITOR_FONT_SIZE_KEY = "prefs.editorFontSize";
const FONT_LINE_KEY = "prefs.fontLineHeight";
const APP_LOGO_KEY = "prefs.appLogo";

/** 读取上次打开的库根。 */
export async function loadSavedRoot(): Promise<string | null> {
  return (await Storage.getItem(ROOT_KEY)) ?? null;
}

/** 持久化库根。 */
export async function saveRoot(path: string): Promise<void> {
  await writePreference(ROOT_KEY, path);
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
  await writePreference(LOCALE_KEY, locale);
}

/** 读取主题偏好。 */
export async function loadSavedTheme(): Promise<string | null> {
  return (await Storage.getItem(THEME_KEY)) ?? null;
}

/** 持久化主题。 */
export async function saveTheme(theme: string): Promise<void> {
  await writePreference(THEME_KEY, theme);
}

export async function loadSavedRenderMode(): Promise<string | null> {
  return (await Storage.getItem(RENDER_MODE_KEY)) ?? null;
}

export async function saveRenderMode(mode: string): Promise<void> {
  await writePreference(RENDER_MODE_KEY, mode);
}

/** 读取正文字体偏好。 */
export async function loadSavedFontFamily(): Promise<string | null> {
  return (await Storage.getItem(FONT_FAMILY_KEY)) ?? null;
}

/** 持久化正文字体。 */
export async function saveFontFamily(family: string): Promise<void> {
  await writePreference(FONT_FAMILY_KEY, family);
}

/** 读取字号偏好。 */
export async function loadSavedFontSize(): Promise<string | null> {
  return (await Storage.getItem(FONT_SIZE_KEY)) ?? null;
}

/** 持久化字号。 */
export async function saveFontSize(size: string): Promise<void> {
  await writePreference(FONT_SIZE_KEY, size);
}

export async function loadSavedUiFontSize(): Promise<string | null> {
  return (await Storage.getItem(UI_FONT_SIZE_KEY)) ?? null;
}

export async function saveUiFontSize(size: string): Promise<void> {
  await writePreference(UI_FONT_SIZE_KEY, size);
}

export async function loadSavedEditorFontSize(): Promise<string | null> {
  return (await Storage.getItem(EDITOR_FONT_SIZE_KEY)) ?? null;
}

export async function saveEditorFontSize(size: string): Promise<void> {
  await writePreference(EDITOR_FONT_SIZE_KEY, size);
}

/** 读取行高偏好。 */
export async function loadSavedFontLineHeight(): Promise<string | null> {
  return (await Storage.getItem(FONT_LINE_KEY)) ?? null;
}

/** 持久化行高。 */
export async function saveFontLineHeight(lineHeight: string): Promise<void> {
  await writePreference(FONT_LINE_KEY, lineHeight);
}

/** 读取应用图标偏好。 */
export async function loadSavedAppLogo(): Promise<string | null> {
  return (await Storage.getItem(APP_LOGO_KEY)) ?? null;
}

/** 持久化应用图标。 */
export async function saveAppLogo(id: string): Promise<void> {
  await writePreference(APP_LOGO_KEY, id);
}
