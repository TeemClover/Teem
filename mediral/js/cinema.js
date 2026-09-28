/**
 * Mediral — one cinematic viewport driven by scroll.
 *
 * The story section is a tall track with one sticky viewport. Scroll inside the track is one global
 * time T, measured in screens. Every moving element is a layer (`data-layer="name"`) whose resting
 * place is its CSS box ("home"); the score gives each layer keyframes in viewport terms, and this
 * engine turns T into a transform, an opacity and optional custom properties. There are no timers:
 * the same T always gives the same frame, forwards or backwards, slow or fast.
 *
 * Keyframe: [T, props, ease?]. Props (all optional; an omitted prop means "at home"):
 *   x, y      centre of the layer, in % of the viewport width / height
 *   dx, dy    offset from home, in % of the viewport width / height
 *   s         scale; or h / w: rendered height / width in % of the viewport height / width
 *   match     name of another layer: take that layer's home centre and height (a hand-off pose)
 *   focus     name of another layer: this camera scales by s about its centre and flies until that
 *             layer's home sits at the centre of the view (a zoom through an object)
 *   r, rx     rotation / tilt towards the viewer, in degrees
 *   o         opacity (default 1)
 *   '--name'  any number, written as a custom property for CSS (clip radius, wipe edge…). Once a
 *             track names a property, every frame carries it: it holds its last value, and takes its
 *             first value before that, so a frame never depends on where the reader came from.
 * Ease names the curve that arrives at this keyframe: 'io' (default), 'in', 'out', 'lin', 'step'.
 */
const EASE = {
  io: x => x * x * (3 - 2 * x),
  in: x => x * x * x,
  out: x => 1 - (1 - x) ** 3,
  lin: x => x,
  step: x => (x < 1 ? 0 : 1),
};
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const PRELOAD = 1.25; // screens of lead before a layer's pictures are needed

/** A layer's home box relative to the viewport, ignoring transforms. */
export function homeBox(el, view) {
  let x = 0, y = 0;
  for (let node = el; node && node !== view; node = node.offsetParent) {
    x += node.offsetLeft || 0;
    y += node.offsetTop || 0;
  }
  const w = el.offsetWidth || 0, h = el.offsetHeight || 0;
  return {cx: x + w / 2, cy: y + h / 2, w, h};
}

/** Keyframes → plain numbers in pixels, once per layout. */
export function resolveTrack(frames, home, size, homes = {}) {
  const {W, H} = size;
  const track = frames.map(([t, p = {}, ease = 'io']) => {
    const target = p.match ? homes[p.match] : null;
    // A hand-off pose starts from the other layer's home; dx/dy/s still offset it from there.
    const x = target ? target.cx / W * 100 + (p.dx || 0) : p.x;
    const y = target ? target.cy / H * 100 + (p.dy || 0) : p.y;
    let tx = x != null ? x / 100 * W - home.cx : (p.dx || 0) / 100 * W;
    let ty = y != null ? y / 100 * H - home.cy : (p.dy || 0) / 100 * H;
    // A camera (a full-view layer scaled about its centre) flies towards another layer's home.
    const focus = p.focus ? homes[p.focus] : null;
    if (focus) {
      tx = -(p.s ?? 1) * (focus.cx - home.cx) + (p.dx || 0) / 100 * W;
      ty = -(p.s ?? 1) * (focus.cy - home.cy) + (p.dy || 0) / 100 * H;
    }
    let s = p.s ?? 1;
    if (target && home.h) s = target.h / home.h * (p.s ?? 1);
    else if (p.h != null && home.h) s = p.h / 100 * H / home.h;
    else if (p.w != null && home.w) s = p.w / 100 * W / home.w;
    const vars = {};
    for (const key of Object.keys(p)) if (key.startsWith('--')) vars[key] = p[key];
    return {t, tx, ty, s, r: p.r || 0, rx: p.rx || 0, o: p.o ?? 1, vars, ease: EASE[ease] || EASE.io};
  });
  // Every keyframe carries every custom property the track uses (held forward, and back-filled
  // before its first mention), so a frame depends on T alone and never on scroll history.
  const keys = [...new Set(track.flatMap(k => Object.keys(k.vars)))];
  for (const key of keys) {
    let value = track.find(k => key in k.vars).vars[key];
    for (const k of track) {
      if (key in k.vars) value = k.vars[key];
      else k.vars[key] = value;
    }
  }
  return track;
}

