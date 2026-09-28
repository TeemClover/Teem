/**
 * Mediral — the score: what each chapter shows, and when every layer moves.
 *
 * Chapters are moments in one viewport, not boxes. Each chapter's markup comes from routine.json;
 * each layer rests at its CSS home (the composed reading pose for tall or wide screens) and the
 * tracks below move it in and out around that pose. Rules the timings keep:
 *   - every chapter opens on its reader's problem, held whole, before its first benefit;
 *   - something changes, then the eye gets a hold before the next piece of information;
 *   - a word may be crossed by an object only while moving; every Thai phrase is whole in its hold;
 *   - packs move by transform only, and fade only while they fully leave;
 *   - objects carry chapters across: the CL bottle and foam (hero → CL), the water ring (CL → AC),
 *     a flight into the drop beside the AC bottle (AC → BR, a new world, not its formula), a light
 *     streak (BR → SU), air turning to powder (SU → PO), and the five packs regrouping (PO → set).
 */
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const lines = list => list.map(line => `<span class="mr-line">${esc(line)}</span>`).join('');
const pad = n => String(n).padStart(2, '0');

/* ---------- markup ---------- */
function cropStyle(step) {
  const b = step.image_bounds;
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  return `--pack-aspect:${b.aspect};--pack-img-width:${100 / w}%;--pack-img-height:${100 / h}%;--pack-img-left:${-100 * b.x0 / w}%;--pack-img-top:${-100 * b.y0 / h}%`;
}
// A decorative pack repeats one already announced elsewhere; it is hidden from assistive technology.
function packMarkup(step, asset, {layer, src = 'src', decorative = false} = {}) {
  return `<figure class="mr-actor mr-actor--${step.id.toLowerCase()}" data-layer="${layer}"${decorative ? ' aria-hidden="true"' : ''}><span class="mr-pack" style="${cropStyle(step)}"><img ${src}="${asset(step.image)}" alt="${decorative ? '' : esc(step.image_alt)}" decoding="async"></span></figure>`;
}
const art = (layer, file, cls, asset) => `<div class="mr-art ${cls}" data-layer="${layer}" aria-hidden="true"><img data-src="${asset(file)}" alt="" decoding="async"></div>`;
const slot = (layer, cls, style = '') => `<span class="mr-slot ${cls}" data-layer="${layer}" aria-hidden="true"${style ? ` style="${style}"` : ''}></span>`;
const problem = (step, key) => `<p class="mr-problem" data-layer="${key}.problem">${esc(step.scene.problem)}</p>`;
const foot = (step, key) => `<div class="mr-foot" data-layer="${key}.foot"><p class="mr-tag-line"><b>${pad(step.order)}</b>${esc(step.nick)}${step.size ? ` · ${esc(step.size)}` : ''}</p><p class="mr-support">${esc(step.scene.support)}</p></div>`;
const title = (step, key, cls = '') => `<h2 class="mr-title ${cls}" id="h-${step.id}" data-layer="${key}.title">${lines(step.scene.headline)}</h2>`;
// A wave may name a word boundary (split) where an object stands between two whole Thai words.
function wave(step, index, layer, cls = '') {
  const w = step.scene.waves[index];
  const word = w.split
    ? `<span class="mr-wave__word mr-wave__word--split"><span>${esc(w.label.slice(0, w.split))}</span> <span>${esc(w.label.slice(w.split))}</span></span>`
    : `<span class="mr-wave__word">${esc(w.label)}</span>`;
  return `<p class="mr-wave ${cls}" data-layer="${layer}">${word}${w.show.length ? `<span class="mr-wave__names">${w.show.map(esc).join(' · ')}</span>` : ''}</p>`;
}
const imageOf = (step, name) => [...(step.featured || []), ...(step.ingredients || [])].find(item => item.name === name)?.image;

