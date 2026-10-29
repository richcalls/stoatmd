import { Storage } from "nsh";

const ROOT_KEY = "vault.root";
const LOCALE_KEY = "prefs.locale";

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
