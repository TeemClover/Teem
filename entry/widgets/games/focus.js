// Studio: "กดชัตเตอร์". The canvas is a camera's viewfinder on the studio's own photos. The focus breathes in and out
// and the subject drifts; tap (or Space) when the picture is sharp and the subject sits in the centre frame. The
// focus meter shows the sharp moment coming. Eight frames of film; five good shots wins.
const SHOTS = 8, NEED = 5, SHARP = .22, FRAMED = .12, TAU = Math.PI * 2;

export function create(kit) {
  const {ctx} = kit, {rnd, rgba} = kit.u;
  let shot = 0, good = 0, st = 0, P = null, flash = 0, blades = 0, wait = 0, roll = [], scene = null;
  const off = document.createElement('canvas'), ox = off.getContext('2d');

  function params() {
    return {phi: rnd(0, TAU), w: 1.5 + shot * .16, fx: rnd(.5, .8), fy: rnd(.6, .9), p: rnd(0, TAU), q: rnd(0, TAU), A: .1 + shot * .008, img: photo()};
  }
  function photo() {
    const ok = kit.imgs.filter(i => i.complete && i.naturalWidth);
    return ok.length ? ok[shot % ok.length] : backdrop();
  }
  // without the shop's photos: a soft still life drawn once
  function backdrop() {
    if (scene) return scene;
    scene = document.createElement('canvas'); scene.width = 480; scene.height = 360;
    const x = scene.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#d9d4cc'); g.addColorStop(1, '#8c8378'); x.fillStyle = g; x.fillRect(0, 0, 480, 360);
    x.fillStyle = '#5b4a3c'; x.beginPath(); x.ellipse(240, 300, 150, 26, 0, 0, TAU); x.fill();
    const v = x.createLinearGradient(190, 0, 290, 0); v.addColorStop(0, '#3d6b5c'); v.addColorStop(.5, '#7fb3a0'); v.addColorStop(1, '#2d5245');
    x.fillStyle = v; x.beginPath(); x.moveTo(205, 290); x.bezierCurveTo(170, 220, 215, 170, 222, 120); x.lineTo(258, 120); x.bezierCurveTo(265, 170, 310, 220, 275, 290); x.closePath(); x.fill();
    return scene;
  }
  // the state of the lens at time s into this shot
  const blurAt = s => Math.abs(Math.sin(P.w * s + P.phi));
  const offAt = s => [P.A * Math.sin(P.fx * s * TAU * .5 + P.p), P.A * .8 * Math.sin(P.fy * s * TAU * .5 + P.q)];
  const goodAt = s => blurAt(s) < SHARP && Math.hypot(...offAt(s)) < FRAMED;

  function shoot() {
    if (kit.phase !== 'play' || wait > 0 || shot >= SHOTS) return;
    const b = blurAt(st), d = Math.hypot(...offAt(st)), ok = b < SHARP && d < FRAMED;
    const best = ok && b < .07 && d < .06;
    flash = 1; blades = 1; wait = .75;
    kit.noise(.06, .12, 5000); kit.tone(1800, .03, 'square', .02); kit.buzz(18);
    // the frame you took goes onto the film strip
    const t = document.createElement('canvas'); t.width = 72; t.height = 48;
    try { t.getContext('2d').drawImage(kit.cv, 0, 0, kit.cv.width, kit.cv.height, 0, 0, 72, 48); } catch {}
    roll.push({c: t, ok, k: 0});
    shot++;
    if (ok) { good++; kit.score(good); kit.chime(good + 2); kit.pop(best ? 'สวยมาก!' : 'คมชัด', kit.W / 2, kit.H * .3); kit.say(`ภาพสวย ${good} จาก ${NEED}`); }
    else { kit.pop(b >= SHARP ? 'เบลอ' : 'หลุดกรอบ', kit.W / 2, kit.H * .3); kit.tone(200, .2, 'triangle', .05, .7); kit.say(b >= SHARP ? 'ภาพเบลอ' : 'ภาพหลุดกรอบ'); }
    if (good >= NEED) { setTimeout(() => kit.win(), 500); return; }
    if (shot >= SHOTS) setTimeout(() => kit.lose(`ภาพสวย ${good}/${NEED}`), 600);
  }

  function view() {
    const {W, H} = kit, img = P.img, iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const [dx, dy] = offAt(st), b = blurAt(st);
    const s = Math.max(W / iw, H / ih) * 1.3, dw = iw * s, dh = ih * s;
    const x = (W - dw) / 2 + dx * W, y = (H - dh) / 2 + dy * H;
    // out of focus: draw small, then scale up (soft on every browser, no filter needed)
    const k = b < .03 ? 1 : 1 / (1 + b * b * 16);
    if (k >= 1) ctx.drawImage(img, x, y, dw, dh);
    else {
      off.width = Math.max(8, Math.round(W * k)); off.height = Math.max(6, Math.round(H * k));
      ox.imageSmoothingQuality = 'high';
      ox.drawImage(img, x * k, y * k, dw * k, dh * k);
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H);
    }
    return {sx: W / 2 + dx * W, sy: H / 2 + dy * H, b, d: Math.hypot(dx, dy)};
  }
  function corners(x, y, w, h, l, color, lw = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { ctx.moveTo(cx, cy + sy * l); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * l, cy); }
    ctx.stroke();
  }

  return {
    // for tests: whether a shot now (and a moment from now) would be a good one
    hook: {get ready() { return !!P && wait <= 0 && goodAt(st) && goodAt(st + .12); }, get shots() { return shot; }, get good() { return good; }},
    reset() { shot = 0; good = 0; st = 0; roll = []; flash = 0; blades = 0; wait = 0; P = params(); },
    update(dt) {
      st += dt;
      flash = Math.max(0, flash - dt * 5); blades = Math.max(0, blades - dt * 7);
      roll.forEach(r => { r.k = Math.min(1, r.k + dt * 2.5); });
      if (wait > 0) { wait -= dt; if (wait <= 0 && shot < SHOTS && good < NEED) { P = params(); st = 0; } }
    },
    draw() {
      const {W, H} = kit;
      if (!P) P = params();
      ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
      const V = view();
      // the lens: a vignette and a cool grade toward the style's light
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
      vg.addColorStop(0, 'rgba(5,6,10,0)'); vg.addColorStop(1, 'rgba(5,6,10,.78)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(kit.deep, .18); ctx.fillRect(0, 0, W, H);
      // thirds
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(W * f, 0); ctx.lineTo(W * f, H); ctx.moveTo(0, H * f); ctx.lineTo(W, H * f); }
      ctx.stroke();
      const sharp = V.b < SHARP, framed = V.d < FRAMED, ready = sharp && framed && wait <= 0;
      // the centre frame, and the box that follows the subject
      const fw = W * .3, fh = H * .34;
      ctx.save(); ctx.shadowColor = kit.neon; ctx.shadowBlur = ready ? 14 : 0;
      corners(W / 2 - fw / 2, H / 2 - fh / 2, fw, fh, 16, framed ? kit.neon : 'rgba(255,255,255,.6)');
      const tb = Math.min(W, H) * .11;
      corners(V.sx - tb / 2, V.sy - tb / 2, tb, tb, 7, ready ? '#7dffb0' : sharp ? kit.neon : 'rgba(255,255,255,.75)', 1.6);
      ctx.restore();
      // focus meter: the needle crosses the mark at the sharp moment
      const my = H - 50, mw = Math.min(W * .5, 260), mx = W / 2 - mw / 2, needle = Math.sin(P.w * st + P.phi);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 20; i++) { const x = mx + mw * i / 20; ctx.beginPath(); ctx.moveTo(x, my - (i % 5 ? 3 : 6)); ctx.lineTo(x, my + (i % 5 ? 3 : 6)); ctx.stroke(); }
      ctx.fillStyle = sharp ? '#7dffb0' : kit.neon; ctx.beginPath(); ctx.moveTo(W / 2, my - 9); ctx.lineTo(W / 2 - 5, my - 16); ctx.lineTo(W / 2 + 5, my - 16); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = kit.neon; ctx.shadowBlur = 8; ctx.fillRect(W / 2 + needle * mw / 2 - 1.5, my - 9, 3, 18);
      ctx.restore();
      ctx.save(); ctx.font = kit.font(11, 500); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textBaseline = 'middle';
      const iy = W < 560 ? my - 24 : my; // on a narrow screen the camera line sits above the meter
      ctx.fillText('ISO 200 · 1/250 · f/2.8', 14, iy); ctx.textAlign = 'right'; ctx.fillStyle = sharp ? '#7dffb0' : 'rgba(255,255,255,.7)'; ctx.fillText(sharp ? 'AF ●' : 'AF ○', W - 14, iy);
      ctx.restore();
      // the film strip: eight frames, the ones you took filled in
      const sw = Math.min(30, (W - 40) / SHOTS - 4), sh = sw * .66, sx = W / 2 - (SHOTS * (sw + 4)) / 2, sy = H - 24;
      for (let i = 0; i < SHOTS; i++) {
        const x = sx + i * (sw + 4), r = roll[i];
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x, sy, sw, sh);
        if (r) { ctx.save(); ctx.globalAlpha = r.k; ctx.drawImage(r.c, x, sy - (1 - r.k) * 30, sw, sh); ctx.restore(); ctx.fillStyle = r.ok ? '#7dffb0' : '#ff6a7a'; ctx.fillRect(x, sy + sh + 2, sw, 2); }
        else { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.strokeRect(x + .5, sy + .5, sw - 1, sh - 1); }
      }
      // the shutter: blades close and open, then the flash
      if (blades > 0) { const c = Math.sin(blades * Math.PI) * H / 2; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, c); ctx.fillRect(0, H - c, W, c); }
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * .7})`; ctx.fillRect(0, 0, W, H); }
    },
    hud() { return {label: `ภาพสวย ${good}/${NEED}`, progress: good / NEED, right: `ฟิล์ม ${SHOTS - shot}`}; },
    down() { shoot(); },
    key(k) { if (k === ' ' || k === 'Enter' || k === 'ArrowDown') shoot(); },
  };
}
