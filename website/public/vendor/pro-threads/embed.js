/*
 * <pro-threads>: a live PRO Threads scene in any page.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/gh/kubai087/pro-threads@main/embed.js"></script>
 *   <pro-threads scene="mobius" style="height: 100vh"></pro-threads>
 *
 * The scene fills the element's box. It is drawn in an iframe, so it can't
 * clash with the page's own styles or scripts, from the hosted site, or
 * from your own copy if `src` points to one. It fades in once it has drawn,
 * pauses while scrolled out of view, and holds still for visitors who ask
 * for reduced motion.
 *
 * Attributes (all optional):
 *   scene     pro (the wallpaper, the default), az (the alphabet), ring,
 *             blackhole, perspective, mobius or tunnel
 *   text      the word on the wallpaper, up to 10 letters
 *   palette   xdr-blue, graphite, ember, chroma, violet, ocean, aurora,
 *             rose-gold or paper
 *   fps       the most frames a second: 30, 60 (the default) or 120
 *   settings  any other settings, as a query string; the panel's Embed
 *             button writes it for you
 *   src       where your own copy of the site is, e.g. "/pro-threads/"
 */

const HOSTED = 'https://www.kubai.design/pro-threads/';
const HERO = ['ring', 'blackhole', 'perspective', 'mobius', 'tunnel'];
// With more than this many on a page, a scene that stays far out of view
// is unloaded, so the page keeps under the browser's limit on live WebGL
// contexts; it loads again as it comes back into view.
const MANY = 4;
const UNLOAD_AFTER = 10000;
// A copy of the site from before it said when it was ready is shown this
// long after it has loaded.
const SHOW_ANYWAY = 4000;

const STYLE = `
  :host { display: block; position: relative; min-height: 200px; overflow: hidden; background: #000; }
  iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; opacity: 0; transition: opacity 0.5s ease; }
  iframe.ready { opacity: 1; }
`;

function define() {
  const live = new Set();

  class ProThreads extends HTMLElement {
    static observedAttributes = ['scene', 'text', 'palette', 'fps', 'settings', 'src'];

    connectedCallback() {
      if (!this.shadowRoot) {
        const root = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = STYLE;
        this.frame = document.createElement('iframe');
        this.frame.title = 'PRO Threads';
        this.frame.loading = 'lazy';
        // Decoration: kept out of the tab order and from screen readers.
        this.frame.tabIndex = -1;
        this.frame.setAttribute('aria-hidden', 'true');
        this.frame.addEventListener('load', () => {
          // Not the blank page an iframe holds before (or instead of) its own.
          let blank = false;
          try {
            blank = this.frame.contentWindow.location.href === 'about:blank';
          } catch {}
          clearTimeout(this.fallback);
          if (!blank && !this.unloaded) this.fallback = setTimeout(() => this.show(), SHOW_ANYWAY);
        });
        root.append(style, this.frame);
        this.onMessage = (event) => {
          if (event.source === this.frame.contentWindow && event.data?.type === 'pro-threads:ready') this.show();
        };
      }
      live.add(this);
      addEventListener('message', this.onMessage);
      this.observer = new IntersectionObserver(([entry]) => this.near(entry.isIntersecting), { rootMargin: '100% 0px' });
      this.observer.observe(this);
      this.update();
    }

    disconnectedCallback() {
      live.delete(this);
      removeEventListener('message', this.onMessage);
      this.observer?.disconnect();
      clearTimeout(this.fallback);
      clearTimeout(this.unload);
    }

    attributeChangedCallback() {
      if (this.frame) this.update();
    }

    // The address of the scene the attributes ask for.
    get url() {
      const params = new URLSearchParams(this.getAttribute('settings') ?? '');
      const scene = (this.getAttribute('scene') ?? params.get('scene') ?? 'pro').toLowerCase().replace(/[^a-z]/g, '');
      const hero = HERO.includes(scene);
      params.delete('scene');
      params.delete('view');
      if (hero) {
        params.set('scene', scene);
        if (!params.has('landing')) params.set('landing', '0');
      } else if (scene === 'az') {
        params.set('view', 'az');
      }
      for (const key of ['text', 'palette', 'fps']) {
        if (this.hasAttribute(key)) params.set(key, this.getAttribute(key));
      }
      params.set('embed', '1');
      const base = new URL(this.getAttribute('src') || HOSTED, location.href);
      return new URL(`${hero ? 'hero/' : ''}?${params}`, base).href;
    }

    update(force = false) {
      if (this.unloaded) return;
      const url = this.url;
      if (!force && this.frame.src === url) return;
      this.frame.classList.remove('ready');
      this.frame.src = url;
    }

    show() {
      clearTimeout(this.fallback);
      if (!this.unloaded) this.frame.classList.add('ready');
    }

    // Near the view (within a screen of it) or not.
    near(isNear) {
      clearTimeout(this.unload);
      if (isNear) {
        if (this.unloaded) {
          this.unloaded = false;
          this.update(true);
        }
        return;
      }
      if (live.size <= MANY) return;
      this.unload = setTimeout(() => {
        this.unloaded = true;
        this.frame.classList.remove('ready');
        this.frame.src = 'about:blank';
      }, UNLOAD_AFTER);
    }
  }

  customElements.define('pro-threads', ProThreads);
}

// Only in a browser: imported during server rendering it does nothing.
if (typeof window !== 'undefined' && window.customElements && !customElements.get('pro-threads')) define();
