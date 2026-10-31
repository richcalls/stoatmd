/*
 * Hero scenes for a landing page, made of the wallpaper's threads of light:
 * a ring, a black hole (ray traced, so its disk is seen bent round it), a
 * wide-angle view of a wall of threads rolling onto the floor, a Möbius
 * strip larger than the screen, and a tunnel of threads running away into
 * the dark. Each is drawn, then given a glow: what is bright is blurred at
 * two sizes and laid back over the picture.
 *
 * URL options: ?scene=ring|blackhole|perspective|tunnel|mobius  ?palette=chroma
 *              ?ui=0 (no panel)  ?t=4 (hold one moment, for stills)
 *              ?landing=0 (the scene alone, without the landing page laid over it)
 *              ?layout=left|center (instead of the scene's own)
 * Keys: H toggles the panel, Space pauses.
 */
import { PALETTES } from '../palettes.js';
import { menu } from '../menu.js';
import { addLanguage, language } from '../i18n.js';
import { params, embedded, calm, announce, number, save, pageUrl, format, slug as paletteSlug } from '../persist.js';
import { getGL, fail } from '../webgl.js';
import { createPane } from '../panel.js';
import { createPacer } from '../pace.js';
import { addEmbed } from '../share.js';
import { SHAPES } from './shapes.js';
import { createLanding } from './landing.js';
import {
  RIBBON_VERT, RIBBON_FRAG, QUAD_VERT, BACKDROP_FRAG, BLACKHOLE_FRAG, BRIGHT_FRAG, BLUR_FRAG, COMPOSITE_FRAG,
} from './shaders.js';

const canvas = document.getElementById('hero');
const still = number(params.get('t')) ?? null;
if (params.get('ui') === '0') document.body.dataset.ui = 'off';

// ---------- Scenes ----------

// How each ribbon scene is framed: where the camera sits and looks, its
// field of view, what the shape turns about (or that it holds still), and
// where the light comes from.
const SCENES = {
  Ring: { eye: [0, 0.82, 2.5], target: [0, -0.08, 0], fov: 40, spin: [0.12, 1, 0], light: [-0.5, 0.9, 0.5], sheen: 0.22 },
  'Black Hole': { blackHole: true },
  // A wide-angle view, level and close in, of a broad wall of threads
  // rolling onto the floor: the wall stands straight, the fold runs level
  // across, and the floor's threads spread out toward the bottom corners.
  // A flat wall facing the camera would catch the sheen all over, so it is
  // lit like the wallpaper instead, with light falling from the top.
  Perspective: {
    eye: [0, 1.25, 3.1], target: [0, 1.25, 0], fov: 100, spin: [0, 1, 0], fixed: true, light: [-0.35, 0.6, 0.9],
    sheen: 0.18, fall: [1, 4.4, 0.28], pool: [6.38, 0.22, 0.42, 4.5], fog: [7, 16], grade: [1.2, 1.4],
    // Close up the threads would read thick, so there are more of them, finer,
    // with more glow round them.
    threads: 4, glow: 1.35,
  },
  // A Möbius strip seen from a little above, turning slowly.
  // A Möbius strip larger than the screen, leaning toward the camera so it
  // reads nearly as a circle, its centre always somewhere off screen: only
  // a sweep of the band crosses the frame. As it turns, the centre wanders
  // round outside the screen's edges and the strip rocks a little (drift),
  // never quite repeating.
  'Möbius': {
    eye: [0, 0, 3.2], target: [0, 0, 0], fov: 40, spin: [0, 1, 0], light: [-0.5, 0.9, 0.5], sheen: 0.22, gain: 0.85,
    fog: [5, 9], threads: 2, drift: { lean: 1.15, tilt: 0.22, outside: 0.3 },
  },
  // Down a long tube of fine threads that fade to black well before its
  // end, so the end never shows.
  Tunnel: {
    eye: [0, 0, 0], target: [0, 0, -10], fov: 62, spin: [0, 0, 1], light: [0.6, 0.8, 0.25],
    fog: [3, 24], sheen: 0.3, gain: 0.9, threads: 3, grade: [1.3, 1.1],
  },
};
const slug = (name) => name.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '');

