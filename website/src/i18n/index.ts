import type { Locale, LocaleMeta, Messages } from './types';
import { en } from './en';
import { zhHans } from './zh-hans';
import { zhHant } from './zh-hant';
import { ja } from './ja';
import { ko } from './ko';
import { de } from './de';
import { fr } from './fr';
import { es } from './es';

export type { Locale, LocaleMeta, Messages, MessageKey } from './types';

export const SITE_ORIGIN = 'https://stoatmd.com';

/** 语言元数据：路径、html lang、OG locale、选择器标签 */
export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { htmlLang: 'en', ogLocale: 'en_US', label: 'English', pathPrefix: '' },
  'zh-hans': { htmlLang: 'zh-Hans', ogLocale: 'zh_CN', label: '简体中文', pathPrefix: '/zh-hans' },
  'zh-hant': { htmlLang: 'zh-Hant', ogLocale: 'zh_TW', label: '繁體中文', pathPrefix: '/zh-hant' },
  ja: { htmlLang: 'ja', ogLocale: 'ja_JP', label: '日本語', pathPrefix: '/ja' },
  ko: { htmlLang: 'ko', ogLocale: 'ko_KR', label: '한국어', pathPrefix: '/ko' },
  de: { htmlLang: 'de', ogLocale: 'de_DE', label: 'Deutsch', pathPrefix: '/de' },
  fr: { htmlLang: 'fr', ogLocale: 'fr_FR', label: 'Français', pathPrefix: '/fr' },
  es: { htmlLang: 'es', ogLocale: 'es_ES', label: 'Español', pathPrefix: '/es' },
};

export const LOCALES = Object.keys(LOCALE_META) as Locale[];

const DICTS: Record<Locale, Messages> = {
  en,
  'zh-hans': zhHans,
  'zh-hant': zhHant,
  ja,
  ko,
  de,
  fr,
  es,
};

export function t(locale: Locale): Messages {
  return DICTS[locale] ?? en;
}

/** 该语言页的规范路径（含尾斜杠） */
export function localePath(locale: Locale, hash = ''): string {
  const base = LOCALE_META[locale].pathPrefix || '';
  const path = `${base}/`;
  return hash ? `${path}${hash}` : path;
}

export function absoluteUrl(locale: Locale, pathWithin = ''): string {
  const prefix = LOCALE_META[locale].pathPrefix;
  const rest = pathWithin.replace(/^\//, '');
  if (!rest) return `${SITE_ORIGIN}${prefix}/`;
  return `${SITE_ORIGIN}${prefix}/${rest}`;
}

/**
 * 浏览器语言列表 → 站点 Locale。
 * 繁中（zh-TW / zh-HK / zh-MO / zh-Hant）→ zh-hant；其余中文 → zh-hans；匹配不到 → en。
 */
export function detectLocaleFromAcceptLanguage(headerOrList: string | readonly string[]): Locale {
  const list =
    typeof headerOrList === 'string'
      ? headerOrList.split(',').map((p) => p.split(';')[0]!.trim())
      : Array.from(headerOrList);

  for (const raw of list) {
    const l = (raw || '').toLowerCase();
    if (!l) continue;
    if (
      l.startsWith('zh-hant') ||
      l.startsWith('zh-tw') ||
      l.startsWith('zh-hk') ||
      l.startsWith('zh-mo') ||
      l === 'zh-cht'
    ) {
      return 'zh-hant';
    }
    if (l.startsWith('zh')) return 'zh-hans';
    if (l.startsWith('ja')) return 'ja';
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('de')) return 'de';
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('es')) return 'es';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}
