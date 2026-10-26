/**
 * Luxury template extras (loaded only when the visitor picks "หรู" and motion is allowed):
 *   film   a 10-second dolly-in, stored as a WebP frame sequence (entry/media/v5/film/<business>/w|p/NNN.webp),
 *          drawn on one WebGL canvas as you scroll: the playhead glides, next-door frames blend briefly, then a warm
 *          grade, vignette, a gold anamorphic streak on highlights (large screens) and moving grain. Frames load
 *          coarse-to-fine and decode off the main thread near the playhead. Phones get a 9:16 crop. Without WebGL
 *          it falls back to a 2D canvas; without frames, CSS keeps the stills.
 *   dust   gold specks drifting up, pushed by the scroll; only drawn while a chapter asks for them
 *   light  a soft warm light under the pointer (mouse and trackpad only)
 */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
// frames are uploaded unflipped (ImageBitmap ignores UNPACK_FLIP_Y), so the shader flips v
const FS = `precision mediump float;
varying vec2 v;uniform sampler2D A,B;uniform float M,T,Z,F,L;uniform vec2 S;
float h(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=(vec2(v.x,1.-v.y)-.5)*S/Z+.5;
  vec3 c=mix(texture2D(A,uv).rgb,texture2D(B,uv).rgb,M);
  if(L>.5){ // anamorphic streak: highlights bleed sideways in warm gold, like a cinema lens (4 taps a side)
    vec3 g=vec3(0.);
    for(int i=1;i<=4;i++){float o=float(i)*.017*S.x;g+=(max(texture2D(A,uv+vec2(o,0.)).rgb-.7,0.)+max(texture2D(A,uv-vec2(o,0.)).rgb-.7,0.))*(1.-float(i)/5.);}
    c+=g*vec3(1.,.76,.42)*.38;
  }
  float l=dot(c,vec3(.299,.587,.114));
  c=mix(vec3(l),c,1.06);
  c*=vec3(1.04,1.,.92);
  vec2 d=(v-.5)*vec2(1.3,1.);
  c*=1.-dot(d,d)*.95;
  c+=(h(v*937.+T)-.5)*.045;
  gl_FragColor=vec4(c*(1.-F),1.);
}`;

/* The film. Smooth by design:
   - the playhead glides toward the scroll position (critically damped, ~0.1 s), so a wheel tick plays frames
     instead of jumping, and next-door frames blend briefly around their midpoint;
   - frames arrive as small encoded files (coarse to fine) and are decoded off the main thread (createImageBitmap)
     only around the playhead; a dozen decoded frames are kept, the rest are released, so memory stays flat;
   - the canvas draws at most ~2 MP (the grain hides the upscale), and only while something moves. */
