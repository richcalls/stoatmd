/** 文案键：与设计稿 docs/website-v1/i18n.js 对齐 */
export type MessageKey =
  | 'nav.why'
  | 'nav.features'
  | 'nav.pricing'
  | 'nav.download'
  | 'nav.cta'
  | 'hero.title'
  | 'hero.lead'
  | 'hero.cta'
  | 'hero.secondary'
  | 'hero.note'
  | 'why.title'
  | 'why.sub'
  | 'cmp.obsidian.label'
  | 'cmp.obsidian.body'
  | 'cmp.typora.label'
  | 'cmp.typora.body'
  | 'cmp.miaoyan.name'
  | 'cmp.miaoyan.label'
  | 'cmp.miaoyan.body'
  | 'cmp.stoat.label'
  | 'cmp.stoat.body'
  | 'feat.title'
  | 'feat.sub'
  | 'feat.1.title'
  | 'feat.1.body'
  | 'feat.2.title'
  | 'feat.2.body'
  | 'feat.3.title'
  | 'feat.3.body'
  | 'feat.4.title'
  | 'feat.4.body'
  | 'price.title'
  | 'price.sub'
  | 'price.free.tier'
  | 'price.free.name'
  | 'price.free.unit'
  | 'price.free.1'
  | 'price.free.2'
  | 'price.free.3'
  | 'price.free.4'
  | 'price.pro.tier'
  | 'price.pro.name'
  | 'price.pro.amount'
  | 'price.pro.unit'
  | 'price.pro.1'
  | 'price.pro.2'
  | 'price.pro.3'
  | 'price.pro.4'
  | 'price.note'
  | 'dl.title'
  | 'dl.sub'
  | 'dl.mac'
  | 'dl.ios'
  | 'dl.soon'
  | 'dl.planned'
  | 'foot.privacy'
  | 'foot.terms'
  | 'foot.domain'
  | 'foot.privacy.body'
  | 'foot.terms.body'
  | 'foot.lang.hint'
  | 'foot.threads.credit'
  | 'doc.title'
  | 'doc.description'
  | 'img.alt'
  | 'a11y.lang'
  | 'a11y.primaryNav'
  | 'lang.system';

export type Messages = Record<MessageKey, string>;

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
