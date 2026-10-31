/*
 * The panel's Embed button: a dialog with ready-to-paste code for showing
 * the scene, with the current settings, on another site: the <pro-threads>
 * element (embed.js), a plain iframe, or a link. Each copies in one click.
 * Shared by the wallpaper and the hero scenes.
 */
import { t } from './i18n.js';

const HOSTED = 'https://www.kubai.design/pro-threads/';
const CDN = 'https://cdn.jsdelivr.net/gh/kubai087/pro-threads@main/embed.js';
const GUIDE = 'https://github.com/kubai087/pro-threads#embed';
// Parameters for viewing this page that an embed has no use for.
const LOCAL_ONLY = ['t', 'ui', 'ref', 'embed', 'lang'];

const CSS = `
  .tp-embed {
    position: fixed;
    inset: 0;
    z-index: 1001;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .tp-embed_box {
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-sizing: border-box;
    width: min(620px, 100%);
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: #1a1c21;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    color: #c9ced8;
  }
  .tp-embed_head { display: flex; align-items: center; justify-content: space-between; }
  .tp-embed h2 { margin: 0; color: #ffffff; font: inherit; font-size: 1.2em; }
  .tp-embed p { margin: 0; color: #8d93a0; line-height: 1.5; }
  .tp-embed button {
    padding: 6px 12px;
    border: 0;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .tp-embed button:hover { background: rgba(255, 255, 255, 0.12); }
  .tp-embed_tabs { display: flex; gap: 4px; }
  .tp-embed_tabs button[aria-selected="true"] { background: #c9ced8; color: #111215; }
  .tp-embed pre {
    margin: 0;
    max-height: 40vh;
    overflow: auto;
    padding: 12px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.35);
    color: #e6e9ef;
    white-space: pre-wrap;
    word-break: break-all;
    user-select: all;
  }
  .tp-embed_foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .tp-embed a { color: #c9ced8; }
  .tp-embed .tp-embed_copy { background: #ffffff; color: #111215; }
  .tp-embed .tp-embed_copy:hover { background: #e6e9ef; }
`;

// A value for a double-quoted attribute. Its &s stay as they are: each is
// followed by a name and =, which HTML reads as plain text.
const attr = (value) => value.replace(/"/g, '&quot;');

// The three snippets for this page with its current settings. Seen from a
// local copy they point at the hosted site; from anywhere else, at that
// site (and the element is told where it is with src).
function snippets(page) {
  const settings = new URLSearchParams(location.search);
  LOCAL_ONLY.forEach((k) => settings.delete(k));
  const link = new URLSearchParams(settings);
  let scene = 'pro';
  if (page === 'hero') {
    scene = settings.get('scene') ?? 'ring';
    settings.delete('scene');
  } else if (settings.get('view') === 'az') {
    scene = 'az';
    settings.delete('view');
  }
  const local = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
  const root = local ? HOSTED : new URL(page === 'hero' ? '../' : './', location.href).href;
  const path = page === 'hero' ? 'hero/' : '';

  const attrs = [`scene="${scene}"`];
  if (settings.toString()) attrs.push(`settings="${attr(settings.toString())}"`);
  if (root !== HOSTED) attrs.push(`src="${attr(root)}"`);
  const element = `<script type="module" src="${CDN}"></script>\n`
    + `<pro-threads ${attrs.join(' ')} style="height: 100vh"></pro-threads>`;

  const query = new URLSearchParams(settings);
  if (page === 'hero') {
    query.set('scene', scene);
    if (!query.has('landing')) query.set('landing', '0');
  } else if (scene === 'az') {
    query.set('view', 'az');
  }
  query.set('embed', '1');
  const iframe = `<iframe src="${attr(new URL(`${path}?${query}`, root).href)}" title="PRO Threads" loading="lazy"\n`
    + `  style="display: block; width: 100%; height: 100vh; border: 0"></iframe>`;

  const href = new URL(path + (link.toString() ? `?${link}` : ''), root).href;
  return [['Web component', element], ['iframe', iframe], ['Link', href]];
}

function open(page, font) {
  const layer = document.createElement('div');
  layer.className = 'tp-embed';
  layer.style.font = font;
  layer.innerHTML = `
    <div class="tp-embed_box" role="dialog" aria-modal="true" aria-labelledby="tp-embed-title">
      <div class="tp-embed_head"><h2 id="tp-embed-title"></h2><button class="tp-embed_close"></button></div>
      <p class="tp-embed_lede"></p>
      <div class="tp-embed_tabs" role="tablist"></div>
      <pre><code></code></pre>
      <div class="tp-embed_foot"><a target="_blank" rel="noopener" href="${GUIDE}"></a><button class="tp-embed_copy"></button></div>
    </div>`;
  const $ = (selector) => layer.querySelector(selector);
  $('h2').textContent = t('Embed');
  $('.tp-embed_close').textContent = t('Close');
  $('.tp-embed_lede').textContent = t('Paste this where the scene should go. It fills the box you give it, with the settings you see now.');
  $('a').textContent = t('Guide on GitHub →');
  const copy = $('.tp-embed_copy');
  copy.textContent = t('Copy');

  const list = snippets(page);
  let shown = 0;
  const show = (i) => {
    shown = i;
    $('code').textContent = list[i][1];
    [...$('.tp-embed_tabs').children].forEach((b, j) => b.setAttribute('aria-selected', i === j));
  };
  list.forEach(([name], i) => {
    const tab = document.createElement('button');
    tab.setAttribute('role', 'tab');
    tab.textContent = t(name);
    tab.addEventListener('click', () => show(i));
    $('.tp-embed_tabs').append(tab);
  });
  show(0);

  copy.addEventListener('click', async () => {
    const text = list[shown][1];
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Without clipboard access (an insecure page, say), select it to copy by hand.
      getSelection().selectAllChildren($('code'));
      return;
    }
    copy.textContent = t('Copied');
    setTimeout(() => (copy.textContent = t('Copy')), 1500);
  });

  const close = () => {
    layer.remove();
    removeEventListener('keydown', onKey, true);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
    event.stopPropagation();
  };
  addEventListener('keydown', onKey, true);
  layer.addEventListener('click', (event) => event.target === layer && close());
  $('.tp-embed_close').addEventListener('click', close);
  document.body.append(layer);
  copy.focus();
}

// Adds the Embed button to a pane; page is 'wallpaper' or 'hero'.
export function addEmbed(pane, page) {
  if (!document.querySelector('style[data-tp-embed]')) {
    const style = document.createElement('style');
    style.dataset.tpEmbed = '';
    style.textContent = CSS;
    document.head.append(style);
  }
  pane.addButton({ title: 'Embed' }).on('click', () => open(page, getComputedStyle(pane.element).font));
}
