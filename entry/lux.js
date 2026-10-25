/**
 * Luxury template extras (loaded only when the visitor picks "หรู" and motion is allowed):
 *   film   a 10-second dolly-in, stored as a WebP frame sequence (entry/media/v5/film/<business>/w|p/NNN.webp),
 *          drawn on one WebGL canvas as you scroll: neighbouring frames are blended, then a warm grade, vignette,
 *          a gold anamorphic streak on highlights (large screens) and moving grain. Frames load coarse-to-fine
 *          (every 16th first), so it plays before it has all arrived. Phones get a 9:16 crop. Without WebGL it
 *          falls back to a 2D canvas; without frames, CSS keeps the stills.
 *   dust   gold specks drifting up, pushed by the scroll; only drawn while a chapter asks for them
 *   light  a soft warm light under the pointer (mouse and trackpad only)
 */
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const FS = `precision mediump float;
varying vec2 v;uniform sampler2D A,B;uniform float M,T,Z,F,L;uniform vec2 S;
float h(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453);}
vec3 px(vec2 q){return mix(texture2D(A,q).rgb,texture2D(B,q).rgb,M);}
void main(){
  vec2 uv=(v-.5)*S/Z+.5;
  vec3 c=px(uv);
  if(L>.5){ // anamorphic streak: highlights bleed sideways in warm gold, like a cinema lens
    vec3 g=vec3(0.);
    for(int i=1;i<=6;i++){float o=float(i)*.011*S.x;g+=(max(px(uv+vec2(o,0.))-.7,0.)+max(px(uv-vec2(o,0.))-.7,0.))*(1.-float(i)/7.);}
    c+=g*vec3(1.,.76,.42)*.32;
  }
  float l=dot(c,vec3(.299,.587,.114));
  c=mix(vec3(l),c,1.06);
  c*=vec3(1.04,1.,.92);
  vec2 d=(v-.5)*vec2(1.3,1.);
  c*=1.-dot(d,d)*.95;
  c+=(h(v*937.+T)-.5)*.045;
  gl_FragColor=vec4(c*(1.-F),1.);
}`;

