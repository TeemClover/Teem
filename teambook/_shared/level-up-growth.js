/* TeamBook growth celebration
   A level is earned inside a notebook, so the celebration belongs there too.
   The server writes MEMBER_LEVEL_UP into the book and a level_up log entry;
   this client layer gives the person who grew one quiet, celebratory popup. */

import { getParty, partyIdentity } from './store.js';

const MARK_PREFIX = 'teambook_level_up_seen_v1:';
let openPromise = null;

function codeFromLocation() {
  return String(new URLSearchParams(location.search).get('c') || '').toUpperCase();
}

function eventKey(code, event) {
  const toLevel = Number(event?.data?.toLevel || 0);
  return `${MARK_PREFIX}${code}:${event?.actorId || 'me'}:${toLevel}`;
}

function wasShown(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}

function markShown(key) {
  try { localStorage.setItem(key, '1'); } catch {}
}

function cleanLevelUp(value) {
  if (!value || typeof value !== 'object') return null;
  const fromLevel = Math.max(1, Math.min(3, Number(value.fromLevel || 0)));
  const toLevel = Math.max(2, Math.min(4, Number(value.toLevel || 0)));
  if (!Number.isFinite(fromLevel) || !Number.isFinite(toLevel) || toLevel !== fromLevel + 1) return null;
  return {
    fromLevel,
    toLevel,
    capacity: Math.max(1, Math.min(4, Number(value.capacity || toLevel))),
    flavor: String(value.flavor || '').trim(),
    nextQuest: String(value.nextQuest || '').trim(),
    congratulations: String(value.congratulations || '').trim(),
  };
}