export const SHOTS = {
  CL: (step, asset) => `
    <div role="region" class="mr-shot mr-shot--cl" data-shot="CL" data-layer="cl" aria-labelledby="h-CL">
      <div class="mr-shot__bg" data-layer="cl.bg" aria-hidden="true"></div>
      ${problem(step, 'cl')}
      <h2 class="mr-cl__title" id="h-CL"><span class="mr-line mr-cl__word" data-layer="cl.word1">${esc(step.scene.headline[0])}</span><span class="mr-line mr-cl__word mr-cl__word--next" data-layer="cl.word2">${esc(step.scene.headline[1])}</span></h2>
      ${packMarkup(step, asset, {layer: 'cl.pack'})}
      <div class="mr-bubbles" data-layer="cl.bubbles" aria-hidden="true">${Array.from({length: 9}, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      ${foot(step, 'cl')}
    </div>`,
  AC: (step, asset) => `
    <div role="region" class="mr-shot mr-shot--ac mr-shot--dark" data-shot="AC" data-layer="ac" aria-labelledby="h-AC">
      <div class="mr-shot__cam" data-layer="ac.cam">
        <div class="mr-shot__bg" data-layer="ac.bg" aria-hidden="true"></div>
        <div class="mr-art mr-ac__film" data-layer="ac.film" aria-hidden="true">
          <div class="mr-fx__clip" id="lab-film" data-lab-film data-film-ready="true"><div class="mr-fx__clipframe" data-film-frame>
            <img data-src="${asset('assets/motion/lab-film-poster.webp')}" alt="" decoding="async">
            <video data-film-video data-src="${asset('assets/motion/lab-film-10s.mp4')}" poster="${asset('assets/motion/lab-film-poster.webp')}" muted playsinline preload="none" aria-hidden="true" tabindex="-1" hidden></video>
          </div></div>
        </div>
        ${art('ac.mangosteen', 'assets/botanicals/mangosteen-peel.webp', 'mr-ac__mangosteen', asset)}
        ${problem(step, 'ac')}
        ${title(step, 'ac', 'mr-ac__title')}
        ${wave(step, 0, 'ac.w1')}
        ${art('ac.witch', 'assets/botanicals/witch-hazel-flower.webp', 'mr-ac__witch', asset)}
        ${art('ac.grape', 'assets/botanicals/grapefruit-section.webp', 'mr-ac__grape', asset)}
        ${wave(step, 1, 'ac.w2')}
        ${art('ac.cone', 'assets/experience/m2-glass-cone.webp', 'mr-ac__cone', asset)}
        ${art('ac.amber', 'assets/experience/p0-2-drop-amber.webp', 'mr-ac__amber', asset)}
        ${art('ac.gel', 'assets/experience/p0-2-drop-clear.webp', 'mr-ac__gel', asset)}
        ${wave(step, 2, 'ac.w3')}
        ${slot('slot.ac-rise', 'mr-slot--ac-rise', `--pack-aspect:${step.image_bounds.aspect}`)}
        ${slot('slot.stem', 'mr-slot--stem')}
        ${packMarkup(step, asset, {layer: 'ac.pack', src: 'data-src'})}
        ${art('ac.lens', 'assets/experience/p0-2-drop-amber.webp', 'mr-ac__lens', asset)}
        ${foot(step, 'ac')}
        ${art('ac.tea', 'assets/experience/m2-teatree-foreground.webp', 'mr-ac__tea', asset)}
      </div>
    </div>`,
  // Light through the drop: three names come into focus on three depths, then balance and smoothness.
  BR: (step, asset) => {
    const [bear, licorice] = ['สารสกัดแบร์เบอร์รี่', 'สารสกัดชะเอมเทศ'].map(name => imageOf(step, name));
    const [even, balance, smooth] = step.scene.waves;
    const plane = (key, file, name, cls) => `<figure class="mr-plane ${cls}" data-layer="br.${key}" aria-hidden="true">${file ? `<img data-src="${asset(file)}" alt="" decoding="async">` : ''}<figcaption>${esc(name)}</figcaption></figure>`;
    return `
    <div role="region" class="mr-shot mr-shot--br" data-shot="BR" data-layer="br" aria-labelledby="h-BR">
      <div class="mr-shot__cam" data-layer="br.cam">
        <div class="mr-shot__bg" data-layer="br.bg" aria-hidden="true"></div>
        <div class="mr-br__beams" data-layer="br.beams" aria-hidden="true"><i></i><i></i><i></i></div>
        ${problem(step, 'br')}
        ${title(step, 'br', 'mr-br__title')}
        ${packMarkup(step, asset, {layer: 'br.pack', src: 'data-src'})}
        ${plane('vitc', 'assets/experience/p0-2-drop-clear.webp', even.show[2], 'mr-plane--far')}
        ${plane('lic', licorice, even.show[1], 'mr-plane--mid')}
        ${plane('bear', bear, even.show[0], 'mr-plane--near')}
        <p class="mr-wave" data-layer="br.w1"><span class="mr-wave__word">${esc(even.label)}</span><span class="mr-sr">${even.show.map(esc).join(' · ')}</span></p>
        <div class="mr-pairs" data-layer="br.w2">
          <p><span class="mr-wave__word">${esc(balance.label)}</span><span class="mr-wave__names">${balance.show.map(esc).join(' · ')}</span></p>
          <p><span class="mr-wave__word">${esc(smooth.label)}</span><span class="mr-wave__names">${smooth.show.map(esc).join(' · ')}</span></p>
        </div>
        ${foot(step, 'br')}
      </div>
    </div>`;
  },
  // Weightless: everything travels sideways; the tube floats with a thin serum ribbon.
  SU: (step, asset) => `
    <div role="region" class="mr-shot mr-shot--su" data-shot="SU" data-layer="su" aria-labelledby="h-SU">
      <div class="mr-shot__bg" data-layer="su.bg" aria-hidden="true"></div>
      ${art('su.air', 'assets/experience/p0-2-drop-clear.webp', 'mr-su__air', asset)}
      ${problem(step, 'su')}
      ${title(step, 'su', 'mr-su__title')}
      ${art('su.ribbonBack', 'assets/experience/m2-serum-ribbon.webp', 'mr-su__ribbon mr-su__ribbon--back', asset)}
      ${packMarkup(step, asset, {layer: 'su.pack', src: 'data-src'})}
      ${wave(step, 0, 'su.w1', 'mr-wave--band')}
      ${wave(step, 1, 'su.w2', 'mr-wave--band')}
      ${wave(step, 2, 'su.w3', 'mr-wave--band')}
      ${art('su.ribbon', 'assets/experience/m2-serum-ribbon.webp', 'mr-su__ribbon', asset)}
      ${foot(step, 'su')}
    </div>`,
  // Quiet finish: the powder settles, the headline's outline becomes solid, the compact lands.
  PO: (step, asset) => `
    <div role="region" class="mr-shot mr-shot--po mr-shot--dark" data-shot="PO" data-layer="po" aria-labelledby="h-PO">
      <div class="mr-shot__bg" data-layer="po.bg" aria-hidden="true"></div>
      ${art('po.band', 'assets/experience/m2-powder-veil.webp', 'mr-po__band', asset)}
      ${problem(step, 'po')}
      ${title(step, 'po', 'mr-po__title')}
      ${packMarkup(step, asset, {layer: 'po.pack', src: 'data-src'})}
      ${wave(step, 0, 'po.w1')}
      ${wave(step, 1, 'po.w2')}
      ${foot(step, 'po')}
    </div>`,
};

