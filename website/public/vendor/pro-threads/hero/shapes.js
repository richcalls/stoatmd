/*
 * Ribbons for the hero scenes. Each shape is a band of threads laid along a
 * curve: u runs along the threads (in world units, so the light moves at
 * the same pace on every shape) and v across them, from -1 to 1. A mesh
 * vertex carries its position, (u, v), normal and the threads' direction.
 */

const TAU = Math.PI * 2;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => scale(a, 1 / (Math.hypot(...a) || 1));
const rotate = (b, t, angle) => add(scale(b, Math.cos(angle)), scale(cross(t, b), Math.sin(angle)));

// A mesh from a grid of surface points S[i][j] (i along, j across), with
// v running from v0 to v1 across. Normals and thread directions come from
// the grid itself; u is the arc length along the middle of the band.
function mesh(S, v0, v1) {
  const nu = S.length;
  const nv = S[0].length;
  const mid = Math.floor(nv / 2);
  const us = [0];
  for (let i = 1; i < nu; i++) us.push(us[i - 1] + Math.hypot(...sub(S[i][mid], S[i - 1][mid])));
  const data = new Float32Array(nu * nv * 11);
  let k = 0;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const p = S[i][j];
      const t = norm(sub(S[Math.min(nu - 1, i + 1)][j], S[Math.max(0, i - 1)][j]));
      const across = norm(sub(S[i][Math.min(nv - 1, j + 1)], S[i][Math.max(0, j - 1)]));
      const n = norm(cross(t, across));
      data.set([...p, us[i], v0 + (v1 - v0) * (j / (nv - 1)), ...n, ...t], k);
      k += 11;
    }
  }
  const index = [];
  for (let i = 0; i < nu - 1; i++) {
    for (let j = 0; j < nv - 1; j++) {
      const a = i * nv + j;
      const b = a + nv;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { data, index: new Uint32Array(index), length: us[nu - 1], closed: false };
}

// A band of half-width w along a sampled curve. Its width points along
// `axis` where given (kept square to the curve), else is carried along the
// curve without spinning, closed up and given `twist` extra half turns.
function band(points, { w, closed = false, axis = null, twist = 0 }) {
  const n = points.length;
  const at = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const T = points.map((_, i) => norm(sub(at(i + 1), at(i - 1))));
  let B = [];
  if (axis) {
    B = T.map((t) => norm(sub(axis, scale(t, dot(t, axis)))));
  } else {
    const seed = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    B[0] = norm(sub(seed, scale(T[0], dot(T[0], seed))));
    for (let i = 1; i < n; i++) B[i] = norm(sub(B[i - 1], scale(T[i], dot(T[i], B[i - 1]))));
  }
  // Closing a carried frame: spread the angle it comes back off by, plus
  // any twist asked for, evenly along the band.
  let total = twist * Math.PI;
  if (closed) {
    // The frame carried back round to the start, as the closing row's.
    const back = axis ? B[0] : norm(sub(B[n - 1], scale(T[0], dot(T[0], B[n - 1]))));
    if (!axis) total -= Math.atan2(dot(cross(B[0], back), T[0]), dot(B[0], back));
    B.push(back);
    T.push(T[0]);
  }
  const rows = [];
  const count = closed ? n + 1 : n;
  for (let i = 0; i < count; i++) {
    const k = i % n;
    const b = rotate(B[i], T[i], total * (i / (count - 1)));
    const row = [];
    for (let j = 0; j < 7; j++) row.push(add(points[k], scale(b, w * (-1 + 2 * j / 6))));
    rows.push(row);
  }
  // The closing row lands back on the first (turned over by an odd twist);
  // it reuses those exact points so the join has no pinholes.
  if (closed) rows[count - 1] = twist % 2 ? [...rows[0]].reverse() : rows[0];
  return { ...mesh(rows, -1, 1), closed };
}

// Comes straight down a wall at x0, turns over a rounded edge onto the
// floor and runs out toward the viewer, fanning to one side if asked.
function wallToFloor(x0, side, { height, r, run, fan }) {
  const pts = [];
  for (let i = 0; i <= 260; i++) pts.push([x0, height - (height - r) * (i / 260), 0]);
  for (let i = 1; i <= 90; i++) {
    const a = (Math.PI / 2) * (i / 90);
    pts.push([x0, r - r * Math.sin(a), r - r * Math.cos(a)]);
  }
  for (let i = 1; i <= 260; i++) {
    const z = run * (i / 260);
    pts.push([x0 + side * fan * z * z, 0, r + z]);
  }
  return pts;
}

export const SHAPES = {
  // A wide ring of threads, its band tilted a little up like a shallow
  // cone so the light slides across it as it turns.
  Ring: () => {
    const rows = [];
    const n = 1400;
    for (let i = 0; i <= n; i++) {
      const th = (TAU * i) / n;
      const radial = [Math.cos(th), 0, Math.sin(th)];
      const b = norm(add(radial, [0, 0.28, 0]));
      const c = scale(radial, 1.25);
      rows.push(Array.from({ length: 7 }, (_, j) => add(c, scale(b, 0.27 * (-1 + 2 * j / 6)))));
    }
    return { ...mesh(rows, -1, 1), closed: true };
  },
  // One wide wall of threads coming straight down, rolling over a rounded
  // edge onto the floor and running on toward the viewer.
  Perspective: () => band(wallToFloor(0, 0, { height: 6.5, r: 0.55, run: 6.5, fan: 0 }), { w: 4.4, axis: [1, 0, 0] }),
  // A Möbius strip: a band carried once round a circle while it makes a
  // half turn, so its one side and its one edge run on into themselves.
  // Coming back round, its threads meet themselves in the other order
  // (flip), which the shader blends across.
  'Möbius': () => {
    const pts = [];
    for (let i = 0; i < 1400; i++) {
      const th = (TAU * i) / 1400;
      pts.push([2.4 * Math.cos(th), 0, 2.4 * Math.sin(th)]);
    }
    return { ...band(pts, { w: 0.55, closed: true, twist: 1 }), flip: true };
  },
  // The inside of a long tube, its threads running away to a vanishing
  // point. v runs once round; the shader joins its two ends seamlessly.
  Tunnel: () => {
    const rows = [];
    const around = 97;
    for (let i = 0; i <= 1600; i++) {
      const z = 3 - 43 * (i / 1600);
      rows.push(Array.from({ length: around }, (_, j) => {
        const a = TAU * (j / (around - 1));
        return [Math.cos(a), Math.sin(a), z];
      }));
    }
    return { ...mesh(rows, -1, 1), closed: false, wrap: true };
  },
};
