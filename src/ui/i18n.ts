import { signal } from "nsh";
import zh from "../../locales/zh.json";
import en from "../../locales/en.json";
import { loadSavedLocale } from "./prefs";

export type Locale = "zh" | "en";

const catalogs: Record<Locale, Record<string, string>> = { zh, en };

/** 当前界面语言（至少中英）。 */
export const locale = signal<Locale>("zh");

export function t(key: string): string {
  const table = catalogs[locale()];
  return table[key] ?? catalogs.zh[key] ?? key;
}

export function setLocale(next: Locale) {
  locale.set(next);
}

/** 启动时恢复语言偏好。 */
export async function restoreLocale(): Promise<void> {
  const saved = await loadSavedLocale();
  if (saved === "zh" || saved === "en") {
    locale.set(saved);
  }
}