const DEFAULTS = {
  scene: 'Ring',
  palette: 'XDR Blue',
  speed: 1,
  spin: 1,
  zoom: 1,
  threads: 1,
  sheen: 0.8,
  gain: 1.4,
  warm: 0.7,
  sparkle: 1,
  glow: 0.7,
  threshold: 0.62,
  contrast: 1,
  saturation: 1,
  parallax: true,
  landing: true,
  // Auto takes each scene's own layout (landing.js).
  layout: 'Auto',
  quality: (devicePixelRatio || 1) >= 2 ? 0.75 : 1,
  // Lower the resolution when frames run slow; the most frames a second.
  autoQuality: true,
  fps: 60,
  paused: false,
};
const LAYOUTS = ['Auto', 'Left', 'Center'];

// Settings from the URL over the defaults.
const state = { ...DEFAULTS };
state.scene = Object.keys(SCENES).find((k) => slug(k) === params.get('scene')) ?? state.scene;
state.palette = Object.keys(PALETTES).find((k) => paletteSlug(k) === params.get('palette')) ?? state.palette;
state.layout = LAYOUTS.find((k) => k.toLowerCase() === params.get('layout')) ?? state.layout;
// What a value from the URL is held to: the panel's own ranges (so a typo
// can't stop the drawing, or a huge resolution exhaust the GPU).
const LIMITS = {
  speed: [0, 3], spin: [0, 3], zoom: [0.5, 2], threads: [0.4, 2.5], sheen: [0, 2], gain: [0.6, 2.4],
  contrast: [0.6, 1.8], saturation: [0, 2], warm: [0, 1], sparkle: [0, 3], glow: [0, 2.5],
  threshold: [0.2, 0.95], quality: [0.4, 1], fps: [10, 240],
};
for (const [key, fallback] of Object.entries(DEFAULTS)) {
  if (!params.has(key) || typeof fallback === 'string') continue;
  state[key] = typeof fallback === 'boolean' ? params.get(key) !== '0' : number(params.get(key), LIMITS[key]) ?? state[key];
}
if (calm) state.paused = true;

// What goes in the URL: every setting that differs from the defaults
// (the resolution not while the page sets it itself).
function remember() {
  const settings = [];
  for (const [key, fallback] of Object.entries(DEFAULTS)) {
    if (state[key] === fallback || (key === 'quality' && state.autoQuality)) continue;
    if (key === 'scene') settings.push([key, slug(state.scene)]);
    else if (key === 'palette') settings.push([key, paletteSlug(state.palette)]);
    else if (key === 'layout') settings.push([key, state.layout.toLowerCase()]);
    else settings.push([key, format(state[key])]);
  }
  if (language.value === 'zh') settings.push(['lang', 'zh']);
  save('hero', settings);
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

// ---------- Matrices (column-major, as WebGL takes them) ----------

const perspective = (fov, aspect, near, far) => {
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
};
const sub = (a, b) => a.map((x, i) => x - b[i]);
const norm = (a) => a.map((x) => x / Math.hypot(...a));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lookAt = (eye, target, up) => {
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  const d = (a) => -(a[0] * eye[0] + a[1] * eye[1] + a[2] * eye[2]);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, d(x), d(y), d(z), 1];
};
const rotation = (axis, angle) => {
  const [x, y, z] = norm(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
};
// a then b (column-major 4 x 4).
const mul = (a, b) => Array.from({ length: 16 }, (_, i) => {
  const c = Math.floor(i / 4);
  const r = i % 4;
  return a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
});
// A slow wander for time t: sums of sines at unrelated rates, -1 to 1 each way.
const wander = (t) => [
  0.6 * Math.sin(t * 0.071 + 0.4) + 0.4 * Math.sin(t * 0.163 + 2.1),
  0.6 * Math.sin(t * 0.089 + 1.3) + 0.4 * Math.sin(t * 0.137 + 4.0),
  0.6 * Math.sin(t * 0.059 + 3.2) + 0.4 * Math.sin(t * 0.191 + 0.7),
];

// ---------- WebGL ----------

const gl = getGL(canvas, { antialias: false, preserveDrawingBuffer: still !== null });

function program(vert, frag) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vert], [gl.FRAGMENT_SHADER, frag]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) fail(`a shader did not compile: ${gl.getShaderInfoLog(s)}`);
    gl.attachShader(p, s);
  }
  // Every full-screen program reads its corner at location 0.
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) fail(`the shaders did not link: ${gl.getProgramInfoLog(p)}`);
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

const ribbonProg = program(RIBBON_VERT, RIBBON_FRAG);
const backdropProg = program(QUAD_VERT, BACKDROP_FRAG);
const holeProg = program(QUAD_VERT, BLACKHOLE_FRAG);
const brightProg = program(QUAD_VERT, BRIGHT_FRAG);
const blurProg = program(QUAD_VERT, BLUR_FRAG);
const compositeProg = program(QUAD_VERT, COMPOSITE_FRAG);