// The five come back together on the ledge where they began, and the story hands over to the set.
export function closingShot(steps, set, asset) {
  return `
    <div class="mr-shot mr-shot--rg" data-shot="set-close" data-layer="rg">
      <div class="mr-shot__bg mr-hero__bg" data-layer="rg.bg" aria-hidden="true"></div>
      <p class="mr-rg__title" id="closing-title" data-layer="rg.title" aria-hidden="true">${esc(set.closing.headline)}</p>
      ${steps.map(step => packMarkup(step, asset, {layer: `rg.${step.id}`, src: 'data-src', decorative: true})).join('')}
      <div class="mr-rg__foot" data-layer="rg.foot" data-inert-hidden>
        <p class="mr-rg__carry" aria-hidden="true">${esc(set.carry)}</p>
        <a class="mr-btn" href="#set">${esc(set.closing.cta)} <span aria-hidden="true">↓</span></a>
      </div>
    </div>`;
}

/* ---------- timeline ---------- */
// Chapter T values mark each chapter's first composed hold, so a rail or anchor lands on a still frame.
export const CHAPTERS = [
  {id: 'routine', from: 0},
  {id: 'CL', from: 1.3},
  {id: 'AC', from: 3.66},
  {id: 'BR', from: 6.86},
  {id: 'SU', from: 9.3},
  {id: 'PO', from: 11.64},
  // Not a product chapter: the reassembled set. It only colours the header; the rail keeps PO.
  {id: 'close', from: 13.9},
];
export const END = 14.3;

