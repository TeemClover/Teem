/* TeamBook quick onboarding.
   A new person only chooses a name. TeamBook assigns a Starter look so they
   can open or join a book immediately; every visual choice remains editable
   later from Profile or inside a specific book. */

import { createProfile, hasProfile } from './store.js';
import { TEAMBOOK_AVATARS, AVATAR_FRAMES } from './avatars.js';

const PUBLIC_HIDDEN_KEY = 'teambook_public_home_hidden_v13';
const $ = id => document.getElementById(id);

function randomIndex(length) {
  if (length <= 1) return 0;
  try {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % length;
  } catch { return Math.floor(Math.random() * length); }
}

function randomLook() {
  const avatar = TEAMBOOK_AVATARS[randomIndex(TEAMBOOK_AVATARS.length)] || TEAMBOOK_AVATARS[0];
  const frames = Object.values(AVATAR_FRAMES);
  const frame = frames[randomIndex(frames.length)] || frames[0];
  return { avatarId: avatar?.id || 'orange_cat', avatarFrame: frame?.id || 'green' };
}

function inviteCode() {
  const code = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(code) ? code : '';
}

function nextHref() {
  const code = inviteCode();
  return code ? `/join/?c=${encodeURIComponent(code)}` : '/new/';
}

function readHref() {
  const code = inviteCode();
  return code ? `/read/?c=${encodeURIComponent(code)}` : '/read/';
}

function installStyle() {
  if ($('tb-home-onboarding-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-onboarding-v14-style';
  style.textContent = `
    .tb14-onboarding{max-width:620px;margin:0 auto;padding:8px 0 28px}
    .tb14-onboarding-card{display:grid;gap:17px;padding:clamp(22px,6vw,34px);border:1px solid var(--xty-border);border-radius:24px;background:rgba(255,254,248,.94);box-shadow:var(--shadow)}
    .tb14-count{color:var(--xty-muted);font:900 11px/1.3 var(--sans);letter-spacing:.12em}
    .tb14-onboarding-card h1{margin:0;font-size:clamp(29px,8vw,42px);line-height:1.25}
    .tb14-note{margin:0;color:var(--xty-muted);font-size:14px;line-height:1.65}
    .tb14-read{display:block;width:max-content;max-width:100%;margin:0 auto;color:var(--xty-muted);font-size:12.5px;text-decoration:underline;text-underline-offset:4px}
  `;
  document.head.appendChild(style);
}

function mount(host) {
  if (!host || host.dataset.tb14Onboarding === '1' || hasProfile()) return false;
  installStyle();
  host.dataset.tb14Onboarding = '1';
  const joining = !!inviteCode();
  host.innerHTML = `
    <div class="tb14-onboarding">
      <div class="tb14-onboarding-card">
        <span class="tb14-count">เริ่มต้น</span>
        <p class="kicker">${joining ? 'ก่อนเข้าร่วมสมุด' : 'ก่อนเปิดสมุดเล่มแรก'}</p>
        <h1>อยากให้เราเรียกคุณว่าอะไร?</h1>
        <p class="tb14-note">ไม่ต้องใช้ชื่อจริง · เปลี่ยนทีหลังได้</p>
        <div class="field" style="margin:0"><input id="tb14Alias" maxlength="24" autocomplete="nickname" placeholder="ชื่อในสมุด"></div>
        <button class="btn gold" id="tb14SaveName" type="button" disabled>${joining ? 'เข้าร่วมสมุด' : 'ไปเปิดสมุด'}</button>
        <a class="tb14-read" href="${readHref()}">TeamBook คืออะไร?</a>
      </div>
    </div>`;

  const alias = $('tb14Alias');
  const save = $('tb14SaveName');
  const sync = () => { save.disabled = !alias.value.trim(); };
  alias.addEventListener('input', sync);
  alias.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || save.disabled) return;
    event.preventDefault();
    save.click();
  });
  save.addEventListener('click', () => {
    const name = alias.value.trim();
    if (!name) return;
    save.disabled = true;
    createProfile({ alias: name, ...randomLook() });
    try { localStorage.removeItem(PUBLIC_HIDDEN_KEY); } catch {}
    location.href = nextHref();
  });
  sync();
  requestAnimationFrame(() => alias.focus());
  return true;
}

function install() {
  if (location.pathname !== '/' || hasProfile()) return;
  const host = $('identityStep');
  if (!host) return;

  const tryMount = () => {
    if (hasProfile()) return true;
    if (host.hidden) return false;
    return mount(host);
  };
  if (tryMount()) return;

  const observer = new MutationObserver(() => {
    if (!tryMount()) return;
    observer.disconnect();
  });
  observer.observe(host, { childList: true, subtree: false, attributes: true, attributeFilter: ['hidden'] });
  setTimeout(() => observer.disconnect(), 60000);
}

install();
