/*
 * Shaders for the hero scenes: the ribbons, the black hole, their backdrop,
 * and a glow pass over everything. They shade threads the way the
 * wallpaper does: each thread its own level averaged over the pixel,
 * broader bands over that, light drifting along the threads, and the
 * palette's ramp, rim and glowing fibres.
 */

// Shared pieces: noise, the palette ramp, a fibre warming up, threads.
const COMMON = `
  uniform vec3 uRamp[5];
  uniform vec3 uFibreCool;
  uniform vec3 uFibreWarm[3];
  uniform float uGain;
  uniform float uWarm;
  uniform float uSparkle;
  uniform float uTime;
  uniform float uFibreTime;

  float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }
  float vn2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
               mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // vn at x, where dx is how many of its cells one pixel spans: once its
  // cells get smaller than a pixel it eases to its average, so it never
  // turns to speckle (far down a tunnel, where threads converge).
  float vnf(float x, float dx) { return mix(vn(x), 0.5, smoothstep(0.3, 1.0, dx)); }

  // vn2 repeating every period along y (no repeat if period is 0).
  float vn2p(vec2 p, float period) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float y0 = period > 0.0 ? mod(i.y, period) : i.y;
    float y1 = period > 0.0 ? mod(i.y + 1.0, period) : i.y + 1.0;
    return mix(mix(hash2(vec2(i.x, y0)), hash2(vec2(i.x + 1.0, y0)), f.x),
               mix(hash2(vec2(i.x, y1)), hash2(vec2(i.x + 1.0, y1)), f.x), f.y);
  }

  vec3 ramp(float v) {
    v = max(v, 0.0);
    if (v > 0.7) v = 0.7 + 0.3 * (1.0 - exp(-(v - 0.7) / 0.3));
    if (v < 0.25) return mix(uRamp[0], uRamp[1], v / 0.25);
    if (v < 0.5) return mix(uRamp[1], uRamp[2], (v - 0.25) / 0.25);
    if (v < 0.75) return mix(uRamp[2], uRamp[3], (v - 0.5) / 0.25);
    return mix(uRamp[3], uRamp[4], (v - 0.75) / 0.25);
  }

  vec3 warmth(float s) {
    s = clamp(s, 0.0, 1.0);
    if (s < 0.18) return mix(vec3(0.98, 0.98, 0.95), uFibreWarm[0], s / 0.18);
    if (s < 0.5) return mix(uFibreWarm[0], uFibreWarm[1], (s - 0.18) / 0.32);
    if (s < 0.85) return mix(uFibreWarm[1], uFibreWarm[2], (s - 0.5) / 0.35);
    return mix(uFibreWarm[2], uFibreWarm[2] * 0.66, (s - 0.85) / 0.15);
  }

  float strand(float at) {
    float id = floor(at);
    float h0 = hash(id * 1.37 + 3.1);
    float h1 = hash((id + 1.0) * 1.37 + 3.1);
    return mix(h0 * h0, h1 * h1, smoothstep(0.62, 1.0, fract(at)));
  }

  // How bright the threads are at thread coordinate t (one unit a thread),
  // dt of them under the pixel: fine threads over broader bands, weighted
  // like the wallpaper's.
  float threads(float t, float dt) {
    float sum = 0.0;
    for (int i = 0; i < 4; i++) sum += strand(t + dt * (float(i) - 1.5) / 4.0);
    float thread = mix(sum * 0.25, 1.0 / 3.0, smoothstep(1.5, 5.0, dt));
    float fine = vnf(t * 0.33 + 13.0, dt * 0.33);
    return 0.26 + 0.3 * thread + 0.16 * fine + 0.2 * vnf(t * 0.12 + 7.0, dt * 0.12) + 0.2 * vnf(t * 0.05 + 29.0, dt * 0.05);
  }

  // A few threads glow, warming along their length; the warm stretch
  // slides along them and moves on to other threads over time. Each fibre
  // lies along the middle of its thread, and the pixel takes the share of
  // it that falls under it (threads t - dt/2 to t + dt/2), so a fibre
  // thinner than a pixel fades rather than breaking into dashes. Once a
  // pixel spans a few threads a fibre covers too little of it to show, so
  // they fade out there and aren't looked for at all.
  vec3 fibre(vec3 col, float t, float dt, float along) {
    float fade = 1.0 - smoothstep(2.0, 3.0, dt);
    if (fade <= 0.0) return col;
    float w = max(dt, 0.3);
    float t0 = t - 0.5 * w;
    float t1 = t + 0.5 * w;
    vec3 sum = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < 5; i++) {
      float id = floor(t0) + float(i);
      if (id > t1) break;
      float turn = uFibreTime * 0.06 + hash(id * 0.37);
      float pick = hash(id * 1.91 + floor(turn) * 7.3);
      if (pick > 0.012 * uSparkle) continue;
      float share = max(0.0, min(t1, id + 0.8) - max(t0, id + 0.2)) / w * fade;
      float s = fract(along * 0.08 - uFibreTime * 0.05 + hash(id));
      float lit = sin(3.14159 * fract(turn)) * smoothstep(0.0, 0.15, s) * smoothstep(1.0, 0.85, s);
      vec3 c = s < 0.35 ? mix(mix(uFibreCool, vec3(1.0), 0.6), uFibreCool, s / 0.35)
                        : mix(vec3(0.98, 0.98, 0.95), warmth((s - 0.35) / 0.65), mix(0.55, 1.0, uWarm));
      sum += c * share * lit;
      cover += share * lit;
    }
    return col * (1.0 - min(cover, 1.0)) + sum;
  }
`;

