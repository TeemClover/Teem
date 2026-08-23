/* TeamBook 1.4 — Home onboarding only.

   The legacy inline gate still creates its old all-at-once form as part of the
   historical index.html boot. This module watches ONLY #identityStep until that
   gate becomes visible, then replaces it once with the canonical 3-step flow.
   After replacement the observer disconnects permanently.

   Name is saved first. If the browser closes after that point, the random
   Starter + frame already make a valid lightweight profile. */

import { createProfile, getProfile, hasProfile, updateProfile } from './store.js';
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

function readHref() {
  const code = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(code) ? `/read/?c=${encodeURIComponent(code)}` : '/read/';
}

function installStyle() {
  if ($('tb-home-onboarding-v14-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-home-onboarding-v14-style';
  style.textContent = `
    .tb14-onboarding{max-width:680px;margin:0 auto;padding:8px 0 28px}
    .tb14-onboarding-card{padding:clamp(20px,5vw,30px);border:1px solid var(--xty-border);border-radius:24px;background:rgba(255,254,248,.94);box-shadow:var(--shadow)}
    .tb14-step{display:grid;gap:16px}.tb14-step[hidden]{display:none!important}
    .tb14-count{color:var(--xty-muted);font:900 11px/1.3 var(--sans);letter-spacing:.12em}
    .tb14-step h1{margin:0;font-size:clamp(28px,8vw,42px);line-height:1.28}
    .tb14-note{margin:0;color:var(--xty-muted);font-size:14px;line-height:1.7}
    .tb14-read{display:block;width:max-content;max-width:100%;margin:0 auto;color:var(--xty-muted);font-size:13px;text-decoration:underline;text-underline-offset:4px}
    .tb14-avatar-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .tb14-avatar{padding:8px;border:1px solid var(--xty-border);border-radius:16px;background:var(--xty-surface);cursor:pointer}
    .tb14-avatar img{width:100%;aspect-ratio:1;object-fit:contain}.tb14-avatar b{display:block;margin-top:5px;font-size:12px;text-align:center}
    .tb14-colors{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .tb14-color{display:flex;align-items:center;gap:10px;min-height:56px;padding:12px;border:1px solid var(--xty-border);border-radius:15px;background:var(--xty-paper);font-weight:850;cursor:pointer}
    .tb14-color i{width:24px;height:24px;border-radius:50%;background:var(--tb14-swatch);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
    @media(max-width:390px){.tb14-avatar-grid{gap:7px}.tb14-avatar{padding:6px}}
  `;
  document.head.appendChild(style);
}

function show(host, name) {
  host.querySelectorAll('.tb14-step').forEach(step => {
    step.hidden = step.dataset.step !== name;
  });
  requestAnimationFrame(() => {
    host.querySelector(`.tb14-step[data-step="${name}"] input, .tb14-step[data-step="${name}"] button`)?.focus();
  });
}

function finishProfile() {
  /* Every genuinely new profile starts with Public visible. From here on the
     user may hide it and that preference persists. */
  try { localStorage.removeItem(PUBLIC_HIDDEN_KEY); } catch {}
  location.reload();
}

function mount(host) {
  if (!host || host.dataset.tb14Onboarding === '1' || hasProfile()) return false;
  installStyle();
  host.dataset.tb14Onboarding = '1';
  host.innerHTML = `
    <div class="tb14-onboarding">
      <div class="tb14-onboarding-card">
        <section class="tb14-step" data-step="name">
          <span class="tb14-count">เริ่มต้น · 1 / 3</span>
          <p class="kicker">ยินดีต้อนรับ</p>
          <h1>อยากให้เราเรียกคุณว่าอะไร?</h1>
          <p class="tb14-note">ไม่จำเป็นต้องเป็นชื่อจริง · ใช้ชื่อที่สบายใจได้ และเปลี่ยนทีหลังได้ตลอด</p>
          <div class="field" style="margin:0"><input id="tb14Alias" maxlength="24" autocomplete="nickname" placeholder="เช่น กล้วยทอด"></div>
          <button class="btn gold" id="tb14SaveName" type="button" disabled>ใช้ชื่อนี้</button>
          <a class="tb14-read" href="${readHref()}">อ่านเรื่องของ TeamBook ก่อน →</a>
        </section>

        <section class="tb14-step" data-step="avatar" hidden>
          <span class="tb14-count">ตัวละคร · 2 / 3</span>
          <p class="kicker">เลือกตัวแทนของคุณ</p>
          <h1>วันนี้อยากเป็นตัวไหน?</h1>
          <p class="tb14-note">ตัวละครนี้เปลี่ยนทีหลังได้ และแต่ละสมุดจะใช้การ์ดคนละใบก็ได้</p>
          <div class="tb14-avatar-grid" id="tb14AvatarGrid"></div>
          <a class="tb14-read" href="${readHref()}">อ่านเรื่องของ TeamBook ต่อ →</a>
        </section>

        <section class="tb14-step" data-step="color" hidden>
          <span class="tb14-count">สี · 3 / 3</span>
          <p class="kicker">เลือกสีที่ชอบ</p>
          <h1>อยากใช้กรอบสีไหน?</h1>
          <p class="tb14-note">นี่เป็นสีของ Starter · ถ้าใช้การ์ดในภายหลัง สีจะมากับการ์ดใบนั้นเอง</p>
          <div class="tb14-colors" id="tb14ColorGrid"></div>
          <a class="tb14-read" href="${readHref()}">อ่านต่อก่อนก็ได้ →</a>
        </section>
      </div>
    </div>`;

  const alias = $('tb14Alias');
  const save = $('tb14SaveName');
  const syncName = () => { save.disabled = !alias.value.trim(); };
  alias.addEventListener('input', syncName);
  alias.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !save.disabled) {
      event.preventDefault(); save.click();
    }
  });
  save.addEventListener('click', () => {
    const name = alias.value.trim();
    if (!name) return;
    const look = randomLook();
    createProfile({ alias: name, ...look });
    show(host, 'avatar');
  });

  const avatarGrid = $('tb14AvatarGrid');
  TEAMBOOK_AVATARS.forEach(avatar => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tb14-avatar';
    button.innerHTML = `<img src="${avatar.art}" alt="" loading="lazy" decoding="async"><b>${avatar.nameTh}</b>`;
    button.setAttribute('aria-label', `เลือก ${avatar.nameTh}`);
    button.addEventListener('click', () => {
      updateProfile({ avatarId: avatar.id, avatar: avatar.id });
      show(host, 'color');
    });
    avatarGrid.appendChild(button);
  });

  const colorGrid = $('tb14ColorGrid');
  Object.values(AVATAR_FRAMES).forEach(frame => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tb14-color';
    button.style.setProperty('--tb14-swatch', frame.hex);
    button.innerHTML = `<i aria-hidden="true"></i><b>${frame.labelTh}</b>`;
    button.addEventListener('click', () => {
      updateProfile({ avatarFrame: frame.id });
      finishProfile();
    });
    colorGrid.appendChild(button);
  });

  syncName();
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

  /* renderGate() is legacy inline code and runs after first-welcome resolves.
     Observe just this one gate until it becomes visible, mount once, disconnect. */
  const observer = new MutationObserver(() => {
    if (!tryMount()) return;
    observer.disconnect();
  });
  observer.observe(host, { childList: true, subtree: false, attributes: true, attributeFilter: ['hidden'] });
  setTimeout(() => observer.disconnect(), 60000);
}

install();
