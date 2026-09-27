/*!
 * Clover Depth · scroll-driven particle scenes in raw WebGL.
 * Grown from THE DUNGEON's Phase 5 (classroom/dungeon): one particle buffer holds every scene,
 * the vertex shader blends them by scroll position, and particles scatter into a nebula
 * between scenes. No library, no model file, no image: every shape is an SVG path or an
 * equation sampled when the page opens.
 *
 *   <section data-depth>
 *     <div data-depth-stage> <canvas data-depth-canvas aria-hidden="true"></canvas>
 *       <p data-depth-caption="0">…</p> …                     (one caption per scene)
 *       <span data-depth-count></span> <i data-depth-progress></i>   (optional HUD)
 *     </div>
 *     <script type="application/json" data-depth-scenes>{ "glyphs": [...], "scenes": [...] }</script>
 *   </section>
 *   <script src="/assets/depth/clover-depth.js" defer></script>
 *
 * A scene: {"shape":"cloud"} (a slow cloud of glyphs), or {"fill":"<path>", "stroke":"<path>",
 * "width":2.4} drawn in a 100×100 box (or "parts":[{fill, stroke, width, repeat, angle}] when a piece
 * repeats around the centre), plus "tint":[r,g,b] and optional "eye":[x,y,z], "size", "depth".
 * Up to 5 scenes. Without JavaScript the captions are a plain list; without WebGL the captions
 * still follow the scroll over a still backdrop; with reduced motion only the scroll moves it.
 */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const MAX = 5;

  function rng(seed) { // mulberry32: the same sky every visit
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ---------- shapes: an SVG path (or a cloud) becomes N points ---------- */
  function sample(scene, count, rand) {
    const out = new Float32Array(count * 3);
    if (scene.shape === 'cloud') {
      for (let i = 0; i < count; i++) {
        const r = 1.35 + Math.pow(rand(), .7) * 1.9, th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
        out[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.3;
        out[i * 3 + 1] = r * Math.cos(ph) * .72;
        out[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      return out;
    }
    const S = 220, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d', {willReadFrequently: true});
    x.scale(S / 100, S / 100); x.fillStyle = x.strokeStyle = '#fff'; x.lineCap = x.lineJoin = 'round';
    for (const part of scene.parts || [scene]) {   // a part may repeat around the centre (a clover's leaves)
      const reps = part.repeat || 1;
      x.lineWidth = part.width || scene.width || 2.4;
      for (let k = 0; k < reps; k++) {
        x.save(); x.translate(50, 50); x.rotate((part.angle || 0) * Math.PI / 180 + k * Math.PI * 2 / reps); x.translate(-50, -50);
        if (part.fill) x.fill(new Path2D(part.fill));
        if (part.stroke) x.stroke(new Path2D(part.stroke));
        x.restore();
      }
    }
    const px = x.getImageData(0, 0, S, S).data, hits = [];
    for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) if (px[(y * S + i) * 4 + 3] > 110) hits.push(i, y);
    const m = hits.length / 2;
    if (!m) return out;
    const size = scene.size || 2.9, depth = scene.depth ?? .32, [ox, oy, oz] = scene.offset || [0, 0, 0];
    for (let i = 0; i < count; i++) {
      const h = Math.floor(rand() * m) * 2;
      out[i * 3] = ((hits[h] + rand()) / S - .5) * size + ox;
      out[i * 3 + 1] = -((hits[h + 1] + rand()) / S - .5) * size + oy;
      out[i * 3 + 2] = (rand() - .5) * depth + oz;
    }
    return out;
  }

  /* ---------- the glyph atlas: words that float in the first scene ---------- */
  function atlas(words) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < 64; i++) {
      const w = words[i % words.length] || '·';
      let size = 30; x.font = `700 ${size}px "Sukhumvit Set", Kanit, Anuphan, Tahoma, sans-serif`;
      while (x.measureText(w).width > 58 && size > 12) { size -= 2; x.font = `700 ${size}px "Sukhumvit Set", Kanit, Anuphan, Tahoma, sans-serif`; }
      x.fillText(w, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34);
    }
    return c;
  }

  /* ---------- tiny matrix kit ---------- */
  const perspective = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; };
  function lookAt(e, c) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xz /= l;           // up = +y
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  const mul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3]; return o; };

  const VS = `
attribute vec3 aS0,aS1,aS2,aS3,aS4;
attribute vec4 aR;
uniform mat4 uPV;
uniform float uP,uT,uScale,uGlyph;
uniform vec3 uC0,uC1,uC2,uC3,uC4;
varying vec3 vCol;
varying float vGlyph,vMix,vA;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hat(float k){return clamp(1.-abs(uP-k),0.,1.);}
void main(){
  float w0=hat(0.),w1=hat(1.),w2=hat(2.),w3=hat(3.),w4=hat(4.);
  vec3 n=aR.xyz-.5;
  vec3 s0=aS0; s0.xz=rot(uT*.1)*s0.xz; s0+=n*.08*sin(uT*1.1+aR.w*6.28);
  vec3 s1=aS1; s1.xz=rot(sin(uT*.33)*.38)*s1.xz;
  vec3 s2=aS2; s2.xz=rot(sin(uT*.29)*.3)*s2.xz;
  vec3 s3=aS3; s3.xz=rot(sin(uT*.27)*.36)*s3.xz;
  vec3 s4=aS4; s4.xz=rot(sin(uT*.31)*.42)*s4.xz;
  vec3 p=s0*w0+s1*w1+s2*w2+s3*w3+s4*w4;
  float mid=1.-max(max(max(w0,w1),max(w2,w3)),w4);
  p+=n*mid*5.;
  p.xy=rot(mid*(aR.x-.5)*3.)*p.xy;
  p+=n*.012*sin(uT*2.2+aR.w*6.28);
  vec4 v=uPV*vec4(p,1.);
  gl_Position=v;
  float glyph=w0*uGlyph*step(.58,aR.x);   /* four in ten particles of the first scene are words */
  gl_PointSize=clamp((.016+aR.y*.017+glyph*.075)*uScale/max(v.w,.2),1.,64.);
  vec3 c=uC0*w0+uC1*w1+uC2*w2+uC3*w3+uC4*w4+vec3(.95,.88,.7)*mid;
  c=mix(c,vec3(1.,.84,.5),step(.9,aR.z)*.75);
  vCol=c;
  vGlyph=floor(aR.w*63.99);
  vMix=glyph;
  vA=(.6+.4*sin(uT*1.6+aR.x*50.))*smoothstep(.3,1.8,v.w)*(1.-.45*w0*uGlyph);
}`;
  const FS = `
precision mediump float;
uniform sampler2D uGlyphs;
varying vec3 vCol;
varying float vGlyph,vMix,vA;
void main(){
  vec2 q=gl_PointCoord-.5;
  float d=smoothstep(.5,0.,length(q)); d*=d;
  vec2 cell=vec2(mod(vGlyph,8.),floor(vGlyph/8.));
  float g=texture2D(uGlyphs,(cell+gl_PointCoord)/8.).a;
  float a=mix(d,g,clamp(vMix,0.,1.));
  gl_FragColor=vec4(vCol*a*vA*.8,1.);
}`;

  function boot(box) {
    let cfg;
    try { cfg = JSON.parse(box.querySelector('script[data-depth-scenes]').textContent); } catch { return; }
    const scenes = (cfg.scenes || []).slice(0, MAX), n = scenes.length;
    const stage = box.querySelector('[data-depth-stage]'), cv = box.querySelector('canvas[data-depth-canvas]');
    if (!n || !stage || !cv) return;
    const caps = [...box.querySelectorAll('[data-depth-caption]')];
    const rail = box.querySelector('[data-depth-progress]'), counter = box.querySelector('[data-depth-count]');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = matchMedia('(max-width: 720px)').matches, modest = (navigator.hardwareConcurrency || 8) <= 4;
    box.classList.add('depth-live');

    /* ---- scroll → scene (works with or without WebGL) ---- */
    let target = 0, cur = 0, raw = 0, capOn = -2, top0 = 0;
    const measure = () => { top0 = parseFloat(getComputedStyle(stage).top) || 0; };   // where the stage sticks
    function read() {
      const r = box.getBoundingClientRect(), span = box.offsetHeight - stage.offsetHeight;
      raw = span > 0 ? clamp((top0 - r.top) / span, 0, 1) : 0;
      const s = raw * (n - 1), k = Math.min(n - 1, Math.floor(s)), f = s - k, e = clamp((f - .3) / .45, 0, 1);
      target = k >= n - 1 ? n - 1 : k + e * e * (3 - 2 * e);   // hold each scene, then morph
    }
    function paint() {
      const i = Math.round(cur), on = Math.abs(cur - i) < .3 ? i : -1;
      if (rail) rail.style.transform = `scaleY(${raw.toFixed(4)})`;
      if (on === capOn) return;
      capOn = on;
      caps.forEach(c => c.classList.toggle('on', +c.dataset.depthCaption === on));
      box.dataset.scene = on;
    }

    let gl = null;
    try { gl = cv.getContext('webgl', {antialias: false, alpha: false, depth: false, powerPreference: 'high-performance'}); } catch {}
    const still = () => { // no WebGL: the captions still walk with the scroll over a still backdrop
      box.classList.add('depth-still'); box.dataset.depthState = 'still';
      const tick = () => { read(); cur = target; paint(); };
      addEventListener('scroll', tick, {passive: true}); addEventListener('resize', () => { measure(); tick(); }); measure(); tick();
    };
    if (!gl) return still();

    const mk = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return still();
    gl.useProgram(prog);

    /* ---- particles: every scene's position lives in the same buffer set ---- */
    const count = cfg.count || (phone || modest ? 7000 : 12000);
    const rand = rng(cfg.seed || 7), shapes = [], reach = [];
    for (let k = 0; k < MAX; k++) shapes.push(k < n ? sample(scenes[k], count, rand) : shapes[n - 1]);
    shapes.forEach((s, k) => { // how far each shape reaches, so the camera can keep it whole on any screen
      let hw = 0, hh = 0;
      for (let i = 0; i < s.length; i += 3) { hw = Math.max(hw, Math.abs(s[i])); hh = Math.max(hh, Math.abs(s[i + 1])); }
      reach.push(scenes[Math.min(k, n - 1)].shape === 'cloud' ? null : [hw, hh]);
    });
    const attr = (name, data, size) => {
      const loc = gl.getAttribLocation(prog, name); if (loc < 0) return;
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    shapes.forEach((s, k) => attr('aS' + k, s, 3));
    const r4 = new Float32Array(count * 4); for (let i = 0; i < r4.length; i++) r4[i] = rand();
    attr('aR', r4, 4);

    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas(cfg.glyphs || ['AI']));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const U = name => gl.getUniformLocation(prog, name);
    const uPV = U('uPV'), uP = U('uP'), uT = U('uT'), uScale = U('uScale'), uGlyph = U('uGlyph');
    gl.uniform1i(U('uGlyphs'), 0);
    for (let k = 0; k < MAX; k++) gl.uniform3fv(U('uC' + k), (scenes[Math.min(k, n - 1)].tint) || [.9, .85, .7]);
    gl.uniform1f(uGlyph, scenes[0].shape === 'cloud' ? 1 : 0);
    const bg = cfg.background || [.035, .082, .06];
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.disable(gl.DEPTH_TEST);
    if (counter) counter.textContent = count.toLocaleString('th-TH');
    box.dataset.depthState = 'webgl'; box.dataset.depthCount = count;

    /* ---- size, camera, pointer ---- */
    let dpr = Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5), W = 0, H = 0;
    function size() {
      measure();
      W = Math.max(1, Math.round(stage.clientWidth * dpr)); H = Math.max(1, Math.round(stage.clientHeight * dpr));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    }
    let px = 0, py = 0, tpx = 0, tpy = 0;
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect(); tpx = (e.clientX - r.left) / r.width - .5; tpy = (e.clientY - r.top) / r.height - .5;
    });
    const TAN = Math.tan(.39);   // half of the vertical field of view
    function eyeOf(k, asp) {
      const e = ((scenes[Math.min(k, n - 1)].eye) || [0, 0, 5.4]).slice(), r = reach[k];
      if (r) e[2] = Math.max(e[2], Math.max(r[0] / (TAN * asp), r[1] / (TAN * .78)) * 1.12);   // fit, leaving room for the caption
      e[1] -= e[2] * TAN * (asp < 1 ? .24 : .1);   // sit above the caption box
      return e;
    }

    /* ---- draw only while the stage can be seen ---- */
    let visible = false, running = false, t = 0, last = 0, slow = 0;
    function draw(dt) {
      read();
      cur = reduce ? target : cur + (target - cur) * Math.min(1, dt * 5.5);
      if (Math.abs(target - cur) < .0005) cur = target;
      paint();
      px += (tpx - px) * .05; py += (tpy - py) * .05;
      const w = [0, 1, 2, 3, 4].map(k => Math.max(0, 1 - Math.abs(cur - k)));
      const eye = [0, 0, 0], asp = W / H;
      w.forEach((wk, k) => { const e = eyeOf(k, asp); eye[0] += e[0] * wk; eye[1] += e[1] * wk; eye[2] += e[2] * wk; });
      const sum = w.reduce((a, b) => a + b, 0) || 1; eye[0] /= sum; eye[1] /= sum; eye[2] /= sum;
      const aim = [0, eye[1], 0];   // look straight ahead: the lift moves the picture, not the angle
      eye[0] += px * .6; eye[1] -= py * .4;
      gl.uniformMatrix4fv(uPV, false, new Float32Array(mul(perspective(.78, asp, .1, 80), lookAt(eye, aim))));
      gl.uniform1f(uP, cur); gl.uniform1f(uT, t); gl.uniform1f(uScale, H * .9);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
    }
    function frame(now) {
      if (!visible || document.hidden) { running = false; return; }
      const dt = Math.min(.1, (now - last) / 1000 || .016); last = now;
      if (!reduce) t += dt;
      // a slow device keeps its frame rate by drawing fewer pixels
      slow = dt > .034 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 90 && dpr > 1) { dpr = 1; slow = 0; size(); }
      draw(dt);
      if (!reduce || Math.abs(target - cur) > .0005) requestAnimationFrame(frame); else running = false;
    }
    const go = () => { if (running || !visible) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; go(); }, {rootMargin: '120px 0px'}).observe(box);
    document.addEventListener('visibilitychange', go);
    addEventListener('scroll', go, {passive: true});
    addEventListener('resize', () => { size(); if (!running) draw(0); });
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); visible = false; box.classList.add('depth-still'); box.dataset.depthState = 'still'; });
    size(); read(); cur = target; paint(); draw(0);
  }

  const start = () => document.querySelectorAll('[data-depth]').forEach(boot);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