export const RIBBON_VERT = `#version 300 es
  in vec3 aPos;
  in vec2 aUv;
  in vec3 aNormal;
  in vec3 aTangent;
  uniform mat4 uProj;
  uniform mat4 uView;
  uniform mat4 uModel;
  out vec2 vUv;
  centroid out vec2 vUvAt;
  out vec3 vNormal;
  out vec3 vTangent;
  out vec3 vWorld;
  void main() {
    vec4 world = uModel * vec4(aPos, 1.0);
    vWorld = world.xyz;
    vNormal = mat3(uModel) * aNormal;
    vTangent = mat3(uModel) * aTangent;
    vUv = aUv;
    vUvAt = aUv;
    gl_Position = uProj * uView * world;
  }`;

// A ribbon: threads run along u. They catch light the way fibres do (a
// sheen across the threads, strongest where the light glances off them),
// with light drifting along them, a bright rim at the band's edges, and
// fading into the backdrop with distance.
export const RIBBON_FRAG = `#version 300 es
  precision highp float;
  ${COMMON}
  uniform float uThreads;     // threads across the band
  uniform float uSheen;
  uniform vec3 uEye;
  uniform vec3 uLight;
  uniform vec3 uBg;
  uniform vec2 uFog;          // distances where fading starts and ends
  uniform float uLoop;        // a closed band's length (0 if open)
  uniform float uWrap;        // 1 if the band closes round on itself across (a tube)
  uniform vec3 uFall;         // light falling from where the threads start: how much, how far, the floor it settles to
  uniform vec4 uPool;         // light at a fold: where along the threads, how strong there, how strong past it, how far that runs
  uniform float uFlip;        // 1 if the band comes back round flipped (a Möbius strip)
  // (u, v) twice: vUvAt is taken inside the triangle, so a pixel on an
  // edge never reads a value from past it (where a Möbius strip's ends
  // meet, that would land on the wrong thread); vUv gives the rates of
  // change, which centroid sampling would make uneven.
  in vec2 vUv;
  centroid in vec2 vUvAt;
  in vec3 vNormal;
  in vec3 vTangent;
  in vec3 vWorld;
  out vec4 outColor;

  // On a closed band, each pattern along it fits a whole number of times
  // round, so it meets itself without a seam.
  // dt, dAlong: threads and length one pixel covers; bands finer than a
  // pixel either way ease to their average.
  float bandsAt(float t, float along, float dt, float dAlong) {
    float k = 2.2;
    if (uLoop > 0.0) k = max(1.0, floor(uLoop * k + 0.5)) / uLoop;
    float dir = vn(t * 0.07 + 21.0) > 0.5 ? 1.0 : -1.0;
    float pace = mix(0.3, 1.0, vn(t * 0.11 + 5.0));
    float b = vn2p(vec2(t * 0.5, along * k - uTime * pace * dir), uLoop > 0.0 ? floor(uLoop * k + 0.5) : 0.0);
    return mix(b, 0.5, smoothstep(0.3, 1.0, max(dt * 0.5, dAlong * k)));
  }

  // The colour of thread t at this point. What doesn't depend on the
  // thread comes in: how the light falls on the threads here (lit), the
  // sheen and the rim.
  vec3 strandColour(float t, float dt, float along, float dAlong, float lit, float sheen, float rim) {
    float s = threads(t, dt);
    float bands = bandsAt(t, along, dt, dAlong);
    float w = 0.9;
    if (uLoop > 0.0) w = 6.28318 * max(1.0, floor(uLoop * w / 6.28318 + 0.5)) / uLoop;
    float swell = 0.75 + 0.25 * sin(along * w - uTime * 0.7 + vn(t * 0.02) * 6.0);

    // As on the wallpaper, light can fall from where the threads start and
    // settle to a floor, a little further on some threads than others.
    float reach = uFall.y * mix(0.7, 1.3, vnf(t * 0.9 + 17.0, dt * 0.9));
    float fall = mix(1.0, uFall.z + (1.0 - uFall.z) * exp(-pow(along / reach, 1.3)), uFall.x);
    float light = lit * (0.7 + 0.6 * bands) * swell * fall;
    // Where a wall rolls onto the floor the light gathers on the fold and
    // runs on across the floor toward the viewer, fading as it goes.
    float past = along - uPool.x;
    // The run past the fold eases in, so the light has no edge there.
    float run = smoothstep(-0.4, 0.4, past) * exp(-max(past, 0.0) / uPool.w);
    light += (uPool.y * exp(-pow(past / 0.35, 2.0)) + uPool.z * run) * (0.85 + 0.3 * bands);
    float v = (s * light + sheen * uSheen * (0.5 + s) + rim * 0.8) * uGain;
    return fibre(ramp(v), t, dt, uLoop > 0.0 ? along * floor(uLoop * 0.08 + 0.5) / (uLoop * 0.08) : along);
  }

  void main() {
    float t = (vUvAt.y * 0.5 + 0.5) * uThreads;
    float dt = max(fwidth(vUv.y * 0.5 * uThreads), 1e-4);
    float along = vUvAt.x;
    float dAlong = fwidth(vUv.x);

    vec3 T = normalize(vTangent);
    vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 V = normalize(uEye - vWorld);
    vec3 L = normalize(uLight);
    vec3 H = normalize(L + V);
    // Threads as fine cylinders: lit by how square the light falls across
    // them, with a sheen where the half vector is square to them too.
    float diffuse = sqrt(max(0.0, 1.0 - pow(dot(T, L), 2.0)));
    float sheen = pow(sqrt(max(0.0, 1.0 - pow(dot(T, H), 2.0))), 60.0);
    float facing = 0.55 + 0.45 * abs(dot(N, V));
    float lit = (0.25 + 0.75 * diffuse) * facing;

    // The band's edges, a couple of pixels wide (a tube has none).
    float edge = (1.0 - abs(vUvAt.y)) / max(fwidth(vUv.y), 1e-5);
    float rim = uWrap > 0.5 ? 0.0 : exp(-edge / 2.2);

    vec3 col = strandColour(t, dt, along, dAlong, lit, sheen, rim);
    // A tube's last threads fade into its first, so it closes without a
    // seam. A Möbius strip comes back round flipped, its threads in the
    // other order, so near its end it fades into them in that order.
    if (uWrap > 0.5) {
      float join = smoothstep(uThreads * 0.86, uThreads, t);
      if (join > 0.0) col = mix(col, strandColour(t - uThreads, dt, along, dAlong, lit, sheen, rim), join);
    }
    if (uFlip > 0.5) {
      float join = smoothstep(uLoop - 0.8, uLoop, along);
      if (join > 0.0) col = mix(col, strandColour(uThreads - t, dt, along, dAlong, lit, sheen, rim), join);
    }

    float fog = smoothstep(uFog.x, uFog.y, distance(uEye, vWorld));
    outColor = vec4(mix(col, uBg, fog), 1.0);
  }`;

