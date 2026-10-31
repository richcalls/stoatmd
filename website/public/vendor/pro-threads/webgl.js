/*
 * A WebGL 2 context for a page, safely. Without one (or when the shaders
 * won't build on this GPU) the page shows a still in place of an empty
 * canvas. If the context is lost (a GPU reset, or a page holding too many)
 * the page reloads once it comes back, picking its settings up from the
 * URL. Shared by both pages.
 */
import { announce } from './persist.js';

// Shows the page's still and stops it.
export function fail(reason) {
  document.body.dataset.fallback = '';
  announce();
  throw new Error(`PRO Threads: ${reason}; showing a still instead.`);
}

export function getGL(canvas, attributes) {
  canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  const gl = canvas.getContext('webgl2', attributes);
  if (!gl) fail('WebGL 2 is not available');
  return gl;
}
