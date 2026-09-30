// B / Build — scroll-scrubbed films. Two silent clips, one decoder at a time, native scroll is the only clock.
// Contract: seeking never blocks scroll. One seek in flight, newest target wins, <= ~32 ms cadence.
// Failure of any asset (network, decode, missing file) leaves the WebGL stage / SVG fallbacks in charge.
import { clamp, sstep } from './gl.js?v=journey2';

const SEEK_MS = 32;
const SEEK_STALL_MS = 400;
const EPS = 0.02;

const FILMS = [
  {
    id: 'film1', a: 0, b: 1.95,
    desktop: 'assets/build-assembly.mp4', mobile: 'assets/build-assembly-mobile.mp4', poster: 'assets/build-assembly-poster.jpg',
    env: (T) => 1 - sstep(1.72, 1.98, T),
    wantLoad: (T) => T < 2.4, wantRelease: (T) => T > 3.0,
  },
  {
    id: 'film2', a: 5, b: 5.99,
    desktop: 'assets/build-life.mp4', mobile: 'assets/build-life-mobile.mp4', poster: 'assets/build-life-poster.jpg',
    env: (T) => sstep(4.97, 5.25, T) * (1 - sstep(6.0, 6.35, T)),
    wantLoad: (T) => T > 3.9 && T < 6.5, wantRelease: (T) => T < 3.3 || T > 6.6,
  },
];

export function createFilms({ compact }) {
  const list = [];
  for (const cfg of FILMS) {
    const el = document.getElementById(cfg.id);
    if (!el) continue;
    const vid = el.querySelector('video'), img = el.querySelector('img');
    const f = { cfg, el, vid, img, state: 'idle', dur: 0, target: 0, inflight: false, seekAt: 0, live: false, posterOk: false, vis: 0, key: '' };
    vid.muted = true; vid.defaultMuted = true; vid.playsInline = true; vid.preload = 'auto';
    vid.addEventListener('loadedmetadata', () => { if (Number.isFinite(vid.duration) && vid.duration > 0) f.dur = vid.duration; });
    vid.addEventListener('loadeddata', () => { if (f.state === 'loading') { f.state = 'ready'; f.live = vid.readyState >= 2; } });
    vid.addEventListener('seeked', () => { f.inflight = false; f.live = vid.readyState >= 2; });
    vid.addEventListener('error', () => { if (f.state === 'loading' || f.state === 'ready') fail(f); });
    img?.addEventListener('load', () => { f.posterOk = true; });
    img?.addEventListener('error', () => { f.posterOk = false; });
    list.push(f);
  }

  function fail(f) { release(f); f.state = 'failed'; }
  function load(f) {
    if (f.state !== 'idle') return;
    f.state = 'loading';
    if (f.img && !f.img.getAttribute('src')) f.img.src = f.cfg.poster;
    f.vid.src = compact() ? f.cfg.mobile : f.cfg.desktop;
    f.vid.load();
  }
  function release(f) {
    if (f.state === 'idle') return;
    try { f.vid.pause(); } catch (e) { /* ignore */ }
    f.vid.removeAttribute('src'); f.vid.load();
    f.state = 'idle'; f.live = false; f.inflight = false; f.dur = 0;
  }
  function seek(f, T, now) {
    if (!f.live || !f.dur) return;
    const u = clamp((T - f.cfg.a) / (f.cfg.b - f.cfg.a));
    f.target = u * Math.max(0, f.dur - 0.04);
    if (f.inflight && now - f.seekAt > SEEK_STALL_MS) f.inflight = false;
    if (f.inflight || now - f.seekAt < SEEK_MS || Math.abs(f.vid.currentTime - f.target) < EPS) return;
    f.inflight = true; f.seekAt = now;
    try { f.vid.currentTime = f.target; } catch (e) { f.inflight = false; }
  }

  // enabled=false (reading mode, reduced motion, hidden tab): nothing decodes.
  function update(T, dt, now, enabled) {
    const out = { opaque: 0, live: false, ops: [] };
    for (const f of list) {
      if (!enabled) release(f);
      else {
        if (f.state === 'idle' && f.cfg.wantLoad(T)) load(f);
        else if (f.state !== 'idle' && f.cfg.wantRelease(T)) release(f);
      }
      const usable = enabled && f.state !== 'failed' && (f.live || (f.posterOk && f.state !== 'idle'));
      const env = f.cfg.env(T);
      const target = usable ? 1 : 0;
      f.vis = target;
      if (Math.abs(f.vis - target) < 0.004) f.vis = target;
      if (enabled && f.live && env > 0.001) seek(f, T, now);
      const op = env * f.vis;
      if (f.cfg.id === 'film2') f.el.style.setProperty('--film-x', (45 + 39 * sstep(5.24, 5.76, T)).toFixed(2) + '%');
      out.ops.push(op);
      const key = op.toFixed(3) + (f.live ? 'L' : 'p');
      if (key !== f.key) {
        f.key = key;
        f.el.style.setProperty('--fo', op.toFixed(3));
        f.el.style.setProperty('--fv', op > 0.002 ? 'visible' : 'hidden');
        f.el.classList.toggle('is-live', f.live);
      }
      if (usable && op > out.opaque) { out.opaque = op; out.live = true; }
    }
    return out;
  }
  function pause() { for (const f of list) { try { f.vid.pause(); } catch (e) { /* ignore */ } } }
  return { update, pause, list, releaseAll() { list.forEach(release); } };
}
