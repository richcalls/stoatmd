/*
 * The settings panel's library (Tweakpane, from jsDelivr), loaded only when
 * the panel is used. An embedded scene never shows the panel, so it never
 * fetches it; and if the CDN can't be reached in time the scene still
 * runs, with a stand-in that accepts every call the pages make and does
 * nothing. Shared by both pages.
 */
import { embedded } from './persist.js';

const TWEAKPANE = 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js';
const ESSENTIALS = 'https://cdn.jsdelivr.net/npm/@tweakpane/plugin-essentials@0.2.1/dist/tweakpane-plugin-essentials.min.js';
const WAIT = 8000;

// Any property is another stand-in, any call returns one; element is a real
// (detached) node, children an empty list, flags false.
function standIn() {
  const element = document.createElement('div');
  const proxy = new Proxy(function () {}, {
    get(_, key) {
      if (key === 'element') return element;
      if (key === 'children') return [];
      if (key === 'pages') return [proxy, proxy, proxy];
      if (key === 'then' || typeof key === 'symbol') return undefined;
      if (['disabled', 'selected', 'hidden', 'expanded'].includes(key)) return false;
      return proxy;
    },
    apply: () => proxy,
    set: () => true,
  });
  return proxy;
}

// A Pane (with the Essentials plugin), or the stand-in.
export async function createPane(options) {
  if (embedded) return standIn();
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), WAIT));
    const [{ Pane }, Essentials] = await Promise.race([Promise.all([import(TWEAKPANE), import(ESSENTIALS)]), timeout]);
    const pane = new Pane(options);
    pane.registerPlugin(Essentials);
    return pane;
  } catch {
    console.warn('PRO Threads: the settings panel could not be loaded; the scene runs without it.');
    return standIn();
  }
}
