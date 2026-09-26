/**
 * Homechew scroll story — the single source of truth for scene state.
 *
 * pose(u, layout) is a pure function: the same scroll position always yields
 * the same scene, so scrolling backward rewinds and fast flicks settle exactly.
 *
 *   u ∈ [-1, 0)  hero is scrolling away (trio → approach)
 *   u ∈ [0, 1]   S1 "We craft. You pour." pinned chapter progress
 *
 * Beat ranges follow data/motion.json (proposed starting values, tune after testing).
 * No DOM, no three.js, no time: this module is imported by node tests as well.
 */

export const BEATS = [
  {id: 'approach', from: 0.00, to: 0.15},
  {id: 'open', from: 0.15, to: 0.32},
  {id: 'tilt', from: 0.32, to: 0.45},
  {id: 'pour', from: 0.45, to: 0.75},
  {id: 'payoff', from: 0.75, to: 0.90},
  {id: 'rest', from: 0.90, to: 1.00},
];

// Sub-steps inside the beats. Seal must be fully clear of the cap before the cap turns.
export const T = {
  othersExit: [-0.55, 0.12],
  peel: [0.15, 0.26], // front end → over the cap → off the back glue: strip fully free
  sealDrop: [0.262, 0.31],
  twist: [0.265, 0.31],
  capLift: [0.3, 0.345],
  bowlIn: [0.27, 0.37],
  raise: [0.32, 0.40],
  tilt: [0.34, 0.47],
  streamHead: [0.465, 0.505],
  pool: [0.505, 0.715], // the bowl starts filling only after the leading drop lands
  streamTail: [0.715, 0.75],
  untilt: [0.715, 0.83],
  payoff: [0.83, 0.9], // food card waits until the bottle is back upright
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const range = (v, [a, b]) => clamp((v - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
export const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
export const easeOut = t => 1 - (1 - t) ** 3;
export const easeIn = t => t * t * t;
// "Rounded, slightly weighty" — sauce vocabulary: soft start, cohesive settle.
export const easeSauce = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/* ---------- World layout (model units: bottle body radius = 1) ---------- */
export const BOTTLE = {
  radius: 1,
  height: 6.15,
  neckRadius: 0.52,
  mouthY: 5.95,
  capBottom: 5.72,
  capTop: 6.15,
  capRadius: 0.64,
  pivotY: 3.0,
  fillUpright: 5.42, // filled into the neck like the concept bottles (model units)
};
export const BOWL = {radius: 1.28, depth: 0.78, innerBottom: 0.16, servingLevel: 0.652};

/* ---------- Shared vessel geometry and volume (model units, not product mL) ---------- */
export function bodyRadius(y) {
  if (y <= 0.2) return 0.9 + 0.1 * Math.sin((y / 0.2) * Math.PI / 2);
  if (y <= 4.1) return BOTTLE.radius;
  if (y <= 5.2) {
    const t = (y - 4.1) / 1.1;
    return BOTTLE.neckRadius + (BOTTLE.radius - BOTTLE.neckRadius) * (1 + Math.cos(Math.PI * Math.pow(t, 0.85))) / 2;
  }
  return BOTTLE.neckRadius;
}

// [height, radius]. Both the visible mesh and the volume solver use this same cavity.
export const BOTTLE_CAVITY = [[0.15, 0.84], [0.24, 0.93], [0.4, 0.945], [4.1, 0.945]];
for (let i = 1; i <= 24; i++) {
  const y = 4.1 + 1.1 * i / 24;
  BOTTLE_CAVITY.push([y, bodyRadius(y) - 0.055]);
}
BOTTLE_CAVITY.push([5.9, BOTTLE.neckRadius - 0.055]);

export function bowlInnerRadius(y) {
  const t = clamp((y - BOWL.innerBottom) / (BOWL.depth - BOWL.innerBottom));
  return 0.32 + (BOWL.radius - 0.42) * Math.sin(t * Math.PI / 2) ** 0.9;
}

// Eight-point Gauss integration. Split at vessel/plane intersections first, avoiding
// the height quantization of a point-cloud percentile, especially near upright.
const GL = [
  [-0.9602898565, 0.1012285363], [-0.7966664774, 0.2223810345],
  [-0.5255324099, 0.3137066459], [-0.1834346425, 0.3626837834],
  [0.1834346425, 0.3626837834], [0.5255324099, 0.3137066459],
  [0.7966664774, 0.2223810345], [0.9602898565, 0.1012285363],
];
const integrate = (f, lo, hi) => {
  const half = (hi - lo) / 2, mid = (lo + hi) / 2;
  return half * GL.reduce((sum, [x, w]) => sum + w * f(mid + half * x), 0);
};
const frustumVolume = (a, b, h) => Math.PI * h * (a * a + a * b + b * b) / 3;

export function bowlVolumeAt(level) {
  return integrate(y => Math.PI * bowlInnerRadius(y) ** 2, BOWL.innerBottom, clamp(level, BOWL.innerBottom, BOWL.depth));
}

export function bowlLevelForVolume(volume) {
  let lo = BOWL.innerBottom, hi = BOWL.depth;
  for (let i = 0; i < 23; i++) {
    const mid = (lo + hi) / 2;
    if (bowlVolumeAt(mid) < volume) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Volume below a horizontal plane, measured from the rotated bottle's local origin. */
export function bottleVolumeBelow(level, angle = 0) {
  const s = Math.abs(Math.sin(angle)), c = Math.cos(angle);
  let volume = 0;
  for (let i = 0; i < BOTTLE_CAVITY.length - 1; i++) {
    const [y0, r0] = BOTTLE_CAVITY[i], [y1, r1] = BOTTLE_CAVITY[i + 1];
    const slope = (r1 - r0) / (y1 - y0);
    const radius = y => r0 + (y - y0) * slope;
    if (s < 1e-7) {
      const cut = clamp(level / c, y0, y1);
      volume += c > 0 ? frustumVolume(r0, radius(cut), cut - y0) : frustumVolume(radius(cut), r1, y1 - cut);
      continue;
    }
    const cuts = [y0, y1];
    for (const sign of [-1, 1]) {
      const den = c + sign * s * slope;
      const y = (level - sign * s * (r0 - slope * y0)) / den;
      if (y > y0 && y < y1) cuts.push(y);
    }
    cuts.sort((a, b) => a - b);
    for (let j = 0; j < cuts.length - 1; j++) {
      const lo = cuts[j], hi = cuts[j + 1], mid = (lo + hi) / 2;
      const radiusMid = radius(mid), xMid = (level - c * mid) / s;
      if (xMid >= radiusMid) { volume += frustumVolume(radius(lo), radius(hi), hi - lo); continue; }
      if (xMid <= -radiusMid) continue;
      volume += integrate(y => {
        const r = radius(y), x = clamp((level - c * y) / s, -r, r);
        return r * r * Math.acos(-x / r) + x * Math.sqrt(Math.max(0, r * r - x * x));
      }, lo, hi);
    }
  }
  return volume;
}

export function bottleLevelForVolume(angle, volume) {
  const s = Math.abs(Math.sin(angle)), c = Math.cos(angle);
  let lo = Infinity, hi = -Infinity;
  for (const [y, r] of BOTTLE_CAVITY) { lo = Math.min(lo, c * y - s * r); hi = Math.max(hi, c * y + s * r); }
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bottleVolumeBelow(mid, angle) < volume) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export const SAUCE = {
  initialVolume: bottleVolumeBelow(BOTTLE.fillUpright),
  servingVolume: bowlVolumeAt(BOWL.servingLevel),
  airborneVolume: 0.062, // narrow cohesive ribbon between the lip and bowl
};
BOTTLE.fillAfter = bottleLevelForVolume(0, SAUCE.initialVolume - SAUCE.servingVolume);

function sauceState(u, head, tail) {
  // Once the tail leaves the lip, the bottle stops losing sauce. That final ribbon
  // still reaches the bowl; it is not deleted or added back into the bottle.
  const inFlight = SAUCE.airborneVolume * head * head * (1 - tail * tail);
  const volume = (SAUCE.servingVolume - SAUCE.airborneVolume) * smooth(range(u, T.pool)) + SAUCE.airborneVolume * tail * tail;
  return {bowl: volume, inFlight, remaining: SAUCE.initialVolume - volume - inFlight};
}

export const LAYOUT = {
  bottles: {
    'HC-HY': [0, 0, 0.55],
    'HC-MC': [-2.75, 0, -0.95],
    'HC-CK': [2.75, 0, -0.95],
  },
  // The bowl sits on the left so the tipped bottle's body swings away from the HTML copy.
  bowl: [-2.55, 0, 1.05],
  bowlFrom: [-8.5, 0, 2.4],
  capRest: [1.9, 0, 1.8],
  // Where the mouth sits at full tilt (just inside the bowl rim, above centre).
  pourMouth: [-2.05, 2.28, 1.0],
  tiltAngle: 2.02, // radians about Z; mouth swings toward −X (the bowl)
};

/* ---------- Camera keyframes ---------- */
// Solved offline so each beat's subject fits its screen region (see docs/homechew/IMPLEMENTATION_NOTES.md).
// target = look-at point; az/el = orbit angles in degrees; dist = camera distance;
// shift = off-axis projection offset in NDC so the HTML copy keeps its side of the screen.
const CAM = {
  wide: [
    {at: -1, target: [0, 3.07, -0.19], az: 0, el: 4, dist: 24.2, fov: 26, shift: [0.37, 0]},
    {at: 0, target: [0, 3.16, 0.56], az: 0, el: 6, dist: 20.3, fov: 25, shift: [0.385, -0.05]},
    {at: 0.15, target: [0, 4.29, 0.56], az: 0, el: 8, dist: 12.8, fov: 25, shift: [0.385, -0.05]},
    {at: 0.215, target: [0.0, 5.45, 0.57], az: 2, el: 14, dist: 11.2, fov: 25, shift: [0.385, -0.05]},
    {at: 0.31, target: [0.01, 4.9, 0.57], az: 3, el: 11, dist: 10.6, fov: 25, shift: [0.385, -0.05]},
    {at: 0.39, target: [-0.06, 3.36, 1], az: 6, el: 12, dist: 21.25, fov: 26, shift: [0.385, -0.05]},
    {at: 0.45, target: [0.1, 2.8, 1.05], az: 8, el: 13, dist: 21.45, fov: 26, shift: [0.385, -0.05]},
    {at: 0.62, target: [-0.58, 2.46, 1.05], az: 10, el: 14, dist: 17.35, fov: 26, shift: [0.385, -0.05]},
    {at: 0.76, target: [-1.18, 3.15, 0.97], az: 6, el: 22, dist: 18.35, fov: 26, shift: [0.385, -0.05]},
    {at: 0.88, target: [-0.6, 3.04, 1.03], az: 6, el: 20, dist: 20.85, fov: 26, shift: [0.38, -0.06]},
    {at: 1, target: [-0.59, 3.03, 1.03], az: 4, el: 17, dist: 19.1, fov: 26, shift: [0.38, -0.04]},
  ],
  tall: [
    {at: -1, target: [0, 3.08, 0.32], az: 0, el: 5, dist: 31.6, fov: 30, shift: [0, -0.4]},
    {at: 0, target: [0, 3.14, 0.56], az: 0, el: 7, dist: 24.55, fov: 30, shift: [0, -0.35]},
    {at: 0.15, target: [0, 4.28, 0.56], az: 0, el: 9, dist: 15.5, fov: 30, shift: [0, -0.35]},
    {at: 0.215, target: [0.0, 5.45, 0.57], az: 3, el: 15, dist: 13.4, fov: 30, shift: [0, -0.35]},
    {at: 0.31, target: [0.01, 4.9, 0.57], az: 5, el: 12, dist: 12.6, fov: 30, shift: [0, -0.35]},
    {at: 0.45, target: [-0.11, 2.64, 1.08], az: -38, el: 14, dist: 27.1, fov: 32, shift: [0, -0.35]},
    {at: 0.62, target: [-0.74, 2.34, 1.12], az: -42, el: 16, dist: 21.4, fov: 32, shift: [0, -0.35]},
    {at: 0.76, target: [-1.35, 3.05, 0.95], az: -24, el: 24, dist: 24.95, fov: 30, shift: [0, -0.35]},
    {at: 0.82, target: [-1.2, 2.9, 0.95], az: -20, el: 27, dist: 29, fov: 30, shift: [0, -0.4]},
    {at: 0.88, target: [-1.39, 3.18, 0.93], az: -14, el: 30, dist: 22.55, fov: 30, shift: [0, -0.29]},
    {at: 1, target: [-0.61, 3.14, 1.01], az: -10, el: 28, dist: 28.65, fov: 30, shift: [0, -0.29]},
  ],
};

const DEG = Math.PI / 180;
function eyeFrom(k) {
  const az = k.az * DEG, el = k.el * DEG;
  return [
    k.target[0] + k.dist * Math.cos(el) * Math.sin(az),
    k.target[1] + k.dist * Math.sin(el),
    k.target[2] + k.dist * Math.cos(el) * Math.cos(az),
  ];
}

// Monotone cubic (Fritsch–Carlson) through the keys: the camera keeps moving through each key
// instead of easing to a stop there, and never overshoots (which the overlap guard relies on).
const FIELDS = k => [...k.target, k.az, k.el, k.dist, k.fov, ...k.shift];
const SPLINES = {};
function spline(layout) {
  if (SPLINES[layout]) return SPLINES[layout];
  const keys = CAM[layout] || CAM.wide;
  const xs = keys.map(k => k.at), ys = keys.map(FIELDS), n = keys.length, m = ys[0].length;
  const tangents = [];
  for (let c = 0; c < m; c++) {
    const d = [], t = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1][c] - ys[i][c]) / (xs[i + 1] - xs[i]));
    t[0] = d[0]; t[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const al = t[i] / d[i], be = t[i + 1] / d[i], h = Math.hypot(al, be);
      if (h > 3) { t[i] = (3 * al / h) * d[i]; t[i + 1] = (3 * be / h) * d[i]; }
    }
    tangents.push(t);
  }
  return (SPLINES[layout] = {xs, ys, tangents, n, m});
}

function cameraAt(u, layout) {
  const {xs, ys, tangents, n, m} = spline(layout);
  const x = clamp(u, xs[0], xs[n - 1]);
  let i = 0;
  while (i < n - 2 && x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
  const v = [];
  for (let c = 0; c < m; c++) v.push(h00 * ys[i][c] + h10 * h * tangents[c][i] + h01 * ys[i + 1][c] + h11 * h * tangents[c][i + 1]);
  const k = {target: [v[0], v[1], v[2]], az: v[3], el: v[4], dist: v[5], fov: v[6], shift: [v[7], v[8]]};
  return {pos: eyeFrom(k), target: k.target, fov: k.fov, shift: k.shift};
}

/**
 * Scroll pacing (v1.3). Scroll position s (0…1 of the pinned chapter) is warped onto the
 * story clock so the hands-on moments — peeling the seal, turning the cap, the pour —
 * get most of the finger travel, instead of flashing past in one wheel notch.
 *   [scroll share, story clock]
 */
const PACE = [
  [0.00, 0.00],
  [0.07, 0.15], // approach: quick
  [0.25, 0.26], // seal peels over ~18% of the scroll
  [0.38, 0.345], // cap unscrews and lifts
  [0.47, 0.47], // lift and tip toward the bowl
  [0.60, 0.53], // the first ribbon reaches the bowl
  [0.80, 0.75], // bowl fills
  [0.91, 0.90], // bottle back upright, food arrives
  [1.00, 1.00],
];
export function storyClock(sRaw) {
  if (sRaw <= 0) return sRaw; // hero range stays linear
  const s = clamp(sRaw);
  for (let i = 0; i < PACE.length - 1; i++) {
    const [s0, v0] = PACE[i], [s1, v1] = PACE[i + 1];
    if (s <= s1) return v0 + (v1 - v0) * ((s - s0) / (s1 - s0));
  }
  return 1;
}

/** Beat for a scroll position (warped like the scene). */
export function beatAt(sRaw) {
  const u = storyClock(sRaw);
  if (u < 0) return 'hero';
  for (const b of BEATS) if (u < b.to) return b.id;
  return 'rest';
}

/** Rotate a local point (x, y) about Z by angle a. */
const rotZ = ([x, y, z], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];

/**
 * Active bottle transform: returns pivot world position and Z rotation.
 * The mouth follows a path that lifts first, then tips, so glass never
 * crosses the bowl rim or the slab.
 */
function activeBottle(u) {
  const home = LAYOUT.bottles['HC-HY'];
  const pivotHome = [home[0], home[1] + BOTTLE.pivotY, home[2]];
  const up = easeSauce(range(u, T.raise));
  const tip = easeSauce(range(u, T.tilt));
  const back = easeSauce(range(u, T.untilt));
  const amount = tip * (1 - back);
  const angle = LAYOUT.tiltAngle * amount;
  // Pivot needed to place the mouth at pourMouth when fully tipped.
  const mouthLocal = [0, BOTTLE.mouthY - BOTTLE.pivotY, 0];
  const r = rotZ(mouthLocal, LAYOUT.tiltAngle);
  const pivotPour = [LAYOUT.pourMouth[0] - r[0], LAYOUT.pourMouth[1] - r[1], LAYOUT.pourMouth[2]];
  const lifted = [pivotHome[0], pivotHome[1] + 0.55, pivotHome[2] + 0.2];
  const moveOut = Math.max(0, up - back) ; // lift, then return
  let pivot = lerp3(pivotHome, lifted, moveOut);
  pivot = lerp3(pivot, pivotPour, amount);
  return {pivot, angle, amount};
}

/** Keep the complete serving gesture inside its copy-free viewport region. The bounds
 * include the bottle heel, bowl and resting cap; checking text overlap alone missed
 * the bottle leaving the right edge on portrait phones and small desktops. */
function framePourCamera(camera, bottle, bowl, u, layout, aspect) {
  const weight = smoother(range(u, [0.37, 0.455]));
  if (weight <= 0) return camera;
  const points = [];
  for (const y of [0.02, 0.2, 1.5, 3, 4.1, 4.5, 5.2, 5.955]) {
    const radius = y > 5.64 ? 0.555 : bodyRadius(y);
    for (let j = 0; j < 16; j++) {
      const a = j / 16 * Math.PI * 2;
      points.push(add3(bottle.pivot, rotZ([radius * Math.cos(a), y - BOTTLE.pivotY, radius * Math.sin(a)], bottle.angle)));
    }
  }
  for (const center of [bowl, LAYOUT.capRest]) {
    const radius = center === bowl ? BOWL.radius : BOTTLE.capRadius;
    const height = center === bowl ? BOWL.depth : BOTTLE.capTop - BOTTLE.capBottom;
    for (let j = 0; j < 16; j++) for (const y of [0, height]) {
      const a = j / 16 * Math.PI * 2;
      points.push([center[0] + radius * Math.cos(a), center[1] + y, center[2] + radius * Math.sin(a)]);
    }
  }
  const unit = v => { const length = Math.hypot(...v); return v.map(n => n / length); };
  const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
  const f = unit(camera.target.map((v, i) => v - camera.pos[i]));
  const right = unit([-f[2], 0, f[0]]);
  const up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const rect = layout === 'tall' ? [0.045, 0.955, 0.34, 0.885] : [0.415, 0.965, 0.16, 0.89];
  const center = [(rect[0] + rect[1]) / 2, (rect[2] + rect[3]) / 2];
  const target = camera.target.slice();
  let distance = Math.hypot(...camera.pos.map((v, i) => v - target[i]));
  const tangent = Math.tan(camera.fov * DEG / 2);
  for (let iteration = 0; iteration < 6; iteration++) {
    const pos = target.map((v, i) => v - f[i] * distance);
    const bound = [Infinity, -Infinity, Infinity, -Infinity];
    for (const p of points) {
      const delta = p.map((v, i) => v - pos[i]), depth = dot(delta, f);
      const x = (1 + dot(delta, right) / (depth * tangent * aspect) + camera.shift[0]) / 2;
      const y = (1 - dot(delta, up) / (depth * tangent) - camera.shift[1]) / 2;
      bound[0] = Math.min(bound[0], x); bound[1] = Math.max(bound[1], x);
      bound[2] = Math.min(bound[2], y); bound[3] = Math.max(bound[3], y);
    }
    const dx = ((bound[0] + bound[1]) / 2 - center[0]) * 2 * distance * tangent * aspect;
    const dy = (center[1] - (bound[2] + bound[3]) / 2) * 2 * distance * tangent;
    for (let i = 0; i < 3; i++) target[i] += right[i] * dx + up[i] * dy;
    const scale = Math.max(1, (bound[1] - bound[0]) / (rect[1] - rect[0]), (bound[3] - bound[2]) / (rect[3] - rect[2]));
    distance *= scale; // continuous at the fit boundary; no threshold-based zoom step
  }
  return {...camera, target: lerp3(camera.target, target, weight), pos: lerp3(camera.pos, target.map((v, i) => v - f[i] * distance), weight)};
}

function capState(u) {
  const twist = easeSauce(range(u, T.twist));
  const lift = easeSauce(range(u, T.capLift));
  return {
    // ~1¼ turns counter-clockwise seen from above (unscrewing)
    twist: twist * Math.PI * 2.5,
    rise: twist * 0.1 + lift * 0.9,
    aside: lift,
  };
}

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** DOM food-card opacity for a scroll position. */
export const payoffAt = sRaw => smooth(range(storyClock(sRaw), T.payoff));

export function pose(sRaw, layout = 'wide', aspect = layout === 'tall' ? 0.45 : 1.33) {
  const u = storyClock(clamp(sRaw, -1, 1));
  const camera = cameraAt(u, layout);
  const exit = smoother(range(u, T.othersExit));
  const bottle = activeBottle(u);
  const cap = capState(u);
  const peel = smoother(range(u, T.peel));
  const bowlIn = easeOut(range(u, T.bowlIn));
  const bowlPosition = lerp3(LAYOUT.bowlFrom, LAYOUT.bowl, bowlIn);
  const head = easeIn(range(u, T.streamHead));
  const tail = easeIn(range(u, T.streamTail));
  const sauce = sauceState(u, head, tail);
  const payoff = smooth(range(u, T.payoff));
  const mouth = add3(bottle.pivot, rotZ([0, BOTTLE.mouthY - BOTTLE.pivotY, 0], bottle.angle));
  const axis = rotZ([0, 1, 0], bottle.angle);

  const mc = LAYOUT.bottles['HC-MC'], ck = LAYOUT.bottles['HC-CK'];
  return {
    u,
    beat: beatAt(sRaw),
    camera: framePourCamera(camera, bottle, bowlPosition, u, layout, aspect),
    others: {
      // Both supporting bottles leave to the right and back, away from the HTML copy (review V01):
      // Mahachai passes behind Hat Yai instead of sweeping across the headline.
      'HC-MC': {pos: [mc[0] + exit * 11, mc[1], mc[2] - exit * 3.2], visible: exit < 0.999},
      'HC-CK': {pos: [ck[0] + exit * 8.5, ck[1], ck[2] - exit * 1.8], visible: exit < 0.999},
    },
    active: {id: 'HC-HY', pivot: bottle.pivot, angle: bottle.angle, tilt: bottle.amount},
    seal: {peel, drop: smooth(range(u, T.sealDrop))},
    cap,
    fill: {
      level: bottle.pivot[1] - BOTTLE.pivotY * Math.cos(bottle.angle) + bottleLevelForVolume(bottle.angle, sauce.remaining),
      volume: sauce.remaining,
    },
    bowl: {pos: bowlPosition, visible: bowlIn > 0.001},
    stream: {
      on: head > 0 && tail < 1 && bottle.amount > 0.6,
      head,
      tail,
      mouth,
      axis,
      volume: sauce.inFlight,
    },
    pool: {level: sauce.bowl / SAUCE.servingVolume, volume: sauce.bowl, height: bowlLevelForVolume(sauce.bowl)},
    payoff,
    // Ambient pointer tilt fades out as the story takes over the bottle.
    pointerWeight: 1 - smooth(clamp((u + 1) / 0.7)),
  };
}

/** Continuous scalar used by tests: the cap may only turn after the seal is fully clear. */
export function invariants(p) {
  const problems = [];
  if (p.cap.twist > 1e-6 && p.seal.peel < 1 - 1e-6) problems.push('cap turns through intact seal');
  if (p.stream.on && p.active.tilt < 0.6) problems.push('stream without tilt');
  if (p.pool.level > 1e-9 && p.stream.head < 1) problems.push('pool fills before stream arrives');
  if (Math.abs(p.fill.volume + p.stream.volume + p.pool.volume - SAUCE.initialVolume) > 1e-8) problems.push('sauce volume changes');
  return problems;
}