function createFilm({count, url}) {
  const n = count;
  const portrait = innerWidth / Math.max(1, innerHeight) < .8;
  const fine = matchMedia('(pointer: fine)').matches;
  const KEEP = portrait ? 10 : 14;
  const blobs = new Array(n).fill(null), cache = new Map(), decoding = new Set();
  let canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let gl = null, g2 = null, prog = null, tex = [], texFor = [-1, -1], loc = {};
  let host = null, target = 0, head = -1, fade = 0, zoom = 1, raf = 0, running = false, last = 0, lastDraw = 0, alive = true, shown = false, dirty = true;

  const to2d = () => { gl = null; const old = canvas; canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); g2 = canvas.getContext('2d'); old.replaceWith(canvas); texFor = [-1, -1]; dirty = true; };
  function initGL() {
    try { gl = canvas.getContext('webgl', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance'}); } catch { gl = null; }
    if (!gl) { g2 = canvas.getContext('2d'); return; }
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { to2d(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['A', 'B', 'M', 'T', 'Z', 'F', 'S', 'L']) loc[k] = gl.getUniformLocation(prog, k);
    gl.uniform1i(loc.A, 0); gl.uniform1i(loc.B, 1);
    gl.uniform1f(loc.L, portrait || !fine ? 0 : 1); // phones skip the streak
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    tex = [gl.createTexture(), gl.createTexture()];
    for (const t of tex) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); to2d(); }, {once: true});
  }
  initGL();

  // network: every file is small; the ends first, then every 16th, 8th, 4th, 2nd and the rest
  const order = [], seen = new Set();
  const add = i => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
  add(0); add(n - 1);
  for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) add(i);
  let next = 0, inflight = 0;
  function pump() {
    while (alive && inflight < 6 && next < order.length) {
      const i = order[next++];
      inflight++;
      fetch(url(i, portrait)).then(r => (r.ok ? r.blob() : null)).then(b => { if (b && alive) { blobs[i] = b; dirty = true; kick(); } }, () => {})
        .finally(() => { inflight--; pump(); });
    }
  }
  pump();

  // decoding: off the main thread, only near the playhead, a few at a time
  const usable = i => cache.has(i) || texFor[0] === i || texFor[1] === i;
  function decode(i) {
    if (i < 0 || i >= n || !blobs[i] || cache.has(i) || decoding.has(i) || decoding.size > 2) return;
    decoding.add(i);
    const job = typeof createImageBitmap === 'function'
      ? createImageBitmap(blobs[i])
      : new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(blobs[i]); });
    job.then(bm => {
      if (!alive) { bm.close?.(); return; }
      cache.set(i, bm); dirty = true; trim(); kick();
    }, () => {}).finally(() => decoding.delete(i));
  }
  function trim() {
    if (cache.size <= KEEP) return;
    const far = [...cache.keys()].sort((x, y) => Math.abs(y - head) - Math.abs(x - head));
    for (const i of far.slice(0, cache.size - KEEP)) { cache.get(i).close?.(); cache.delete(i); }
  }
  function prefetch() {
    const c = Math.floor(head < 0 ? target : head), dir = target >= head ? 1 : -1;
    for (const k of [0, 1, 2, -1, 3, 4, 5, -2, 6, 8, 10]) decode(c + k * dir);
    decode(Math.floor(target)); decode(Math.ceil(target));
  }

  // the two frames around f that can be drawn now, and how far between them
  function pick(f) {
    let a = Math.floor(f), b = Math.min(n - 1, a + 1);
    if (usable(a) && usable(b)) return [a, b, b > a ? f - a : 0];
    while (a >= 0 && !usable(a)) a--;
    while (b < n && !usable(b)) b++;
    if (a < 0 && b >= n) return null;
    if (a < 0) a = b;
    if (b >= n) b = a;
    return [a, b, b > a ? clamp((f - a) / (b - a)) : 0];
  }
  function fit() {
    if (!host) return false;
    let w = host.clientWidth * Math.min(devicePixelRatio || 1, 1.5), h = host.clientHeight * Math.min(devicePixelRatio || 1, 1.5);
    const k = Math.min(1, Math.sqrt(2.1e6 / Math.max(1, w * h)));
    w = Math.round(w * k); h = Math.round(h * k);
    if (!w || !h) return false;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl?.viewport(0, 0, w, h); }
    return true;
  }
  function upload(unit, i) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cache.get(i));
    texFor[unit] = i;
  }
  let fw = 16, fh = 9;
  function draw(t) {
    if (!fit()) return;
    const pk = pick(head);
    if (!pk) return;
    let [a, b, mix] = pk;
    // blend only next-door frames, and only around the midpoint: two frames far apart (while the in-between ones
    // are still loading), or a long blend of any two, reads as a double image
    if (b - a > 1) { if (mix >= .5) a = b; mix = 0; } else { const q = clamp((mix - .3) / .4); mix = q * q * (3 - 2 * q); }
    const W = canvas.width, H = canvas.height;
    if (gl) {
      if (texFor[0] !== a && (texFor[1] === a || texFor[0] === b)) { tex.reverse(); texFor.reverse(); } // reuse what is uploaded
      if (texFor[0] !== a) { if (!cache.has(a)) return; upload(0, a); }
      if (texFor[1] !== b) { if (cache.has(b)) upload(1, b); else { b = a; mix = 0; } }
      const src = cache.get(a); if (src) { fw = src.width; fh = src.height; }
      const R = W / H, I = fw / fh;
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texFor[1] === b ? tex[1] : tex[0]);
      gl.uniform1f(loc.M, mix); gl.uniform1f(loc.T, (t % 10000) / 37);
      gl.uniform1f(loc.Z, zoom); gl.uniform1f(loc.F, fade);
      gl.uniform2f(loc.S, Math.min(1, R / I), Math.min(1, I / R));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (g2) {
      const A = cache.get(a), B = cache.get(b);
      if (!A) return;
      const s = Math.max(W / A.width, H / A.height) * zoom;
      const dw = A.width * s, dh = A.height * s, x = (W - dw) / 2, y = (H - dh) / 2;
      g2.globalAlpha = 1; g2.drawImage(A, x, y, dw, dh);
      if (B && mix > .01 && b !== a) { g2.globalAlpha = mix; g2.drawImage(B, x, y, dw, dh); }
      if (fade > .005) { g2.globalAlpha = fade; g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H); }
      g2.globalAlpha = 1;
    }
    if (!shown) { shown = true; host.classList.add('has-film'); }
    canvas.dataset.head = head.toFixed(2); // where the playhead is (read by the browser checks)
    dirty = false; lastDraw = t;
  }
  function loop(t) {
    raf = 0;
    if (!running || !alive) return;
    const dt = last ? Math.min(100, t - last) : 16; last = t;
    if (head < 0) head = target;
    else if (head !== target) {
      head += (target - head) * (1 - Math.exp(-dt / 105));
      if (Math.abs(target - head) < .004) head = target;
      dirty = true;
    }
    prefetch();
    // draw when the picture changed; while still, only ~24 times a second so the grain keeps moving
    if (dirty || (gl && t - lastDraw > 41)) draw(t);
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (running && !raf) { last = 0; raf = requestAnimationFrame(loop); } }

  return {
    count: n,
    show({host: h, f, fade: fd, zoom: z}) {
      if (h !== host) {
        host?.classList.remove('has-film');
        host = h; shown = false; host.append(canvas); head = -1; dirty = true;
      }
      if (f !== target || fd !== fade || z !== zoom) dirty = true;
      target = f; fade = fd; zoom = z;
      running = true; kick();
    },
    pause() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize() { dirty = true; },
    dispose() {
      alive = false; this.pause();
      host?.classList.remove('has-film');
      for (const bm of cache.values()) bm.close?.();
      cache.clear();
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
}

function createDust(stage) {
  const cv = document.createElement('canvas');
  cv.className = 'lx-dust'; cv.setAttribute('aria-hidden', 'true');
  stage.append(cv);
  const g = cv.getContext('2d');
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const sg = sprite.getContext('2d');
  const grd = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,240,200,1)'); grd.addColorStop(.22, 'rgba(236,200,126,.6)'); grd.addColorStop(1, 'rgba(200,163,90,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 64, 64);
  const N = innerWidth < 760 ? 34 : 70;
  const ps = Array.from({length: N}, () => ({x: Math.random(), y: Math.random(), z: .25 + Math.random() * .75, ph: Math.random() * 6.283, s: Math.random()}));
  let W = 0, H = 0, dpr = 1, level = 0, target = 0, raf = 0, last = 0, lastY = scrollY, vy = 0;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.25);
    W = stage.clientWidth; H = stage.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  size();
  function frame(t) {
    raf = 0;
    const dt = last ? Math.min(3, (t - last) / 16.7) : 1;
    last = t;
    level += (target - level) * Math.min(1, .06 * dt);
    const sy = scrollY; vy = vy * .85 + (sy - lastY) * .15; lastY = sy;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (level > .004) {
      g.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.y -= (.0005 + p.z * .001) * dt + vy * p.z * .0004;
        p.x += Math.sin(t * .0004 + p.ph) * .00025 * dt;
        if (p.y < -.05) { p.y = 1.05; p.x = Math.random(); }
        if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
        const twinkle = .45 + .55 * Math.sin(t * .0015 + p.ph * 3);
        const r = (2 + p.z * 7) * (.7 + p.s * .6);
        g.globalAlpha = clamp(level * twinkle * (.2 + p.z * .65));
        g.drawImage(sprite, p.x * W - r, p.y * H - r, r * 2, r * 2);
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (level > .004 || target > .004) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  return {
    level(v) { target = v; if (!raf && (v > .004 || level > .004)) raf = requestAnimationFrame(frame); },
    resize: size,
    dispose() { cancelAnimationFrame(raf); raf = 0; cv.remove(); },
  };
}

export function createLux({stage, film: spec, saveData}) {
  const dust = createDust(stage);
  const film = spec && !saveData ? createFilm(spec) : null;
  let light = null, onMove = null;
  if (matchMedia('(pointer: fine)').matches) {
    light = document.createElement('div');
    light.className = 'lx-light'; light.setAttribute('aria-hidden', 'true');
    stage.append(light);
    let mx = 0, my = 0, lit = 0;
    onMove = e => {
      const r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
      lit ||= requestAnimationFrame(() => { lit = 0; light.style.transform = `translate3d(${mx}px, ${my}px, 0)`; });
    };
    stage.addEventListener('pointermove', onMove, {passive: true});
  }
  const onResize = () => { dust.resize(); film?.resize(); };
  addEventListener('resize', onResize);
  let want = null;
  return {
    chapter(c, s, onScreen) {
      const host = c.el.querySelector('[data-film]');
      if (!host || !film || !s.visible || !onScreen) return;
      const last = film.count - 1, rev = host.dataset.film === 'rev';
      const f = rev ? (1 - clamp(s.p / .7)) * last : clamp((s.p - .03) / .94) * last;
      want = {host, f, fade: rev ? 0 : s.out * .8, zoom: 1 + s.p * .035};
      const tc = c.el.querySelector('[data-frame]');
      if (tc) tc.textContent = String(Math.round(f) + 1).padStart(2, '0');
    },
    commit(level) {
      dust.level(level);
      if (film) { if (want) film.show(want); else film.pause(); }
      want = null;
    },
    dispose() {
      dust.dispose(); film?.dispose();
      if (light) { stage.removeEventListener('pointermove', onMove); light.remove(); }
      removeEventListener('resize', onResize);
    },
  };
}
