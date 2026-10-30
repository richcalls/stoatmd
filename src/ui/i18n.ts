import { locale as systemLocale, signal } from "nsh";
import en from "../../locales/en.json";
import zh from "../../locales/zh.json";
import zhHant from "../../locales/zh-Hant.json";
import ja from "../../locales/ja.json";
import ko from "../../locales/ko.json";
import de from "../../locales/de.json";
import fr from "../../locales/fr.json";
import es from "../../locales/es.json";
import { loadSavedLocale } from "./prefs";

export type Locale = "en" | "zh" | "zh-Hant" | "ja" | "ko" | "de" | "fr" | "es";
/** 语言偏好：跟随系统或固定某种界面语言。 */
export type LocalePref = "system" | Locale;

const catalogs: Record<Locale, Record<string, string>> = {
  en,
  zh,
  "zh-Hant": zhHant,
  ja,
  ko,
  de,
  fr,
  es,
};

/** Intl 格式化标签：日期 / 时间按各自地区的书写习惯。 */
const INTL_TAGS: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
  "zh-Hant": "zh-TW",
  ja: "ja-JP",
  ko: "ko-KR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

/** 系统 BCP 47 标签 → 界面语言；未覆盖的语言回退英文。 */
export function resolveLocale(tag: string): Locale {
  const low = tag.toLowerCase();
  if (low.startsWith("zh")) {
    return /hant|-tw|-hk|-mo/.test(low) ? "zh-Hant" : "zh";
  }
  const head = low.split("-")[0];
  if (head === "ja" || head === "ko" || head === "de" || head === "fr" || head === "es") {
    return head;
  }
  return "en";
}

export const localePref = signal<LocalePref>("system");

/** 当前界面语言：偏好为 system 时按系统语言判断。 */
export function locale(): Locale {
  const pref = localePref();
  if (pref !== "system") return pref;
  return resolveLocale(systemLocale());
}

/** 指定语言的 Intl 标签（日期 / 时间格式化用）。 */
export function intlTag(loc: Locale): string {
  return INTL_TAGS[loc];
}

function substitute(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let out = text;
  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

/** 指定语言的文案，不受当前界面语言影响。 */
export function translate(
  loc: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  return substitute(catalogs[loc][key] ?? catalogs.en[key] ?? key, params);
}

export function t(key: string, params?: Record<string, string | number>): string {
  return translate(locale(), key, params);
}

export function setLocalePref(next: LocalePref) {
  localePref.set(next);
}

/** 启动时恢复语言偏好。 */
export async function restoreLocale(): Promise<void> {
  const saved = await loadSavedLocale();
  if (saved === "system" || (saved !== null && saved in catalogs)) {
    localePref.set(saved as LocalePref);
  }
}