function styles() {
  if (document.getElementById('tb-level-up-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-level-up-style';
  style.textContent = `
    .tb-level-up-backdrop{position:fixed;inset:0;z-index:190;background:rgba(34,28,18,.58);backdrop-filter:blur(4px);display:grid;place-items:center;padding:20px}
    .tb-level-up-card{width:min(92vw,520px);border:1px solid rgba(119,91,37,.24);border-radius:26px;background:#fffaf0;box-shadow:0 26px 90px rgba(27,20,8,.28);padding:28px 24px 22px;text-align:center;color:#292219;position:relative;overflow:hidden}
    .tb-level-up-card:before{content:'';position:absolute;inset:0 0 auto;height:7px;background:linear-gradient(90deg,#ddc98f,#7e9f70,#dfc172)}
    .tb-level-up-kicker{margin:2px 0 8px;font-size:12px;letter-spacing:.14em;font-weight:800;color:#7d6a43}
    .tb-level-up-title{margin:0;font-size:clamp(25px,7vw,34px);line-height:1.12}
    .tb-level-up-levels{display:flex;justify-content:center;align-items:center;gap:12px;margin:20px 0 14px;font-weight:900}
    .tb-level-up-levels b{display:grid;place-items:center;width:72px;height:72px;border-radius:22px;background:#f4ead0;border:1px solid rgba(119,91,37,.2);font-size:23px}
    .tb-level-up-levels span{font-size:25px;color:#8b7447}
    .tb-level-up-flavor{font-size:17px;line-height:1.65;margin:0 auto 18px;max-width:420px;color:#40362a}
    .tb-level-up-capacity{margin:0 0 12px;padding:12px 14px;border-radius:16px;background:#edf3e8;font-weight:800;color:#355137}
    .tb-level-up-next{margin:0 0 20px;padding:13px 14px;border-radius:16px;border:1px dashed rgba(119,91,37,.33);font-size:14px;line-height:1.55;color:#62543b;text-align:left}
    .tb-level-up-next b{display:block;margin-bottom:3px;color:#3d3426}
    .tb-level-up-btn{appearance:none;border:0;border-radius:999px;background:#2f4b34;color:#fff;font:inherit;font-weight:800;min-height:48px;padding:0 24px;cursor:pointer}
    .tb-level-up-note{font-size:12px;color:#8b7b61;margin:12px 0 0}
    @media(max-width:520px){.tb-level-up-card{padding:26px 18px 20px;border-radius:22px}.tb-level-up-levels b{width:64px;height:64px;border-radius:19px}}
    @media(prefers-reduced-motion:no-preference){.tb-level-up-card{animation:tbLevelIn .34s ease-out both}@keyframes tbLevelIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}}
  `;
  document.head.appendChild(style);
}

function showLevelUp(raw, marker = '') {
  const info = cleanLevelUp(raw);
  if (!info) return Promise.resolve();
  if (marker && wasShown(marker)) return Promise.resolve();
  if (openPromise) return openPromise;
  styles();

  openPromise = new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'tb-level-up-backdrop';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `ยินดีด้วย Level ${info.toLevel}`);
    const maxed = info.toLevel >= 4;
    overlay.innerHTML = `
      <section class="tb-level-up-card">
        <p class="tb-level-up-kicker">TEAMBOOK · LEVEL UP</p>
        <h2 class="tb-level-up-title">ยินดีด้วย<br>คุณเติบโตขึ้นอีกขั้น</h2>
        <div class="tb-level-up-levels" aria-label="Level ${info.fromLevel} ไป Level ${info.toLevel}">
          <b>Lv.${info.fromLevel}</b><span>→</span><b>Lv.${info.toLevel}</b>
        </div>
        <p class="tb-level-up-flavor"></p>
        <p class="tb-level-up-capacity">ตอนนี้คุณสร้างสมุดเองได้พร้อมกัน ${info.capacity} เล่ม</p>
        <div class="tb-level-up-next"><b>${maxed ? 'ตอนนี้คุณมาถึงขอบเขตสูงสุดแล้ว' : 'ทางเติบโตต่อไป'}</b><span></span></div>
        <button class="tb-level-up-btn" type="button">${maxed ? 'เก็บช่วงเวลานี้ไว้' : 'ไปต่อกัน'}</button>
        <p class="tb-level-up-note">การเติบโตครั้งนี้เกิดขึ้นในสมุดเล่มนี้ · เพื่อนในเล่มจะเห็นและร่วมยินดีได้</p>
      </section>`;
    overlay.querySelector('.tb-level-up-flavor').textContent = info.flavor || 'TeamBook จำช่วงเวลาที่พาคุณมาถึงตรงนี้ไว้แล้ว';
    overlay.querySelector('.tb-level-up-next span').textContent = info.nextQuest || (maxed
      ? 'Level 4 คือระดับสูงสุดของ TeamBook ในตอนนี้'
      : 'กลับมาเขียนเรื่องถัดไปเมื่อพร้อม');
    const close = () => {
      if (marker) markShown(marker);
      overlay.remove();
      const done = resolve;
      openPromise = null;
      done();
    };
    overlay.querySelector('button').addEventListener('click', close, { once: true });
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.body.appendChild(overlay);
    overlay.querySelector('button').focus();
  });
  return openPromise;
}

function findOwnCachedLevelUp() {
  const code = codeFromLocation();
  if (!code) return null;
  const party = getParty(code);
  const myId = partyIdentity(code)?.userId;
  if (!party || !myId || !Array.isArray(party.events)) return null;
  const events = party.events
    .filter(event => event?.type === 'MEMBER_LEVEL_UP' && event.actorId === myId && event.data?.toLevel)
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const event = events.find(item => !wasShown(eventKey(code, item)));
  return event ? { info: event.data, marker: eventKey(code, event) } : null;
}

async function showCachedLevelUp() {
  const found = findOwnCachedLevelUp();
  if (found) await showLevelUp(found.info, found.marker);
}

addEventListener('teambook:level-up', event => {
  const code = String(event.detail?.code || codeFromLocation());
  const info = event.detail?.levelUp;
  const synthetic = { actorId: partyIdentity(code)?.userId || 'me', data: info };
  void showLevelUp(info, eventKey(code, synthetic));
});

/* A member who did not press “ปิดเล่ม” still deserves the celebration when
   they return. The canonical MEMBER_LEVEL_UP event is already in the cached
   party after refresh; check a few calm times while the page hydrates. */
setTimeout(showCachedLevelUp, 450);
setTimeout(showCachedLevelUp, 1400);
setTimeout(showCachedLevelUp, 3200);
