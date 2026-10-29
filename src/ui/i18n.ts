import { locale as systemLocale, signal } from "nsh";
import zh from "../../locales/zh.json";
import en from "../../locales/en.json";
import { loadSavedLocale } from "./prefs";

export type Locale = "zh" | "en";
/** 语言偏好：跟随系统或强制中/英。 */
export type LocalePref = "system" | Locale;

const catalogs: Record<Locale, Record<string, string>> = { zh, en };

export const localePref = signal<LocalePref>("system");

/** 当前界面语言：偏好为 system 时按系统 BCP 47 标签判断。 */
export function locale(): Locale {
  const pref = localePref();
  if (pref !== "system") return pref;
  return systemLocale().toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function t(key: string): string {
  const table = catalogs[locale()];
  return table[key] ?? catalogs.zh[key] ?? key;
}

export function setLocalePref(next: LocalePref) {
  localePref.set(next);
}

/** 启动时恢复语言偏好。 */
export async function restoreLocale(): Promise<void> {
  const saved = await loadSavedLocale();
  if (saved === "system" || saved === "zh" || saved === "en") {
    localePref.set(saved);
  }
}
