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
  pool: [0.48, 0.735],
  streamTail: [0.705, 0.75],
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
  fillAfter: 4.75, // level after one bowl has been poured
};
export const BOWL = {radius: 1.28, depth: 0.78, innerBottom: 0.16};

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
    {at: 0.88, target: [-2.52, 0.37, 1.08], az: 12, el: 32, dist: 13.2, fov: 26, shift: [0.14, -0.08]},
    {at: 1, target: [-1.62, 0.89, 1.15], az: 10, el: 29, dist: 22, fov: 26, shift: [0.14, -0.08]},
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

function cameraAt(u, layout) {
  const keys = CAM[layout] || CAM.wide;
  let k = keys[keys.length - 1];
  if (u <= keys[0].at) k = keys[0];
  else {
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (u <= b.at) {
        // orbit in spherical space so moves arc around the subject instead of cutting through it
        const t = smoother((u - a.at) / (b.at - a.at));
        k = {
          target: lerp3(a.target, b.target, t),
          az: lerp(a.az, b.az, t), el: lerp(a.el, b.el, t), dist: lerp(a.dist, b.dist, t),
          fov: lerp(a.fov, b.fov, t), shift: [lerp(a.shift[0], b.shift[0], t), lerp(a.shift[1], b.shift[1], t)],
        };
        break;
      }
    }
  }
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

/** Horizontal sauce level inside the active bottle, in world units. */
function fillLevel(u, bottle) {
  const uprightLevel = lerp(BOTTLE.fillUpright, BOTTLE.fillAfter, smooth(range(u, T.pool)));
  // World height of that level while the bottle stands upright at its current pivot.
  const upright = bottle.pivot[1] - BOTTLE.pivotY + uprightLevel;
  // Tipped past horizontal, the sauce collects in the neck: level sits just above the mouth.
  const mouth = add3(bottle.pivot, rotZ([0, BOTTLE.mouthY - BOTTLE.pivotY, 0], bottle.angle));
  const pouring = smooth(clamp((Math.abs(bottle.angle) - 1.2) / 0.55));
  return lerp(upright, mouth[1] + 0.18, pouring);
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** DOM food-card opacity for a scroll position. */
export const payoffAt = sRaw => smooth(range(storyClock(sRaw), T.payoff));

export function pose(sRaw, layout = 'wide') {
  const u = storyClock(clamp(sRaw, -1, 1));
  const camera = cameraAt(u, layout);
  const exit = smoother(range(u, T.othersExit));
  const bottle = activeBottle(u);
  const cap = capState(u);
  const peel = smoother(range(u, T.peel));
  const bowlIn = easeOut(range(u, T.bowlIn));
  const head = easeIn(range(u, T.streamHead));
  const tail = easeIn(range(u, T.streamTail));
  const pool = smooth(range(u, T.pool));
  const payoff = smooth(range(u, T.payoff));
  const mouth = add3(bottle.pivot, rotZ([0, BOTTLE.mouthY - BOTTLE.pivotY, 0], bottle.angle));
  const axis = rotZ([0, 1, 0], bottle.angle);

  const mc = LAYOUT.bottles['HC-MC'], ck = LAYOUT.bottles['HC-CK'];
  return {
    u,
    beat: beatAt(sRaw),
    camera,
    others: {
      // Both supporting bottles leave to the right and back, away from the HTML copy (review V01):
      // Mahachai passes behind Hat Yai instead of sweeping across the headline.
      'HC-MC': {pos: [mc[0] + exit * 11, mc[1], mc[2] - exit * 3.2], visible: exit < 0.999},
      'HC-CK': {pos: [ck[0] + exit * 8.5, ck[1], ck[2] - exit * 1.8], visible: exit < 0.999},
    },
    active: {id: 'HC-HY', pivot: bottle.pivot, angle: bottle.angle, tilt: bottle.amount},
    seal: {peel, drop: smooth(range(u, T.sealDrop))},
    cap,
    fill: {level: fillLevel(u, bottle)},
    bowl: {pos: lerp3(LAYOUT.bowlFrom, LAYOUT.bowl, bowlIn), visible: bowlIn > 0.001},
    stream: {
      on: head > 0 && tail < 1 && bottle.amount > 0.6,
      head,
      tail,
      mouth,
      axis,
    },
    pool: {level: pool},
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
  if (p.pool.level > 0 && p.u < T.streamHead[0]) problems.push('pool fills before pour');
  return problems;
}
