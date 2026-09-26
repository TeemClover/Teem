/** Homechew scroll story: pure-function checks (no browser). node --test tests/homechew/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import {pose, invariants, BOTTLE, LAYOUT, BOWL} from '../../homechew/js/scene/timeline.js';
import {readFileSync} from 'node:fs';

const steps = (a, b, n) => Array.from({length: n + 1}, (_, i) => a + ((b - a) * i) / n);

test('story invariants hold at every scroll position', () => {
  for (const u of steps(-1, 1, 800)) {
    for (const layout of ['wide', 'tall']) assert.deepEqual(invariants(pose(u, layout)), [], `u=${u.toFixed(4)} ${layout}`);
  }
});

test('pose is a pure function of scroll (rewind lands on the same frame)', () => {
  const at = JSON.stringify(pose(0.6));
  for (const u of [0.95, -1, 0.2, 0.61, 1]) pose(u);
  assert.equal(JSON.stringify(pose(0.6)), at);
});

test('sequence order: seal clear → cap turns → tilt → pour → pool fills', () => {
  const first = (pred) => steps(-1, 1, 2000).find(u => pred(pose(u)));
  const sealDone = first(p => p.seal.peel >= 1);
  const capTurns = first(p => p.cap.twist > 0);
  const tilting = first(p => p.active.tilt > 0);
  const streaming = first(p => p.stream.on);
  const pooling = first(p => p.pool.level > 0);
  assert.ok(sealDone <= capTurns && capTurns < tilting && tilting < streaming && streaming <= pooling,
    JSON.stringify({sealDone, capTurns, tilting, streaming, pooling}));
});

test('pool level never drops and ends full', () => {
  let last = 0;
  for (const u of steps(-1, 1, 1000)) {
    const l = pose(u).pool.level;
    assert.ok(l >= last - 1e-9, `pool dropped at ${u}`);
    last = l;
  }
  assert.equal(pose(1).pool.level, 1);
});

/* ---------- overlap guard (review V01): nothing 3D enters the text zone ---------- */
const deg = Math.PI / 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
const rotZ = ([x, y, z], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];

function project(p, cam, aspect) {
  const f = norm(sub(cam.target, cam.pos)), r = norm(cross(f, [0, 1, 0])), up = cross(r, f);
  const d = sub(p, cam.pos), z = dot(d, f), t = Math.tan(cam.fov * deg / 2);
  // screen fraction: x 0 = left edge, y 0 = top edge
  const nx = dot(d, r) / (z * t * aspect) + cam.shift[0], ny = dot(d, up) / (z * t) + cam.shift[1];
  return [(nx + 1) / 2, (1 - ny) / 2];
}

function scenePoints(p) {
  const pts = [];
  const bottle = (pivot, angle) => {
    for (const y of [0, 1.5, 3, 4.5, 5.2, BOTTLE.capTop]) for (const [x, z] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
      const r = y > 5.2 ? 0.64 : 1;
      const w = rotZ([x * r, y - BOTTLE.pivotY, z * r], angle);
      pts.push([w[0] + pivot[0], w[1] + pivot[1], w[2] + pivot[2]]);
    }
  };
  bottle(p.active.pivot, p.active.angle);
  for (const o of Object.values(p.others)) if (o.visible) bottle([o.pos[0], o.pos[1] + BOTTLE.pivotY, o.pos[2]], 0);
  if (p.bowl.visible) for (const [x, z] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) for (const y of [0, BOWL.depth]) pts.push([p.bowl.pos[0] + x * BOWL.radius, y, p.bowl.pos[2] + z * BOWL.radius]);
  return pts;
}

// Text zones as screen fractions. Wide: the copy column. Tall: the copy block above the scene.
const ZONES = {
  wide: {aspects: [1.33, 1.6, 1.78], inText: ([x, y], u) => x < (u < 0 ? 0.40 : 0.37) && y > 0.08 && y < (u >= 0.88 ? 0.95 : 0.84)},
  tall: {aspects: [0.45, 0.46, 0.56], inText: ([x, y], u) => y < (u < 0 ? 0.44 : 0.3) && y > 0.05 && x > 0.02 && x < 0.98},
};

for (const [layout, zone] of Object.entries(ZONES)) {
  test(`no bottle, cap or bowl crosses the ${layout} text zone at any scroll position`, () => {
    const hits = [];
    for (const aspect of zone.aspects) for (const u of steps(-1, 1, 400)) {
      const p = pose(u, layout);
      for (const pt of scenePoints(p)) {
        const s = project(pt, p.camera, aspect);
        if (s[0] < -0.2 || s[0] > 1.2 || s[1] < -0.2 || s[1] > 1.2) continue; // off-screen
        if (zone.inText(s, u)) { hits.push(`${aspect} u=${u.toFixed(3)} (${s.map(v => v.toFixed(2))})`); break; }
      }
    }
    assert.equal(hits.length, 0, hits.slice(0, 12).join('\n'));
  });
}

test('HTML: unknown product facts are shown as pending, never as numbers or free', () => {
  const html = readFileSync(new URL('../../homechew/index.html', import.meta.url), 'utf8');
  const data = JSON.parse(readFileSync(new URL('../../homechew/data/products.json', import.meta.url), 'utf8'));
  assert.equal(data.commerce_enabled, false);
  for (const p of data.products) assert.equal(p.price_thb, null);
  for (const field of ['net_quantity', 'price_thb', 'storage', 'shipping_regions']) {
    assert.match(html, new RegExp(`data-field="${field}">รอยืนยัน<`), field);
  }
  assert.doesNotMatch(html, /฿|บาท|ฟรี|JAPANESE STANDARDS|240 ?mL/i);
});

test('HTML: LINE order CTA points to the owner-provided link only', () => {
  const html = readFileSync(new URL('../../homechew/index.html', import.meta.url), 'utf8');
  const lines = [...html.matchAll(/href="(https:\/\/lin\.ee\/[^"]+)"/g)].map(m => m[1]);
  assert.ok(lines.length >= 4, 'LINE CTA in header, hero, set, close (+ mobile bar)');
  assert.ok(lines.every(h => h === 'https://lin.ee/owu0J0g'));
  for (const m of html.matchAll(/<a [^>]*href="https:\/\/lin\.ee[^>]*>/g)) assert.match(m[0], /rel="noopener"/);
});