const quad = gl.createVertexArray();
gl.bindVertexArray(quad);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// Ribbon meshes, built when first shown.
const meshes = {};
function ribbonMesh(name) {
  if (meshes[name]) return meshes[name];
  const { data, index, length, closed, wrap, flip } = SHAPES[name]();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  [['aPos', 3, 0], ['aUv', 2, 3], ['aNormal', 3, 5], ['aTangent', 3, 8]].forEach(([attr, size, offset]) => {
    const at = gl.getAttribLocation(ribbonProg.p, attr);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, size, gl.FLOAT, false, 11 * 4, offset * 4);
  });
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  meshes[name] = { vao, count: index.length, length, closed, wrap, flip };
  return meshes[name];
}

// Render targets: the picture (drawn multisampled, then resolved into a
// texture), and the glow at a quarter and an eighth of its size.
function target(w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fbo, w, h };
}
let targets = null;
function makeTargets(w, h) {
  if (targets && targets.w === w && targets.h === h) return;
  if (targets) {
    for (const t of [targets.scene, targets.n1, targets.n2, targets.w1, targets.w2]) {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    gl.deleteFramebuffer(targets.msFbo);
    gl.deleteRenderbuffer(targets.msColor);
    gl.deleteRenderbuffer(targets.msDepth);
  }
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
  const msFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
  const msColor = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, msColor);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msColor);
  const msDepth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, msDepth);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msDepth);
  const size = (k) => [Math.max(1, Math.round(w / k)), Math.max(1, Math.round(h / k))];
  targets = {
    w, h, msFbo, msColor, msDepth,
    scene: target(w, h),
    n1: target(...size(4)), n2: target(...size(4)),
    w1: target(...size(8)), w2: target(...size(8)),
  };
}

// One full-screen pass into `to` (null: the canvas), reading `inputs`.
function pass(prog, to, inputs, set) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, to ? to.fbo : null);
  gl.viewport(0, 0, to ? to.w : canvas.width, to ? to.h : canvas.height);
  gl.useProgram(prog.p);
  Object.entries(inputs).forEach(([name, t], i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(prog.u[name], i);
  });
  set?.(prog.u);
  gl.bindVertexArray(quad);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ---------- Drawing ----------

let clock = still ?? 0;
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

function palette(u) {
  const p = PALETTES[state.palette];
  const gain = state.gain * (SCENES[state.scene].gain ?? 1);
  const shadow = rgb(p.shadow);
  gl.uniform3fv(u.uRamp, [...shadow.map((c) => c * 0.16), ...shadow, ...rgb(p.steel), ...rgb(p.silver), ...rgb(p.highlight)]);
  gl.uniform3fv(u.uFibreCool, rgb(p.fibreCool));
  gl.uniform3fv(u.uFibreWarm, [...rgb(p.warmLight), ...rgb(p.warmMid), ...rgb(p.warmDeep)]);
  gl.uniform1f(u.uGain, gain);
  gl.uniform1f(u.uWarm, state.warm);
  gl.uniform1f(u.uSparkle, state.sparkle);
  gl.uniform1f(u.uTime, clock);
  gl.uniform1f(u.uFibreTime, clock);
  return p;
}

