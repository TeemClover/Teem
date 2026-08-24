/* Anonymous Seen for the read-only Public detail route. This module owns only
   the panel; Home, onboarding and create defaults have their own owners. */
import { getProfile } from './store.js';

const WITNESS_KEY = 'teambook_public_witness_v13';
let mounting = false;
let mounted = false;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function witnessToken() {
  let value = '';
  try { value = localStorage.getItem(WITNESS_KEY) || ''; } catch {}
  if (value.length >= 12) return value;
  try {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    value = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch { value = `${Date.now()}-${Math.random()}-${Math.random()}`; }
  try { localStorage.setItem(WITNESS_KEY, value); } catch {}
  return value;
}

function installStyle() {
  if (document.getElementById('tb-public-seen-v15-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-public-seen-v15-style';
  style.textContent = `
    .v13-public-seen-panel{margin-top:14px}.v13-witness-list{display:grid;gap:10px;margin-top:12px}
    .v13-witness-row{padding:13px;border:1px solid var(--xty-border);border-radius:15px;background:rgba(255,255,255,.65)}
    .v13-witness-row b{display:block;margin-bottom:4px}.v13-witness-row p{margin:0;color:var(--xty-muted);font-size:13px;line-height:1.55;white-space:pre-wrap}
    .v13-witness-row .btn{margin-top:10px}.v13-witness-row.is-seen{border-color:rgba(85,181,106,.42);background:rgba(85,181,106,.08)}`;
  document.head.appendChild(style);
}

async function pendingFor(code) {
  const response = await fetch(`/api/teambook-public-seen?code=${encodeURIComponent(code)}`, {
    credentials: 'same-origin', headers: { accept: 'application/json' }, cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'PUBLIC_SEEN_LOAD_FAILED');
  return data.pending || [];
}

async function markSeen(code, item, row, button) {
  button.disabled = true;
  button.textContent = 'กำลังส่งรอยว่าเห็นแล้ว…';
  try {
    const response = await fetch('/api/teambook-public-seen', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code, seq: item.seq, witnessToken: witnessToken(), profileId: getProfile()?.id || '' }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages = {
        ALREADY_CONFIRMED: 'มีคนเห็นแล้ว ✓', CANNOT_CONFIRM_SELF: 'เป็นรอยของคุณเอง',
        CONFIRM_WINDOW_CLOSED: 'รอยนี้วางไว้นานแล้ว',
      };
      if (messages[data.error]) {
        row.classList.toggle('is-seen', data.error === 'ALREADY_CONFIRMED');
        button.textContent = messages[data.error];
        return;
      }
      throw new Error(data.error || 'PUBLIC_SEEN_FAILED');
    }
    row.classList.add('is-seen');
    button.textContent = 'เห็นแล้ว ✓';
    const note = document.createElement('p');
    note.className = 'whisper'; note.style.marginTop = '7px';
    note.textContent = 'รอยนี้ถูกส่งกลับเข้าไปในสมุดแล้ว';
    row.appendChild(note);
  } catch {
    button.disabled = false;
    button.textContent = 'ลองกด เห็นแล้ว อีกครั้ง';
  }
}

async function mount() {
  if (mounted) return true;
  const code = new URLSearchParams(location.search).get('c') || '';
  const joinZone = document.querySelector('.join-zone');
  const view = document.getElementById('view');
  if (!/^\d{5}$/.test(code) || !joinZone || !view || view.hidden || document.getElementById('v13PublicSeenPanel')) return false;
  if (mounting) return false;
  mounting = true;
  let pending = [];
  try { pending = await pendingFor(code); }
  catch { mounted = true; mounting = false; return true; }
  if (!pending.length) { mounted = true; mounting = false; return true; }
  installStyle();
  const panel = document.createElement('section');
  panel.className = 'card v13-public-seen-panel'; panel.id = 'v13PublicSeenPanel';
  panel.innerHTML = `<span class="label">เห็นจากข้างนอกสมุด</span><h2 style="margin:7px 0 5px;font-size:20px">มีร่องรอยที่ยังรอใครบางคนเห็น</h2><p class="whisper" style="margin:0">ไม่ต้องเข้าร่วมสมุดก็ได้ · ถ้าอยากให้เขารู้ว่ามีคนผ่านมาเห็น กด “เห็นแล้ว” ได้เลย</p><div class="v13-witness-list"></div>`;
  const list = panel.querySelector('.v13-witness-list');
  pending.forEach(item => {
    const row = document.createElement('div'); row.className = 'v13-witness-row';
    row.innerHTML = `<b>${esc(item.alias)}${item.activityLabel ? ` · ${esc(item.activityLabel)}` : ''}</b><p>${esc(item.note)}</p><button class="btn ghost sm" type="button">◎ เห็นแล้ว</button>`;
    const button = row.querySelector('button');
    button.addEventListener('click', () => markSeen(code, item, row, button));
    list.appendChild(row);
  });
  joinZone.insertAdjacentElement('beforebegin', panel);
  mounted = true;
  mounting = false;
  return true;
}

if (/^\/public\/p\/?$/.test(location.pathname)) {
  const observer = new MutationObserver(async () => { if (await mount()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  void mount();
  setTimeout(() => observer.disconnect(), 15000);
}
