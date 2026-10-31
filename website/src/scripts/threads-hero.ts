/**
 * StoatMD Hero · 自托管 PRO Threads（ring · ocean · 30fps）
 * 参数贴合暖炭纸底 + 靛蓝纤维；prefers-reduced-motion 时降级为静态暖炭径向。
 * embed.js 由 BaseLayout 以 <script type="module" src="/vendor/pro-threads/embed.js"> 先行加载。
 */
const SETTINGS =
  'speed=0.32&spin=0.2&gain=0.92&glow=0.48&threshold=0.64&saturation=0.62&warm=0.48&parallax=0.42&threads=1&sheen=0.58&sparkle=0.18&quality=0.62';

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