// Draws the scene into the multisampled target, or, for the black hole (one
// full-screen pass, with no edges to smooth), straight into the picture.
function drawScene() {
  const scene = SCENES[state.scene];
  const { w, h } = targets;
  const aspect = w / h;
  const p = PALETTES[state.palette];
  gl.bindFramebuffer(gl.FRAMEBUFFER, scene.blackHole ? targets.scene.fbo : targets.msFbo);
  gl.viewport(0, 0, w, h);
  gl.bindVertexArray(quad);
  gl.disable(gl.DEPTH_TEST);

  if (scene.blackHole) {
    gl.useProgram(holeProg.p);
    const u = holeProg.u;
    palette(u);
    // Just above the disk's plane, a little off to one side, nudged by
    // the pointer; the zoom moves the camera in or out.
    const d = 20 * state.zoom;
    const tilt = (7 + (state.parallax ? pointer.y * 2 : 0)) * (Math.PI / 180);
    const turn = (state.parallax ? pointer.x * 4 : 0) * (Math.PI / 180);
    const cam = [d * Math.cos(tilt) * Math.sin(turn), d * Math.sin(tilt), d * Math.cos(tilt) * Math.cos(turn)];
    const fwd = norm(sub([0, 0, 0], cam));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    const tanHalf = Math.tan((34 / 2) * (Math.PI / 180));
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform3fv(u.uBg, rgb(p.background));
    gl.uniform1f(u.uThreads, 240 * state.threads);
    gl.uniform1f(u.uSpin, state.spin);
    gl.uniform3fv(u.uCamPos, cam);
    gl.uniform3fv(u.uCamRight, right);
    gl.uniform3fv(u.uCamUp, up);
    gl.uniform3fv(u.uCamFwd, fwd);
    gl.uniform1f(u.uTanHalf, tanHalf);
    gl.uniform1f(u.uPixel, (2 * tanHalf) / h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return;
  }

  // The camera, pulled in or out by the zoom and nudged by the pointer.
  const offset = sub(scene.eye, scene.target).map((c) => c * state.zoom);
  const nudge = state.parallax ? [pointer.x * 0.22, -pointer.y * 0.15, 0] : [0, 0, 0];
  const eye = scene.target.map((c, i) => c + offset[i] + nudge[i]);
  const dist = Math.hypot(...offset);
  const view = lookAt(eye, scene.target, [0, 1, 0]);
  const proj = perspective(scene.fov, aspect, 0.05, 40);

  gl.useProgram(backdropProg.p);
  gl.uniform3fv(backdropProg.u.uBg, rgb(p.background));
  gl.uniform3fv(backdropProg.u.uTint, rgb(p.steel));
  gl.uniform1f(backdropProg.u.uAspect, aspect);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(ribbonProg.p);
  const u = ribbonProg.u;
  palette(u);
  const mesh = ribbonMesh(state.scene);
  const angle = scene.fixed ? 0 : scene.sway ? Math.sin(clock * 0.3 * state.spin) * scene.sway : clock * 0.12 * state.spin;
  gl.uniformMatrix4fv(u.uProj, false, proj);
  gl.uniformMatrix4fv(u.uView, false, view);
  let model = rotation(scene.spin, angle);
  if (scene.drift) {
    const t = clock * state.spin;
    const sway = wander(t);
    const lean = scene.drift.lean + sway[1] * scene.drift.tilt;
    model = mul(mul(rotation([1, 0, 0], lean), rotation([0, 0, 1], sway[2] * scene.drift.tilt)), model);
    // The centre goes round, unevenly, on a loop just outside the screen:
    // in each direction, out past whichever edge it meets first.
    const halfH = dist * Math.tan((scene.fov * Math.PI) / 360);
    const halfW = halfH * aspect;
    const a = t * 0.045 + 1.2 * Math.sin(t * 0.031 + 0.5) + 0.6 * Math.sin(t * 0.077 + 2.0);
    const out = (1 + scene.drift.outside) / Math.max(Math.abs(Math.cos(a)) / halfW, Math.abs(Math.sin(a)) / halfH);
    model[12] = scene.target[0] + Math.cos(a) * out;
    model[13] = scene.target[1] + Math.sin(a) * out;
    model[14] = scene.target[2] + sway[0] * 0.3;
  }
  gl.uniformMatrix4fv(u.uModel, false, model);
  gl.uniform3fv(u.uEye, eye);
  gl.uniform3fv(u.uLight, scene.light);
  gl.uniform3fv(u.uBg, rgb(p.background));
  gl.uniform2fv(u.uFog, scene.fog ?? [dist * 0.9, dist + 2.4]);
  gl.uniform1f(u.uThreads, (mesh.wrap ? 420 : 260) * (scene.threads ?? 1) * state.threads);
  gl.uniform1f(u.uSheen, state.sheen * (scene.sheen ?? 1));
  gl.uniform3fv(u.uFall, scene.fall ?? [0, 1, 1]);
  gl.uniform4fv(u.uPool, scene.pool ?? [0, 0, 0, 1]);
  gl.uniform1f(u.uFlip, mesh.flip ? 1 : 0);
  gl.uniform1f(u.uLoop, mesh.closed ? mesh.length : 0);
  gl.uniform1f(u.uWrap, mesh.wrap ? 1 : 0);
  gl.bindVertexArray(mesh.vao);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
  gl.disable(gl.DEPTH_TEST);
}

function draw() {
  if (gl.isContextLost()) return;
  makeTargets(canvas.width, canvas.height);
  drawScene();
  // Resolve the multisampled picture into a texture.
  if (!SCENES[state.scene].blackHole) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, targets.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, targets.scene.fbo);
    gl.blitFramebuffer(0, 0, targets.w, targets.h, 0, 0, targets.w, targets.h, gl.COLOR_BUFFER_BIT, gl.LINEAR);
  }
  // The glow: keep the bright parts, blur them near and wide, lay them over.
  const { scene, n1, n2, w1, w2 } = targets;
  pass(brightProg, n1, { uSrc: scene }, (u) => {
    gl.uniform2f(u.uTexel, 2 / scene.w, 2 / scene.h);
    gl.uniform1f(u.uThreshold, state.threshold);
  });
  pass(blurProg, n2, { uSrc: n1 }, (u) => gl.uniform2f(u.uStep, 1.5 / n1.w, 0));
  pass(blurProg, n1, { uSrc: n2 }, (u) => gl.uniform2f(u.uStep, 0, 1.5 / n1.h));
  pass(brightProg, w1, { uSrc: n1 }, (u) => {
    gl.uniform2f(u.uTexel, 1 / n1.w, 1 / n1.h);
    gl.uniform1f(u.uThreshold, 0);
  });
  pass(blurProg, w2, { uSrc: w1 }, (u) => gl.uniform2f(u.uStep, 2 / w1.w, 0));
  pass(blurProg, w1, { uSrc: w2 }, (u) => gl.uniform2f(u.uStep, 0, 2 / w1.h));
  // Each scene has its own grade, which the panel's contrast and
  // saturation then scale.
  const grade = SCENES[state.scene].grade ?? [1, 1];
  pass(compositeProg, null, { uScene: scene, uNear: n1, uWide: w1 }, (u) => {
    gl.uniform1f(u.uGlow, state.glow * (SCENES[state.scene].glow ?? 1));
    gl.uniform2f(u.uGrade, grade[0] * state.contrast, grade[1] * state.saturation);
  });
  window.__heroDrawn = true;
}

