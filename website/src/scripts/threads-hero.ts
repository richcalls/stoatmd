/**
 * StoatMD Hero · 自托管 PRO Threads（ring · ocean · 30fps）
 * 参数对齐 docs/website-v1/threads-hero.js；prefers-reduced-motion 时降级为静态渐变。
 * embed.js 由 BaseLayout 以 <script type="module" src="/vendor/pro-threads/embed.js"> 先行加载。
 */
const SETTINGS =
  'speed=0.35&spin=0.22&gain=0.8&glow=0.32&threshold=0.72&saturation=0.7&warm=0.4&parallax=0.35&threads=0.85&sheen=0.45&sparkle=0.25&quality=0.55';

const VENDOR_SRC = '/vendor/pro-threads/';

function whenDefined(): Promise<void> {
  if (customElements.get('pro-threads')) return Promise.resolve();
  return customElements.whenDefined('pro-threads').then(() => undefined);
}

async function mount() {
  const host = document.getElementById('heroThreads');
  if (!host || host.querySelector('pro-threads')) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    host.classList.add('is-on', 'reduced');
    return;
  }

  try {
    await whenDefined();
  } catch (err) {
    console.warn('StoatMD: PRO Threads custom element unavailable', err);
    host.classList.add('is-on', 'reduced');
    return;
  }

  let settings = SETTINGS;
  const tParam = new URLSearchParams(location.search).get('threadsT');
  if (tParam && !Number.isNaN(Number(tParam))) {
    settings += `&t=${encodeURIComponent(tParam)}`;
  }

  const el = document.createElement('pro-threads');
  el.setAttribute('scene', 'ring');
  el.setAttribute('palette', 'ocean');
  el.setAttribute('fps', '30');
  el.setAttribute('settings', settings);
  el.setAttribute('src', VENDOR_SRC);
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;background:#1C1A17';
  host.appendChild(el);
  host.classList.add('is-on');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void mount();
  });
} else {
  void mount();
}
