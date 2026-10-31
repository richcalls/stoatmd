/**
 * 语言切换与根路径首次自动跳转。
 * - 手动选择写入 localStorage（stoatmd.langPref / stoatmd.langTouched）并跳转到对应 URL
 * - 「跟随系统」记住 pref=system，按浏览器语言跳转
 * - 仅在访问 / 且无手动选择、非爬虫时做自动跳转（不妨碍各语言页被索引）
 */
const PREF_KEY = 'stoatmd.langPref';
const TOUCHED_KEY = 'stoatmd.langTouched';

const SUPPORTED = ['en', 'zh-hans', 'zh-hant', 'ja', 'ko', 'de', 'fr', 'es'] as const;
type Locale = (typeof SUPPORTED)[number];

const PATH: Record<Locale, string> = {
  en: '/',
  'zh-hans': '/zh-hans/',
  'zh-hant': '/zh-hant/',
  ja: '/ja/',
  ko: '/ko/',
  de: '/de/',
  fr: '/fr/',
  es: '/es/',
};

const BOT =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|twitterbot|googlebot|baiduspider|yandex|duckduck|semrush|ahrefs|bytespider|gptbot|claudebot|anthropic|perplexity|applebot|ia_archiver/i;

function detectBrowserLang(): Locale {
  const list =
    navigator.languages && navigator.languages.length
      ? Array.from(navigator.languages)
      : [navigator.language || 'en'];
  for (const raw of list) {
    const l = (raw || '').toLowerCase();
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

function resolvePref(pref: string): Locale {
  if (!pref || pref === 'system') return detectBrowserLang();
  return (SUPPORTED as readonly string[]).includes(pref) ? (pref as Locale) : 'en';
}

function go(locale: Locale) {
  const target = PATH[locale];
  const here = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  const normalized = here === '/index.html/' || here === '/index.html' ? '/' : here;
  if (normalized !== target) {
    location.replace(target + location.hash);
  }
}

function persist(pref: string, touch: boolean) {
  try {
    localStorage.setItem(PREF_KEY, pref);
    if (touch) localStorage.setItem(TOUCHED_KEY, '1');
  } catch {
    /* ignore */
  }
}

function maybeRedirectRoot() {
  const path = location.pathname;
  if (path !== '/' && path !== '/index.html') return;
  if (BOT.test(navigator.userAgent || '')) return;

  let pref = 'system';
  try {
    const touched = localStorage.getItem(TOUCHED_KEY);
    const saved = localStorage.getItem(PREF_KEY);
    if (touched && saved && (saved === 'system' || (SUPPORTED as readonly string[]).includes(saved))) {
      pref = saved;
    }
  } catch {
    /* ignore */
  }

  // 首次访问且无手动选择：按浏览器语言跳转（英文则留在 /）
  // 已手动选择：尊重偏好（含「跟随系统」）
  const resolved = resolvePref(pref);
  if (resolved !== 'en') go(resolved);
}

function wireMenu() {
  const wrap = document.getElementById('langWrap');
  const langBtn = document.getElementById('langBtn');
  const langMenu = document.getElementById('langMenu');
  if (!langBtn || !wrap) return;

  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wrap.classList.toggle('open');
    langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', () => {
    wrap.classList.remove('open');
    langBtn.setAttribute('aria-expanded', 'false');
  });
  langMenu?.addEventListener('click', (e) => e.stopPropagation());

  langMenu?.querySelectorAll<HTMLElement>('[data-lang]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const code = el.getAttribute('data-lang') || 'en';
      const pref = code === 'system' || (SUPPORTED as readonly string[]).includes(code) ? code : 'en';
      persist(pref, true);
      go(resolvePref(pref));
      wrap.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

maybeRedirectRoot();
wireMenu();