/** The pose of a resolved track at time T. */
export function sample(track, T) {
  if (!track.length) return null;
  if (T <= track[0].t) return track[0];
  const last = track[track.length - 1];
  if (T >= last.t) return last;
  let i = 1;
  while (track[i].t < T) i++;
  const a = track[i - 1], b = track[i];
  const k = b.ease(clamp((T - a.t) / Math.max(1e-6, b.t - a.t), 0, 1));
  const mix = (u, v) => u + (v - u) * k;
  const vars = {};
  for (const key of Object.keys(a.vars)) vars[key] = mix(a.vars[key], b.vars[key]);
  return {t: T, tx: mix(a.tx, b.tx), ty: mix(a.ty, b.ty), s: mix(a.s, b.s), r: mix(a.r, b.r), rx: mix(a.rx, b.rx), o: mix(a.o, b.o), vars};
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
// A plain 2D translate: only layers that are visible and marked live are promoted to their own layer.
export function transformOf(pose) {
  const parts = [`translate(${round(pose.tx, 1)}px,${round(pose.ty, 1)}px)`];
  if (pose.rx) parts.push(`rotateX(${round(pose.rx)}deg)`);
  if (pose.r) parts.push(`rotate(${round(pose.r)}deg)`);
  if (pose.s !== 1) parts.push(`scale(${round(pose.s, 4)})`);
  return parts.join(' ');
}

/** The first and last moments at which a track is visible; used to load and paint only near them.
 *  A track that ends visible holds that pose for ever, so its span has no end. */
function visibleSpan(track) {
  const shown = track.filter(k => k.o > 0.001);
  if (!shown.length) return [Infinity, -Infinity];
  const first = track.indexOf(shown[0]), last = track.indexOf(shown[shown.length - 1]);
  // Fading in starts at the keyframe before the first visible one; fading out ends after the last.
  const end = last === track.length - 1 ? Infinity : track[last + 1].t;
  return [track[Math.max(0, first - 1)].t, end];
}

/**
 * createCinema({section, view, score})
 *   score(layout) -> {end, chapters: [{id, from}], tracks: {name: frames}}
 *   layout = {tall, W, H}; chapters mark where each chapter's first composed hold begins.
 * Returns {T, layout, measure(), render(), setFlow(bool), time(), chapterAt(T)}.
 */
export function createCinema({section, view, score, tallQuery}) {
  const layers = new Map([...view.querySelectorAll('[data-layer]')].map(el => [el.dataset.layer, {el, written: {}}]));
  const state = {T: 0, flow: false, layout: null, plan: null, spans: new Map()};

  function measure() {
    if (state.flow) return;
    const W = view.clientWidth || innerWidth, H = view.clientHeight || innerHeight;
    const layout = {tall: tallQuery ? tallQuery.matches : W / H < 1, W, H};
    const plan = score(layout);
    const homes = {};
    for (const [name, layer] of layers) homes[name] = layer.home = homeBox(layer.el, view);
    // Layers come in document order, so a parent layer is always resolved before its children.
    const byElement = new Map([...layers.values()].map(layer => [layer.el, layer]));
    for (const [name, layer] of layers) {
      layer.parent = byElement.get(layer.el.parentElement?.closest?.('[data-layer]')) || null;
      layer.track = resolveTrack(plan.tracks[name] || [[0, {}]], layer.home, layout, homes);
      // A layer can only be seen while every layer around it can be seen too.
      const [start, end] = visibleSpan(layer.track);
      const outer = layer.parent?.span || [-Infinity, Infinity];
      layer.span = [Math.max(start, outer[0]), Math.min(end, outer[1])];
    }
    section.classList.add('is-running');
    state.layout = layout;
    state.plan = plan;
    section.style.setProperty('--screens', String(plan.end + 1));
    for (const mark of section.querySelectorAll('[data-mark]')) {
      const i = plan.chapters.findIndex(c => c.id === mark.dataset.mark);
      if (i < 0) continue;
      const from = plan.chapters[i].from, to = plan.chapters[i + 1]?.from ?? plan.end + 1;
      mark.style.top = `${from * H}px`;
      mark.style.height = `${(to - from) * H}px`;
    }
    render(true);
  }

  function time() {
    const H = state.layout?.H || innerHeight;
    return clamp(-section.getBoundingClientRect().top / H, 0, state.plan?.end ?? 0);
  }

  // A layer loads its own pictures (never a nested layer's) only near the span where it is seen,
  // so a jump deep into the story does not fetch chapters that finished long before.
  const ownImages = layer => [...layer.el.querySelectorAll('img[data-src]')]
    .filter(img => img.parentElement?.closest('[data-layer]') === layer.el);
  function loadNear(layer, T) {
    // The same 1.25-screen lead applies whichever way the reader is scrolling.
    if (layer.loaded || T < layer.span[0] - PRELOAD || T > layer.span[1] + PRELOAD) return;
    layer.loaded = true;
    ownImages(layer).forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
  }

  function write(layer, pose, T) {
    const {el, written} = layer;
    // Visible only if this layer and every layer around it are; hidden layers keep no transform,
    // so they leave the compositor, and CSS stops them catching pointer events.
    const live = pose.o > 0.001 && (!layer.parent || layer.parent.live);
    layer.live = live;
    const transform = live ? transformOf(pose) : 'none';
    const opacity = String(round(pose.o, 3));
    if (written.transform !== transform) el.style.transform = written.transform = transform;
    if (written.opacity !== opacity) el.style.opacity = written.opacity = opacity;
    for (const [key, value] of Object.entries(pose.vars)) {
      const v = String(round(value, 3));
      if (written[key] !== v) el.style.setProperty(key, written[key] = v);
    }
    // Paint and promote only what can be seen; decorative layers also leave the paint tree,
    // and controls cannot take focus while they are faded out.
    if (written.live !== live) {
      written.live = live;
      el.classList.toggle('is-live', live);
      if (el.getAttribute('aria-hidden') === 'true') el.style.visibility = live ? '' : 'hidden';
    }
    const inert = pose.o < 0.5;
    if (el.hasAttribute('data-inert-hidden') && written.inert !== inert) {
      // Focus inside a control that fades out moves to the story itself, never to nowhere.
      const focused = globalThis.document?.activeElement;
      if (inert && focused && el.contains?.(focused)) section.focus?.({preventScroll: true});
      el.inert = written.inert = inert;
    }
    loadNear(layer, T);
  }

  function render(force = false) {
    if (state.flow || !state.plan) return state.T;
    const T = time();
    if (!force && Math.abs(T - state.T) < 1e-4) return T;
    state.T = T;
    for (const layer of layers.values()) {
      const pose = sample(layer.track, T);
      if (pose) write(layer, pose, T);
    }
    return T;
  }

  // Reduced motion and short screens read the same content in normal flow: no pinned viewport,
  // no inline poses, every picture loaded lazily by the browser.
  function setFlow(flow) {
    state.flow = flow;
    section.classList.toggle('is-flow', flow);
    if (flow) {
      section.classList.remove('is-running');
      section.style.removeProperty('--screens');
      for (const layer of layers.values()) {
        const {el} = layer;
        el.style.transform = el.style.opacity = el.style.visibility = '';
        for (const key of Object.keys(layer.written)) if (key.startsWith('--')) el.style.removeProperty(key);
        layer.written = {};
        el.classList.remove('is-live');
        if (el.hasAttribute('data-inert-hidden')) el.inert = false;
        // Flow shows packs and words, not decorative art: only what it displays is handed to the
        // browser's lazy loader, so returning to motion keeps every other preload window.
        if (el.getAttribute('aria-hidden') !== 'true') {
          ownImages(layer).forEach(img => { img.loading = 'lazy'; img.src = img.dataset.src; img.removeAttribute('data-src'); });
        }
        layer.loaded = !ownImages(layer).length;
      }
      placeFlowMarks();
    } else {
      measure();
    }
  }

  // In normal flow each chapter marker simply covers its own chapter block.
  function placeFlowMarks() {
    for (const mark of section.querySelectorAll('[data-mark]')) {
      const shot = section.querySelector(`[data-shot="${mark.dataset.mark}"]`);
      if (!shot) continue;
      let top = 0;
      for (let node = shot; node && node !== section; node = node.offsetParent) top += node.offsetTop || 0;
      mark.style.top = `${top}px`;
      mark.style.height = `${shot.offsetHeight}px`;
    }
  }

  function chapterAt(T = state.T) {
    const chapters = state.plan?.chapters || [];
    let index = -1;
    chapters.forEach((c, i) => { if (T >= c.from) index = i; });
    return index;
  }

  return {
    state, layers, measure, render, setFlow, time, chapterAt, placeFlowMarks,
    get T() { return state.T; },
  };
}