function createFilm({count, url}) {
  const n = count;
  const portrait = innerWidth / Math.max(1, innerHeight) < .8;
  const imgs = new Array(n).fill(null);
  let canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let gl = null, g2 = null, prog = null, tex = [], texFor = [-1, -1], loc = {};
  let host = null, want = {f: 0, fade: 0, zoom: 1}, dirty = true, raf = 0, running = false, lastDraw = 0, alive = true, shown = false;

  function initGL() {
    try { gl = canvas.getContext('webgl', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance'}); } catch { gl = null; }
    if (!gl) { g2 = canvas.getContext('2d'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; canvas = Object.assign(document.createElement('canvas'), {}); canvas.setAttribute('aria-hidden', 'true'); g2 = canvas.getContext('2d'); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const p = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    for (const k of ['A', 'B', 'M', 'T', 'Z', 'F', 'S', 'L']) loc[k] = gl.getUniformLocation(prog, k);
    gl.uniform1i(loc.A, 0); gl.uniform1i(loc.B, 1);
    gl.uniform1f(loc.L, portrait || !matchMedia('(pointer: fine)').matches ? 0 : 1); // phones skip the streak
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    tex = [gl.createTexture(), gl.createTexture()];
    for (const t of tex) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; const old = canvas; canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true'); g2 = canvas.getContext('2d'); old.replaceWith(canvas); dirty = true; }, {once: true});
  }
  initGL();

  // coarse to fine: the ends first, then every 16th, 8th, 4th, 2nd and the rest
  const order = [], seen = new Set();
  const add = i => { if (!seen.has(i)) { seen.add(i); order.push(i); } };
  add(0); add(n - 1);
  for (const step of [16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) add(i);
  let next = 0, inflight = 0;
  function pump() {
    while (alive && inflight < 4 && next < order.length) {
      const i = order[next++];
      inflight++;
      const im = new Image();
      im.decoding = 'async';
      im.src = url(i, portrait);
      (im.decode ? im.decode() : new Promise((ok, no) => { im.onload = ok; im.onerror = no; }))
        .then(() => { if (alive) { imgs[i] = im; dirty = true; kick(); } }, () => {})
        .finally(() => { inflight--; pump(); });
    }
  }
  pump();

  function pick(f) {
    let a = Math.floor(f), b = Math.ceil(f);
    while (a >= 0 && !imgs[a]) a--;
    while (b < n && !imgs[b]) b++;
    if (a < 0 && b >= n) return null;
    if (a < 0) a = b;
    if (b >= n) b = a;
    // neighbours blend only around the midpoint, so a still frame stays sharp; far-apart frames (still loading) cut
    const t = b > a ? clamp((f - a) / (b - a)) : 0;
    const mix = b - a > 2 ? (t < .5 ? 0 : 1) : (k => k * k * (3 - 2 * k))(clamp((t - .3) / .4));
    return [a, b, mix];
  }
  function fit() {
    if (!host) return false;
    const dpr = Math.min(devicePixelRatio || 1, portrait ? 2 : 1.5);
    const w = Math.min(2048, Math.round(host.clientWidth * dpr)), h = Math.min(2048, Math.round(host.clientHeight * dpr));
    if (!w || !h) return false;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl?.viewport(0, 0, w, h); }
    return true;
  }
  function upload(unit, i) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imgs[i]);
    texFor[unit] = i;
  }
  function draw(t) {
    if (!fit()) return;
    const pk = pick(want.f);
    if (!pk) return;
    const [a, b, mix] = pk;
    const im = imgs[a], W = canvas.width, H = canvas.height;
    const R = W / H, I = im.naturalWidth / im.naturalHeight;
    if (gl) {
      if (texFor[0] !== a && texFor[1] === a) { tex.reverse(); texFor.reverse(); }
      if (texFor[0] !== a) upload(0, a);
      if (texFor[1] !== b) upload(1, b);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[0]);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[1]);
      gl.uniform1f(loc.M, mix); gl.uniform1f(loc.T, (t % 10000) / 37);
      gl.uniform1f(loc.Z, want.zoom); gl.uniform1f(loc.F, want.fade);
      gl.uniform2f(loc.S, Math.min(1, R / I), Math.min(1, I / R));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (g2) {
      const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * want.zoom;
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s, x = (W - dw) / 2, y = (H - dh) / 2;
      g2.globalAlpha = 1; g2.drawImage(im, x, y, dw, dh);
      if (mix > .01 && b !== a) { g2.globalAlpha = mix; g2.drawImage(imgs[b], x, y, dw, dh); }
      if (want.fade > .005) { g2.globalAlpha = want.fade; g2.fillStyle = '#000'; g2.fillRect(0, 0, W, H); }
      g2.globalAlpha = 1;
    }
    if (!shown) { shown = true; host.classList.add('has-film'); }
    dirty = false; lastDraw = t;
  }
  // redraw when the frame changed, and about 24 times a second while on screen so the grain moves
  function loop(t) {
    raf = 0;
    if (!running || !alive) return;
    if (dirty || (gl && t - lastDraw > 41)) draw(t);
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (running && !raf) raf = requestAnimationFrame(loop); }

  return {
    count: n,
    show({host: h, f, fade, zoom}) {
      if (h !== host) {
        host?.classList.remove('has-film');
        host = h; shown = false; host.append(canvas); dirty = true;
      }
      if (Math.abs(f - want.f) > .001 || fade !== want.fade || zoom !== want.zoom) dirty = true;
      want = {f, fade, zoom};
      running = true; kick();
    },
    pause() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    resize() { dirty = true; },
    dispose() {
      alive = false; this.pause();
      host?.classList.remove('has-film');
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
    dpr = Math.min(devicePixelRatio || 1, 1.5);
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
    onMove = e => { const r = stage.getBoundingClientRect(); light.style.setProperty('--mx', `${e.clientX - r.left}px`); light.style.setProperty('--my', `${e.clientY - r.top}px`); };
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