export const QUAD_VERT = `#version 300 es
  in vec2 aPos;
  out vec2 vUv;
  void main() {
    vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

// The backdrop behind a ribbon: the palette's background with a little
// light pooled in the middle, behind the shape.
export const BACKDROP_FRAG = `#version 300 es
  precision highp float;
  uniform vec3 uBg;
  uniform vec3 uTint;
  uniform float uAspect;
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    outColor = vec4(uBg + uTint * 0.06 * exp(-dot(p, p) * 5.0), 1.0);
  }`;

// A black hole, ray traced. Each pixel's ray is bent by the hole as it
// goes (the usual pseudo-Newtonian bend for light, in units of the
// hole's radius), and wherever it crosses the plane of the accretion disk
// within the disk's radii it picks up the disk's colour there. So the far
// side of the disk is seen bent up over the hole, its underside bent down
// below it, and a thin photon ring where light circles the hole before
// escaping. Rays that fall in stay black; rays that get away show faint
// stars, warped near the hole.
export const BLACKHOLE_FRAG = `#version 300 es
  precision highp float;
  ${COMMON}
  uniform float uAspect;
  uniform vec3 uBg;
  uniform float uThreads;
  uniform float uSpin;
  uniform vec3 uCamPos;
  uniform vec3 uCamRight;
  uniform vec3 uCamUp;
  uniform vec3 uCamFwd;
  uniform float uTanHalf;     // tan of half the vertical field of view
  uniform float uPixel;       // one pixel's angle, in radians
  in vec2 vUv;
  out vec4 outColor;

  const float RIN = 2.6;
  const float ROUT = 9.0;
  const int HITS = 3;         // disk crossings shaded per ray

  // The disk where a ray crosses it: circling threads, turning faster
  // near the hole, brighter on the side coming toward the viewer. dt and
  // dx: how many threads, and how much of the disk's width, one pixel
  // covers there.
  vec4 disk(vec3 hit, vec3 dir, float dt, float dx) {
    float r = length(hit.xz);
    float a = atan(hit.z, hit.x);
    float x = (r - RIN) / (ROUT - RIN);
    float t = x * uThreads;
    float s = threads(t, dt);
    float spin = uSpin * 0.45 * pow(r / RIN, -1.5);
    float bands = mix(vn2p(vec2(t * 0.5, a / 6.28318 * 28.0 - uTime * spin * 28.0 / 6.28318), 28.0), 0.5, smoothstep(0.3, 1.0, dt * 0.5));
    vec3 orbit = normalize(vec3(-sin(a), 0.0, cos(a)));
    float beta = 0.5 * pow(r / RIN, -0.5);
    float beam = clamp(pow(1.0 / (1.0 - beta * dot(orbit, -dir)), 3.0), 0.2, 2.2);
    float light = (0.2 + 0.62 * exp(-x * 2.6)) * (0.7 + 0.6 * bands) * beam;
    // Its inner and outer edges, never sharper than a pixel.
    float edge = smoothstep(0.0, max(0.03, dx), x) * smoothstep(1.0, min(0.7, 1.0 - dx), x);
    vec3 col = fibre(ramp(s * light * uGain), t, dt, a * r);
    return vec4(col, 0.92 * edge);
  }

  float stars(vec3 d) {
    vec2 q = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 160.0;
    vec2 cell = floor(q);
    float h = hash2(cell);
    vec2 at = fract(q) - vec2(hash2(cell + 7.1), hash2(cell + 3.7));
    return step(0.985, h) * exp(-dot(at, at) * 40.0) * (0.3 + 0.7 * hash2(cell + 1.3));
  }

  void main() {
    vec2 ndc = vec2((vUv.x * 2.0 - 1.0) * uAspect, 1.0 - vUv.y * 2.0);
    vec3 v = normalize(uCamFwd + (uCamRight * ndc.x + uCamUp * ndc.y) * uTanHalf);
    vec3 p = uCamPos;
    vec3 h = cross(p, v);
    float h2 = dot(h, h);
    // Where the ray crosses the disk (up to HITS times, nearest first): the
    // point, the ray's direction there, and how far it had come.
    vec3 hitAt[HITS];
    vec3 hitDir[HITS];
    float hitWay[HITS];
    for (int k = 0; k < HITS; k++) {
      hitAt[k] = vec3(0.0);
      hitDir[k] = vec3(0.0, 1.0, 0.0);
      hitWay[k] = 0.0;
    }
    int hits = 0;
    float cover = 0.0;
    float travelled = 0.0;
    bool escaped = false;
    for (int i = 0; i < 260; i++) {
      float r2 = dot(p, p);
      float r = sqrt(r2);
      if (r < 1.0) break;
      // Heading out past the disk the ray barely bends any more: it has escaped.
      if (r > ROUT * 1.35 && dot(p, v) > 0.0) { escaped = true; break; }
      float ds = clamp(0.07 * r, 0.02, 1.5);
      vec3 next = p + v * ds;
      if (p.y * next.y < 0.0) {
        vec3 hit = mix(p, next, p.y / (p.y - next.y));
        float hr = length(hit.xz);
        if (hr > RIN && hr < ROUT) {
          hitAt[hits] = hit;
          hitDir[hits] = v;
          hitWay[hits] = travelled + distance(p, hit);
          hits++;
          cover += (1.0 - cover) * 0.92;
          if (hits == HITS || cover > 0.97) break;
        }
      }
      v = normalize(v - 1.5 * h2 * p / pow(r2, 2.5) * ds);
      p = next;
      travelled += ds;
    }

    // Shade the crossings. How many threads a pixel covers comes from how
    // the thread coordinate changes across neighbouring pixels, so it
    // counts the disk being squeezed or stretched by the bending too;
    // where neighbours see another part of the disk it is held to a
    // generous multiple of the plain estimate (distance and slant only).
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    for (int k = 0; k < HITS; k++) {
      float x = (length(hitAt[k].xz) - RIN) / (ROUT - RIN);
      float plain = uThreads / (ROUT - RIN) * hitWay[k] * uPixel / max(abs(hitDir[k].y), 0.08);
      float dt = clamp(fwidth(x) * uThreads, plain * 0.25, plain * 60.0);
      if (k >= hits) continue;
      vec4 c = disk(hitAt[k], hitDir[k], dt, dt / uThreads);
      col += (1.0 - alpha) * c.rgb * c.a;
      alpha += (1.0 - alpha) * c.a;
    }
    if (escaped) col += (1.0 - alpha) * (uBg + ramp(0.9) * stars(v) * 0.4);
    outColor = vec4(col, 1.0);
  }`;

// Glow: keep what is brighter than a threshold, at a quarter size...
export const BRIGHT_FRAG = `#version 300 es
  precision highp float;
  uniform sampler2D uSrc;
  uniform vec2 uTexel;
  uniform float uThreshold;
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 c = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 o = (vec2(i % 2, i / 2) - 0.5) * uTexel;
      c += texture(uSrc, uv + o).rgb;
    }
    c *= 0.25;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    outColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.25, lum), 1.0);
  }`;

// ...blur it one way at a time...
export const BLUR_FRAG = `#version 300 es
  precision highp float;
  uniform sampler2D uSrc;
  uniform vec2 uStep;
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    const float w[5] = float[5](0.227, 0.194, 0.122, 0.054, 0.016);
    vec3 c = texture(uSrc, uv).rgb * w[0];
    for (int i = 1; i < 5; i++) {
      c += texture(uSrc, uv + uStep * float(i)).rgb * w[i];
      c += texture(uSrc, uv - uStep * float(i)).rgb * w[i];
    }
    outColor = vec4(c, 1.0);
  }`;

// ...and lay a near and a wide glow over the picture, then grade it:
// contrast as an S-curve about a low pivot (darks deepen, brights rise
// toward white without clipping) and saturation away from each pixel's grey.
export const COMPOSITE_FRAG = `#version 300 es
  precision highp float;
  uniform sampler2D uScene;
  uniform sampler2D uNear;
  uniform sampler2D uWide;
  uniform float uGlow;
  uniform vec2 uGrade;        // contrast, saturation
  in vec2 vUv;
  out vec4 outColor;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec3 c = texture(uScene, uv).rgb + (texture(uNear, uv).rgb * 0.9 + texture(uWide, uv).rgb * 1.4) * uGlow;
    // Leave the picture as it is up to 0.8, and roll off what the glow
    // pushes past that instead of clipping it.
    vec3 over = max(c - 0.8, 0.0);
    c = min(c - over + over / (1.0 + over * 2.5), 1.0);
    const float pivot = 0.3;
    vec3 low = pivot * pow(max(c, 0.0) / pivot, vec3(uGrade.x));
    vec3 high = 1.0 - (1.0 - pivot) * pow(max(1.0 - c, 0.0) / (1.0 - pivot), vec3(uGrade.x));
    c = mix(low, high, step(pivot, c));
    float grey = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(grey), c, uGrade.y);
    outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;
