/*
 * A landing page's first screen laid over the hero scene, to show how a
 * scene sits behind real content. Two layouts: centred, over scenes whose
 * subject sits in the middle (the ring, the black hole, the tunnel), and
 * on the left with a glass card of the live frame time on the right (the
 * perspective). The brand is a placeholder.
 */

// The layout each scene reads best with.
const LAYOUTS = { Ring: 'center', 'Black Hole': 'center', Tunnel: 'center', 'Möbius': 'center', Perspective: 'left' };

const MARK = `<svg viewBox="0 0 24 24" aria-hidden="true">${[3, 7, 11, 15, 19]
  .map((x, i) => `<path d="M${x} ${3 + (i % 2) * 2}v${16 - (i % 2) * 4}" />`).join('')}</svg>`;

const HTML = `
  <header class="landing_nav">
    <a class="landing_brand" href="#">${MARK}<span>PRO Threads</span></a>
    <nav class="landing_links"><a href="#">Scenes</a><a href="#">Palettes</a><a href="#">Docs</a></nav>
    <div class="landing_actions"><a class="landing_button" href="#">Get started</a></div>
  </header>
  <div class="landing_main">
    <section class="landing_copy">
      <h1><span>Light,</span> <span>Woven Live</span></h1>
      <div class="landing_foot">
        <p class="landing_body">Threads of light, drawn live in the browser.</p>
        <div class="landing_ctas">
          <a class="landing_button" href="#">Explore scenes<span aria-hidden="true">→</span></a>
          <a class="landing_button landing_ghost" href="#">View source</a>
        </div>
      </div>
    </section>
    <aside class="landing_card">
      <h2>Frame time</h2>
      <p class="landing_figure" data-now>–</p>
      <svg class="landing_chart" viewBox="0 0 300 120" preserveAspectRatio="none">
        <defs><linearGradient id="landing-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: #ffffff; stop-opacity: 0.22" /><stop offset="1" style="stop-color: #ffffff; stop-opacity: 0" />
        </linearGradient></defs>
        <path class="landing_budget" />
        <path class="landing_area" />
        <path class="landing_line" />
      </svg>
    </aside>
  </div>`;

// Common display rates, for the frame budget.
const RATES = [30, 60, 90, 120, 144, 165, 240];

// Ten seconds of samples, thirty a second.
const SPAN = 10;
const RATE = 30;
const COUNT = SPAN * RATE;

// An SVG path through values (oldest first) scaled from [0, hi] to the
// chart's 300 x 120 box, and the same closed down to the bottom for a fill.
function paths(values, hi) {
  const step = 300 / (COUNT - 1);
  const offset = (COUNT - values.length) * step;
  const y = (v) => (116 - (Math.min(hi, v) / hi) * 112).toFixed(1);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${(offset + i * step).toFixed(1)} ${y(v)}`).join('');
  return { line, area: values.length ? `${line}L300 120L${offset.toFixed(1)} 120Z` : '' };
}

// The landing page's fonts, fetched the first time it is shown, without
// holding up the page: where Google Fonts can't be reached the text simply
// stays in the fallback fonts, and a scene embedded without the landing
// page never asks for them.
const FONTS = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Raleway:wght@500;600&family=Space+Grotesk:wght@400;500&display=swap';
function loadFonts() {
  if (document.querySelector('link[data-landing-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONTS;
  link.dataset.landingFonts = '';
  document.head.append(link);
}

export function createLanding(view) {
  const root = document.createElement('div');
  root.className = 'landing';
  root.lang = 'en';
  root.innerHTML = HTML;
  root.querySelectorAll('a').forEach((a) => a.addEventListener('click', (event) => event.preventDefault()));
  view.append(root);
  const $ = (selector) => root.querySelector(selector);

  const frames = [];
  let last = null;
  let since = 0;
  let pending = [];
  let shown = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (last !== null) pending.push(now - last);
    last = now;
    if (now - since < 1000 / RATE) return;
    since = now;
    // One sample per tick: the frames since the last, averaged, then eased
    // into the previous sample so single slow frames don't spike.
    if (pending.length) {
      const mean = pending.reduce((a, b) => a + b, 0) / pending.length;
      const prev = frames.length ? frames[frames.length - 1] : mean;
      frames.push(prev + (mean - prev) * 0.25);
    }
    pending = [];
    if (frames.length > COUNT) frames.shift();
    if (!root.hidden && root.dataset.layout === 'left') draw();
  }

  function draw() {
    if (!frames.length) return;
    // The budget at the display's own rate, drawn as a dashed line; the
    // scale fits most frames, so one hitch runs off the top rather than
    // flattening the rest.
    const measured = 1000 / Math.min(...frames.slice(-RATE));
    const budget = 1000 / RATES.reduce((a, b) => (Math.abs(b - measured) < Math.abs(a - measured) ? b : a));
    const sorted = [...frames].sort((a, b) => a - b);
    const hi = Math.max(budget * 2, sorted[Math.floor(sorted.length * 0.95)]) * 1.15;
    // The figure: the mean of the last second, changed at most twice a second.
    if (performance.now() - shown > 500) {
      const recent = frames.slice(-RATE);
      $('[data-now]').textContent = `${(recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1)} ms`;
      shown = performance.now();
    }
    const f = paths(frames, hi);
    $('.landing_line').setAttribute('d', f.line);
    $('.landing_area').setAttribute('d', f.area);
    $('.landing_budget').setAttribute('d', `M0 ${(116 - (budget / hi) * 112).toFixed(1)}H300`);
  }
  requestAnimationFrame(tick);

  // What follows the panel: shown or not, and the layout.
  function update(state) {
    root.hidden = !state.landing;
    if (state.landing) loadFonts();
    root.dataset.layout = state.layout === 'Auto' ? LAYOUTS[state.scene] ?? 'center' : state.layout.toLowerCase();
  }
  return { update };
}
