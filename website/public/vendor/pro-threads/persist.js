/*
 * Settings that survive a reload. A page keeps its settings in its URL,
 * only those that differ from where it starts, so a reload, a bookmark or
 * a shared link opens the same look. A hard reload (everything fetched
 * afresh, bypassing the cache) starts from the defaults again. Each
 * page's last settings are also kept for this tab, so going between the
 * wallpaper and the hero scenes comes back to them. Shared by both pages.
 */

// Parameters that set up a view rather than the look (a still moment, no
// panel, the reference overlay, embedded in another site); they stay in
// the URL as given.
const VIEW = ['t', 'ui', 'ref', 'embed'];
const STORE = 'pro-threads:';

// A hard reload fetches every script and stylesheet in full; a plain one
// takes at least some from the cache or as "not modified". (The page
// itself can't tell them apart: its URL, rewritten by save(), was never
// fetched, so it always comes in full.)
const nav = performance.getEntriesByType('navigation')[0];
const files = performance.getEntriesByType('resource')
  .filter((e) => e.name.startsWith(location.origin) && /\.(js|css)$/.test(new URL(e.name).pathname));
const full = (e) => e.encodedBodySize > 0 && e.transferSize > e.encodedBodySize;
export const hardReload = nav?.type === 'reload' && files.length > 0 && files.every(full);

if (hardReload) {
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(STORE)).forEach((k) => sessionStorage.removeItem(k));
  } catch {}
  const view = new URLSearchParams([...new URLSearchParams(location.search)].filter(([k]) => VIEW.includes(k)));
  history.replaceState(null, '', location.pathname + query(view) + location.hash);
}

// What the page starts from.
export const params = new URLSearchParams(location.search);

// Embedded in another site (embed.js, or an iframe with ?embed=1): no
// panel, no keys, and the URL left alone.
export const embedded = params.has('embed');
if (embedded) {
  document.body.dataset.ui = 'off';
  document.body.dataset.embed = '';
}

// Embedded for someone who asked for less motion: the scene holds still.
export const calm = embedded && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tells the page an embedded scene sits in that it has drawn (or fallen
// back to its still), so <pro-threads> can show it.
export function announce() {
  if (embedded && parent !== window) parent.postMessage({ type: 'pro-threads:ready' }, '*');
}

// A number from the URL, kept within [min, max]; undefined if it isn't one.
export function number(raw, [min, max] = [-Infinity, Infinity]) {
  const value = Number(raw);
  return raw !== null && raw !== '' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
}

function query(search) {
  const s = search.toString();
  return s ? `?${s}` : '';
}

// A value as it goes in the URL: colours without their #, switches as 1
// or 0, numbers without float noise.
export function format(value) {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(+value.toFixed(4));
  return String(value).replace(/^#/, '');
}

export const slug = (name) => name.normalize('NFD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let timer = 0;

// Puts settings ([key, value] pairs) in the URL, in place of the last
// ones, and keeps them for this tab under `page`.
export function save(page, settings) {
  if (embedded) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const current = new URLSearchParams(location.search);
    const next = new URLSearchParams([...current].filter(([k]) => VIEW.includes(k)));
    for (const [k, v] of settings) next.set(k, v);
    const search = query(next);
    history.replaceState(null, '', location.pathname + search + location.hash);
    try {
      sessionStorage.setItem(STORE + page, search);
    } catch {}
  }, 150);
}

// The address of another page with its last settings in this tab, and
// `shared` laid over them (what carries across, such as the palette; null
// takes a key out).
export function pageUrl(page, path, shared) {
  let search = '';
  try {
    search = sessionStorage.getItem(STORE + page) ?? '';
  } catch {}
  const next = new URLSearchParams(search);
  for (const [k, v] of Object.entries(shared)) {
    if (v == null) next.delete(k);
    else next.set(k, v);
  }
  return path + query(next);
}