// A chapter's problem is read large where its words will be, then settles into its kicker and later leaves.
const kicker = (frames, leaveAt) => [...frames, [leaveAt, {}], [leaveAt + 0.08, {dy: -3, o: 0}]];
// Fade in from below, hold, and (optionally) fade out upwards.
const beat = (inAt, outAt, from = {dy: 3}, to = {dy: -3}) => {
  const frames = [[inAt, {...from, o: 0}], [inAt + 0.1, {}]];
  if (outAt != null) frames.push([outAt, {}], [outAt + 0.09, {...to, o: 0}]);
  return frames;
};

export function score({tall, W, H}) {
  const tracks = {};
  const set = (name, frames) => { tracks[name] = frames; };

  /* Hero → routine → CL (T 0 → 1.3) ------------------------------------------------------------ */
  // First scroll: the ensemble opens into one routine row; the promise lifts away.
  set('hero.kicker', [[0, {}], [0.08, {}], [0.3, {dy: -6, o: 0}]]);
  set('hero.promise', [[0, {}], [0.06, {}], [0.36, {dy: -9, s: 0.92, o: 0}]]);
  set('hero.cta', [[0, {}], [0.04, {}], [0.16, {dy: 3, o: 0}]]);
  set('hero.bg', [[0, {}], [0.45, {s: 1.06, dy: -2}], [1.3, {s: 1.12, dy: -4}]]);
  for (const id of ['CL', 'AC', 'BR', 'SU', 'PO']) {
    const row = {match: `row.${id}`};
    if (id === 'CL') set(`hero.${id}`, [[0.06, {}], [0.46, row], [0.78, row], [0.95, {match: 'cl.pack'}, 'in'], [1.28, {match: 'cl.pack'}], [1.29, {match: 'cl.pack', o: 0}, 'step']]);
    else set(`hero.${id}`, [[0.06, {}], [0.46, row], [0.78, row], [0.95, {...row, s: 0.9, dy: -2}], [1.28, {...row, s: 0.9, dy: -2}], [1.29, {...row, o: 0}, 'step']]);
  }
  ['w1', 'w2', 'w3', 'w4'].forEach((w, i) => set(`hero.${w}`, [[0.24 + i * 0.04, {dy: 2.5, o: 0}], [0.44 + i * 0.04, {}], [0.78, {}], [0.88, {dy: -1.5, o: 0}]]));
  set('hero.pick', [[0.3, {dy: 3, o: 0}], [0.5, {}], [0.78, {}], [0.9, {dy: -2, o: 0}]]);
  set('hero', [[0, {}], [1.28, {}], [1.29, {o: 0}, 'step']]);

  // A tilted foam front rises through the frame; below it is the CL scene (clip edge moves with it).
  const tilt = tall ? 5 : 7;
  const foamW = (tall ? 1.7 : 1.3) * W, foamH = foamW * 887 / 1774;
  const band = 0.205 * foamH / H * 100;           // dense foam sits below the image centre
  const rot = -Math.atan2(2 * tilt / 100 * H, W) * 180 / Math.PI;
  // Clipped shots are also transparent until their transition opens them, so they never catch a tap.
  set('cl', [[0.81, {'--edge': 100 + tilt, '--tilt': tilt, o: 0}], [0.82, {'--edge': 100 + tilt, '--tilt': tilt}, 'step'], [1.28, {'--edge': -tilt - 1, '--tilt': tilt}, 'lin'], [3.56, {}], [3.57, {o: 0}, 'step']]);
  const foamY = edge => edge - band;

  /* CL (T 1.3 → 2.9): the problem; the first line; a sideways foam sweep into the second; support. */
  const sweep = {from: 1.92, to: 2.36};
  // The sweep centres the foam's dense band on the first line (same place as the second).
  const sweepS = tall ? 0.72 : 0.62, wordY = tall ? 20 : 25;
  const across = x => ({x, y: wordY - band * sweepS, s: sweepS, r: tall ? -3 : -2});
  set('fx.foam', [
    [0.78, {x: 44, y: foamY(100 + tilt) + 4, r: rot, o: 0}],
    [0.84, {x: 44, y: foamY(100 + tilt), r: rot}],
    [1.28, {x: 56, y: foamY(-tilt - 1), r: rot}, 'lin'],
    [1.44, {x: 60, y: foamY(-tilt - 1) - 14, r: rot, o: 0}, 'out'],
    [sweep.from - 0.01, {...across(150), o: 0}, 'step'],
    [sweep.from, across(150), 'step'],
    [sweep.to, across(-50), 'lin'],
    [sweep.to + 0.01, {...across(-50), o: 0}, 'step'],
  ]);
  const big = {dy: tall ? 9 : 10, s: 1.5};
  set('cl.problem', kicker([[1.0, big], [1.52, big], [1.64, {}]], 2.86));
  // The swap happens only while the foam's dense centre covers the whole word.
  const cover = (sweep.from + sweep.to) / 2;
  set('cl.word1', [[1.56, {dy: 3, o: 0}], [1.68, {}], [cover - 0.02, {}], [cover - 0.019, {o: 0}, 'step']]);
  set('cl.word2', [[cover - 0.02, {o: 0}], [cover - 0.019, {}, 'step'], [2.86, {}], [3.0, {dy: -5, o: 0}]]);
  set('cl.foot', beat(2.36, 2.86, {dy: 2}, {dy: 2}));
  set('cl.bubbles', [[1.1, {o: 0}], [1.4, {}], [2.9, {dy: -6}], [3.2, {dy: -12, o: 0}]]);
  // The bottle stays whole; at the end it recedes up and back, out of the ring's opening.
  set('cl.pack', [[1.28, {}], [2.9, {}], [3.18, {dy: tall ? -25 : -18, dx: tall ? -18 : -24, s: 0.46}], [3.52, {dy: tall ? -32 : -24, dx: tall ? -26 : -32, s: 0.3}]]);
  set('cl.bg', [[1.28, {}], [2.9, {}], [3.5, {s: 1.08}]]);

  /* CL → AC (T 2.9 → 3.56): the ring lies at the bottle's foot, rises to face us, and opens. ---- */
  const ringUp = 3.14, open = 3.52;
  const ringS = [0.2, 0.42, tall ? 2.9 : 2.6];
  set('fx.ring', [
    [2.9, {y: tall ? 84 : 83, s: ringS[0], rx: 74, o: 0}],
    [2.97, {y: tall ? 82 : 81, s: 0.26, rx: 70}],
    [ringUp, {y: 58, s: ringS[1]}, 'out'],
    [open, {y: 58, s: ringS[2]}, 'in'],
    [open + 0.08, {y: 58, s: ringS[2] * 1.12, o: 0}],
  ]);
  // The AC shot is masked to the ring's opening; inside, four depths travel at different rates.
  set('ac', [[ringUp - 0.01, {'--portal': 0, o: 0}], [ringUp, {'--portal': ringS[1]}, 'step'], [open, {'--portal': ringS[2]}, 'in'], [open + 0.01, {'--portal': 9}, 'step'], [6.6, {}], [6.61, {o: 0}, 'step']]);

  /* AC (T 3.56 → 6.2): soothe → balance in glass → hydration → the bottle, the drop as a lens. -- */
  // T3 follows: the camera flies into that drop, and the gold inside opens on another world.
  set('ac.cam', [[ringUp, {s: 1.22}], [open + 0.1, {}, 'out'], [6.22, {}], [6.62, {focus: 'ac.lens', s: 7}, 'in']]);
  set('ac.bg', [[ringUp, {s: 1.1}], [4.5, {}], [6.2, {s: 1.04}]]);
  set('ac.film', [[ringUp, {s: 1.35, dy: 6}], [3.95, {s: 1.08}, 'out'], [4.3, {s: 1.02, dx: -3, o: 0.5}], [5.7, {s: 1, dx: -6, o: 0.32}]]);
  set('ac.mangosteen', [[ringUp, {dx: 16, dy: 6, s: 1.3}], [3.95, {}, 'out'], [4.3, {}], [4.48, {dx: 26, dy: 10, s: 1.2, o: 0}]]);
  set('ac.tea', [[ringUp, {dx: -36, dy: 14, s: 1.6}], [3.85, {dx: -4, dy: 2, s: 1.12}, 'out'], [4.3, {}], [4.48, {dx: -70, dy: 18, s: 1.5}, 'in'], [4.49, {dx: -70, dy: 18, s: 1.5, o: 0}, 'step']]);
  set('ac.problem', kicker([[3.5, {...big, o: 0}], [3.6, big], [3.9, big], [4.0, {}]], 5.6));
  set('ac.w1', beat(3.95, 4.32));
  // The glass descends; the balance words stand either side of its stem, whole, during the hold.
  set('ac.cone', [[4.3, {dy: -60}], [4.58, {}, 'out'], [5.02, {}], [5.3, {dy: -58}, 'in'], [5.31, {dy: -58, o: 0}, 'step']]);
  set('ac.amber', [[4.46, {dy: -40, s: 0.6, o: 0}], [4.52, {dy: -34, s: 0.6}], [4.74, {s: 0.9}, 'in'], [4.8, {dy: 2, s: 0.9, o: 0}]]);
  set('ac.witch', [[4.4, {dx: -18, o: 0}], [4.62, {}, 'out'], [4.98, {}], [5.1, {dx: -10, dy: -6, o: 0}]]);
  set('ac.grape', [[4.44, {dx: 18, o: 0}], [4.66, {}, 'out'], [4.98, {}], [5.1, {dx: 10, dy: -6, o: 0}]]);
  set('ac.w2', beat(4.5, 4.95));
  // Hydration: the bottle rises into a lower stand-in pose; a clear drop floats beside it.
  const rise = {match: 'slot.ac-rise'};
  // Before the camera flies into the drop the bottle steps out of frame: its drawn label is never magnified.
  set('ac.pack', [[5.08, {...rise, dy: 72}], [5.36, rise, 'out'], [5.6, rise], [5.86, {}], [6.2, {}], [6.38, {dy: 70, o: 0}, 'in']]);
  set('ac.gel', [[5.1, {dy: 6, s: 0.6, o: 0}], [5.3, {}], [5.6, {}], [5.74, {dy: -6, s: 0.8, o: 0}]]);
  set('ac.w3', beat(5.16, 5.58));
  // The drop leaves the glass at its stem before the bottle arrives, and comes to rest beside the
  // bottle's foot as a small lens. It never lands on or passes through the closed cap.
  const stem = {match: 'slot.stem'};
  set('ac.lens', [[4.98, {...stem, o: 0}], [5.03, stem], [5.28, {}, 'in'], [6.2, {s: 1.06}]]);
  set('ac.title', beat(5.66, 6.2));
  set('ac.foot', beat(5.78, 6.2, {dy: 2}, {dy: 2}));
  set('fx.gold', [[6.44, {o: 0}], [6.6, {}], [6.62, {}], [6.82, {o: 0}]]);

  /* BR (T 6.6 → 8.85): light through the drop; three names focus on three depths; two pairs. ---- */
  set('br', [[6.59, {o: 0}], [6.6, {}, 'step'], [9.28, {}], [9.29, {o: 0}, 'step']]);
  set('br.cam', [[6.6, {s: 1.16}], [6.95, {}, 'out'], [8.85, {s: 1.03}]]);
  set('br.beams', [[6.6, {dx: -6, o: 0.4}], [7.2, {}], [8.85, {dx: 6}], [9.1, {dx: 30, o: 0}]]);
  set('br.problem', kicker([[6.6, big], [7.02, big], [7.12, {}]], 8.3));
  set('br.w1', beat(7.1, 7.82));
  // Rack focus: near, then mid, then far. Each stays sharp once found, until the three leave together.
  const focusIn = (at, drift) => [[6.6, {...drift, '--focus': 0, o: 0.5}], [at, {...drift, '--focus': 0, o: 0.6}], [at + 0.12, {'--focus': 1}], [7.82, {'--focus': 1}], [7.94, {...drift, '--focus': 0, o: 0}]];
  set('br.bear', focusIn(7.2, {dx: -4, s: 1.12}));
  set('br.lic', focusIn(7.31, {dx: 5, s: 0.92}));
  set('br.vitc', focusIn(7.42, {dy: -3, s: 0.88}));
  set('br.w2', beat(7.92, 8.3));
  set('br.pack', [[6.6, {s: 0.78, dy: -3}], [8.3, {s: 0.8, dy: -3}], [8.5, {}], [8.85, {}], [9.28, {dx: 20, s: 0.95}]]);
  set('br.title', beat(8.36, 8.86));
  set('br.foot', beat(8.44, 8.86, {dy: 2}, {dy: 2}));

  /* BR → SU (T 8.88 → 9.28): a streak of light sweeps sideways; behind it the airy SU scene. ---- */
  const streak = [8.88, 9.28];
  set('fx.streak', [[streak[0] - 0.01, {x: -20, o: 0}], [streak[0], {x: -20}, 'step'], [streak[1], {x: 118}, 'lin'], [streak[1] + 0.01, {x: 118, o: 0}, 'step']]);
  set('su', [[streak[0] - 0.01, {'--wipe': -0.2, o: 0}], [streak[0], {'--wipe': -0.2}, 'step'], [streak[1], {'--wipe': 1.18}, 'lin'], [11.5, {}], [11.51, {o: 0}, 'step']]);

  /* SU (T 9.28 → 11.25): weightless; the headline, then three jobs travel sideways. ----------- */
  set('su.bg', [[8.9, {dx: -6}], [11.25, {dx: 4}]]);
  set('su.air', [[8.9, {dx: 20, o: 0}], [9.5, {}], [11.25, {dx: -30, dy: -10}], [11.5, {dx: -40, dy: -16, o: 0}]]);
  set('su.problem', kicker([[8.95, big], [9.45, big], [9.55, {}]], 11.2));
  set('su.title', beat(9.5, 11.2));
  set('su.pack', [[8.95, {dx: 40, dy: 4, r: -24}], [9.7, {r: -12}, 'out'], [10.9, {dx: -3, dy: -2, r: -10}], [11.3, {dx: -12, dy: -6, r: -8}]]);
  set('su.ribbonBack', [[8.95, {dx: 70, o: 0}], [9.1, {dx: 60}], [9.8, {}, 'out'], [11.2, {dx: -12, dy: 2}], [11.5, {dx: -60, o: 0}]]);
  // The ribbon crosses while nothing is being read, then rests beside the tube, clear of the words.
  const rest = tall ? {dx: 18, dy: -6} : {dx: 34, dy: -4};
  set('su.ribbon', [[9.3, {dx: -120}], [9.84, rest, 'out'], [10.9, {...rest, dx: rest.dx - 6}], [11.3, {dx: -110}, 'in'], [11.31, {dx: -110, o: 0}, 'step']]);
  const sideways = (inAt, outAt) => {
    const frames = [[inAt, {dx: 36, o: 0}], [inAt + 0.1, {}, 'out']];
    if (outAt != null) frames.push([outAt, {}], [outAt + 0.08, {dx: -36, o: 0}, 'in']);
    return frames;
  };
  set('su.w1', sideways(9.85, 10.15));
  set('su.w2', sideways(10.2, 10.5));
  set('su.w3', sideways(10.55, 10.9));
  set('su.foot', beat(10.9, 11.2, {dy: 2}, {dy: 2}));

  /* SU → PO (T 11.2 → 11.64): the air thickens into powder; the veil clears onto the PO scene. -- */
  set('fx.motes', [[11.1, {o: 0, dy: 10}], [11.3, {}], [11.56, {dy: -18, s: 1.3}], [11.66, {dy: -24, s: 1.4, o: 0}]]);
  set('fx.veil', [[11.22, {dy: 70, s: 1.1, o: 0}], [11.3, {dy: 60, s: 1.1}], [11.5, {s: 1.35}, 'out'], [11.66, {dy: -55, s: 1.6}, 'in'], [11.67, {dy: -55, s: 1.6, o: 0}, 'step']]);

  /* PO (T 11.5 → 13.45): the problem; the outline fills; the compact lands; two waves; support. -- */
  set('po', [[11.49, {o: 0}], [11.5, {}, 'step'], [13.6, {}], [13.76, {o: 0}]]);
  set('po.bg', [[11.5, {s: 1.1}], [12.2, {}], [13.45, {s: 1.03}]]);
  set('po.band', [[11.5, {dy: -14, s: 1.2, o: 0.6}], [12.1, {}, 'out'], [13.45, {dy: 2}], [13.7, {dy: 20, o: 0}]]);
  set('po.problem', kicker([[11.5, big], [11.84, big], [11.94, {}]], 13.4));
  set('po.title', [[11.9, {dy: 2, o: 0, '--fill': 0}], [12.0, {'--fill': 0}], [12.14, {'--fill': 1}], [13.42, {}], [13.5, {dy: -3, o: 0}]]);
  set('po.pack', [[11.9, {dy: -95, r: -16, s: 1.25}], [12.2, {}, 'out'], [13.44, {}], [13.6, {match: 'rg.PO'}]]);
  set('po.w1', beat(12.4, 12.66));
  set('po.w2', beat(12.72, 13.05));
  set('po.foot', beat(13.08, 13.45, {dy: 2}, {dy: 2}));

  /* PO → the set (T 13.45 → 14.3): the compact finds its place; the other four return. -------- */
  // The set lies beneath PO. PO dissolves only once its compact matches the set's own, so the
  // compact stays solid while the room around it changes.
  set('rg', [[13.59, {o: 0}], [13.6, {}, 'step']]);
  set('rg.bg', [[13.6, {s: 1.08}], [14.1, {}]]);
  const back = {CL: {dx: -60, dy: 6}, AC: {dx: -30, dy: -60}, BR: {dx: 20, dy: -64}, SU: {dx: 60, dy: 4}};
  for (const [id, from] of Object.entries(back)) set(`rg.${id}`, [[13.64, {...from, s: 1.2}], [13.94, {}, 'out']]);
  set('rg.title', beat(13.86, null));
  set('rg.foot', beat(13.92, null, {dy: 2}));

  return {end: END, chapters: CHAPTERS, tracks};
}