function resize() {
  const box = canvas.getBoundingClientRect();
  const density = (devicePixelRatio || 1) * state.quality;
  canvas.width = Math.max(1, Math.round(box.width * density));
  canvas.height = Math.max(1, Math.round(box.height * density));
  dirty = true;
  if (still !== null) draw();
}

// Frames: drawn when the pacer allows (the frame-rate cap, on screen, page
// shown) and, while paused, only as long as something still moves (the
// pointer easing) or changed. If frames keep running slow, draw fewer pixels.
const pacer = createPacer(canvas);
let last = null;
let dirty = true;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!state.paused) clock += dt * state.speed;
  const [px, py] = [pointer.x, pointer.y];
  pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
  pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
  const moving = !state.paused || dirty || Math.abs(pointer.x - px) + Math.abs(pointer.y - py) > 1e-5;
  if (!moving || !pacer.ready(now, state.fps)) return;
  draw();
  dirty = false;
  if (pacer.drew(now, state.fps) && state.autoQuality && !state.paused && state.quality > 0.5) {
    state.quality = Math.max(0.5, Math.round((state.quality - 0.1) * 100) / 100);
    resize();
    pane.refresh();
  }
}

// Saves a PNG at twice the canvas's size.
function savePng() {
  const [w, h] = [canvas.width, canvas.height];
  canvas.width = w * 2;
  canvas.height = h * 2;
  draw();
  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `thread-hero-${slug(state.scene)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  canvas.width = w;
  canvas.height = h;
}

// ---------- Panel ----------

const pane = await createPane({ container: document.querySelector('.sidebar'), title: 'PRO Threads' });
const opts = (keys) => Object.fromEntries(keys.map((k) => [k, k]));
// The same tabs as the wallpaper's: PRO and A–Z go back to it, taking the
// palette along; Shapes is this page.
const tabs = pane.addTab({ pages: [{ title: 'PRO' }, { title: 'A–Z' }, { title: 'Shapes' }] });
tabs.pages[2].selected = true;
tabs.on('select', (event) => {
  if (event.index === 2) return;
  location.href = pageUrl('wallpaper', '../', {
    view: event.index === 1 ? 'az' : null,
    palette: state.palette === 'XDR Blue' ? null : paletteSlug(state.palette),
    lang: language.value === 'zh' ? 'zh' : null,
  });
});
menu(tabs.pages[2].addBinding(state, 'scene', { label: 'Scene', options: opts(Object.keys(SCENES)) }));
menu(tabs.pages[2].addBinding(state, 'palette', { label: 'Palette', options: opts(Object.keys(PALETTES)) }));
tabs.pages[2].addBinding(state, 'landing', { label: 'Landing page' });
const layoutBinding = tabs.pages[2].addBinding(state, 'layout', { label: 'Layout', options: opts(LAYOUTS) });
menu(layoutBinding);

const motion = pane.addFolder({ title: 'Motion' });
motion.addBinding(state, 'speed', { label: 'Light speed', min: 0, max: 3, step: 0.01 });
const turnBinding = motion.addBinding(state, 'spin', { label: 'Turn', min: 0, max: 3, step: 0.01 });
motion.addBinding(state, 'parallax', { label: 'Parallax' });
motion.addBinding(state, 'paused', { label: 'Paused' });

const look = pane.addFolder({ title: 'Look' });
look.addBinding(state, 'zoom', { label: 'Distance', min: 0.5, max: 2, step: 0.01 });
look.addBinding(state, 'threads', { label: 'Threads', min: 0.4, max: 2.5, step: 0.01 });
look.addBinding(state, 'sheen', { label: 'Sheen', min: 0, max: 2, step: 0.01 });
look.addBinding(state, 'gain', { label: 'Brightness', min: 0.6, max: 2.4, step: 0.01 });
look.addBinding(state, 'contrast', { label: 'Contrast', min: 0.6, max: 1.8, step: 0.01 });
look.addBinding(state, 'saturation', { label: 'Saturation', min: 0, max: 2, step: 0.01 });
look.addBinding(state, 'warm', { label: 'Warmth', min: 0, max: 1, step: 0.01 });
look.addBinding(state, 'sparkle', { label: 'Fibres', min: 0, max: 3, step: 0.01 });

const glow = pane.addFolder({ title: 'Glow' });
glow.addBinding(state, 'glow', { label: 'Strength', min: 0, max: 2.5, step: 0.01 });
glow.addBinding(state, 'threshold', { label: 'From', min: 0.2, max: 0.95, step: 0.01 });

const perf = pane.addFolder({ title: 'Performance', expanded: false });
perf.addBinding(state, 'quality', { label: 'Resolution', min: 0.4, max: 1, step: 0.05 });
perf.addBinding(state, 'autoQuality', { label: 'Auto' });
perf.addBinding(state, 'fps', {
  label: 'Frame rate',
  view: 'radiogrid',
  groupName: 'fps',
  size: [3, 1],
  cells: (x) => ({ title: String([30, 60, 120][x]), value: [30, 60, 120][x] }),
});
pane.addButton({ title: 'Save PNG' }).on('click', savePng);
addEmbed(pane, 'hero');
// Back to the defaults, keeping the scene shown.
pane.addButton({ title: 'Reset' }).on('click', () => {
  Object.assign(state, DEFAULTS, { scene: state.scene });
  pane.refresh();
});
addLanguage(pane);

const landing = createLanding(document.querySelector('.view'));

// What follows any change: the landing page, which controls apply (the
// layout only with the landing page shown, the turn only for a scene that
// turns), the URL and, when holding one moment, the picture.
function settle() {
  landing.update(state);
  layoutBinding.disabled = !state.landing;
  turnBinding.disabled = !!SCENES[state.scene].fixed;
  remember();
}
settle();

pane.on('change', (event) => {
  if (event.target.key === 'quality') resize();
  dirty = true;
  settle();
  if (still !== null) draw();
});

// ---------- Start ----------

addEventListener('pointermove', (event) => {
  pointer.tx = (event.clientX / innerWidth) * 2 - 1;
  pointer.ty = (event.clientY / innerHeight) * 2 - 1;
});
addEventListener('keydown', (event) => {
  // Not while typing, nor with a modifier (those are the browser's shortcuts).
  if (event.target.tagName === 'INPUT' || event.metaKey || event.ctrlKey || event.altKey || embedded) return;
  if (event.key === 'h' || event.key === 'H') document.body.dataset.ui = document.body.dataset.ui === 'off' ? 'on' : 'off';
  if (event.key === ' ') {
    state.paused = !state.paused;
    pane.refresh();
    event.preventDefault();
  }
});
new ResizeObserver(resize).observe(canvas);
resize();
// The first frame is drawn straight away, whether or not the page is shown
// yet; after that the pacer decides.
draw();
announce();
if (still === null) requestAnimationFrame(frame);
window.__hero = { state, draw, pane };
