/** URL 路径段（默认英文无前缀） */
export type Locale =
  | 'en'
  | 'zh-hans'
  | 'zh-hant'
  | 'ja'
  | 'ko'
  | 'de'
  | 'fr'
  | 'es';

export type LocaleMeta = {
  /** BCP 47，用于 html lang / hreflang */
  htmlLang: string;
  /** Open Graph locale */
  ogLocale: string;
  /** 选择器展示名 */
  label: string;
  /** 路径前缀，英文为 '' */
  pathPrefix: string;
};
