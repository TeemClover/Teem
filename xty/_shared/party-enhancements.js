import { AVATAR_BY_ID } from './avatars.js';
import { getParty, getProfile, partyIdentity } from './store.js';

const code = new URLSearchParams(location.search).get('c');
const ACTIVE_STATES = new Set(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const COLOR_TH = Object.freeze({ red: 'แดง', green: 'เขียว', blue: 'น้ำเงิน', silver: 'เงิน' });
const FILE_EXT = /\.(?:pdf|zip|rar|7z|tar|gz|docx?|xlsx?|pptx?|csv|tsv|txt|md|json|xml|html?|css|js|jsx|ts|tsx|png|jpe?g|gif|webp|svg|heic|mp3|m4a|wav|ogg|mp4|mov|m4v|avi|webm|epub)(?:$|[?#])/i;
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>]+/giu;
let syncing = false;
let scheduled = false;

if (code && /^\d{5}$/.test(code)) install();

function install() {
  injectStyle();
  installLeaveButton();
  installIdentityCapture();
  const log = document.getElementById('log');
  if (log) {
    const observer = new MutationObserver(scheduleSync);
    observer.observe(log, { childList: true, subtree: true });
  }
  scheduleSync();
}

function injectStyle() {
  if (document.getElementById('xty-party-enhancements-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-party-enhancements-style';
  style.textContent = `
    .post .txt a.xty-chat-link{color:#1769c2;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:2px;overflow-wrap:anywhere}
    .post .txt a.xty-chat-link:visited{color:#5a54a4}
    .party-event{display:flex;align-items:center;gap:9px;margin:1px 0;padding:7px 10px;color:var(--xty-muted);font-size:12.5px;line-height:1.5;border-left:3px solid rgba(91,141,255,.32);background:rgba(255,255,255,.48);border-radius:0 9px 9px 0}
    .party-event .event-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--xty-blue)}
    .party-event .event-copy{flex:1;min-width:0}
    .party-event .event-time{flex:none;color:var(--xty-muted);font:10px/1.2 var(--sans)}
    .leave-party-zone{margin-top:12px;padding:14px;border:1px solid rgba(228,91,91,.35);border-radius:var(--r-lg);background:rgba(255,255,255,.72)}
    .leave-party-zone .btn{min-height:46px}
  `;
  document.head.appendChild(style);
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    syncTimeline();
    syncLeaveVisibility();
  });
}

function avatarName(id) {
  return AVATAR_BY_ID[id]?.nameTh || String(id || 'ตัวละคร');
}

function characterName(avatar, color) {
  return `${avatarName(avatar)} · ${COLOR_TH[color] || color || 'เขียว'}`;
}

function eventText(event) {
  const data = event?.data && typeof event.data === 'object' ? event.data : {};
  switch (String(event?.type || '')) {
    case 'PARTY_CREATED': return data.alias ? `${data.alias} ตั้งตี้นี้` : 'ตี้ถูกสร้างขึ้น';
    case 'MEMBER_JOINED': return `${data.alias || 'สมาชิก'} เข้าร่วมตี้`;
    case 'MEMBER_LEFT': return `${data.alias || 'สมาชิก'} ออกจากตี้`;
    case 'MEMBER_KICKED': return `${data.alias || 'สมาชิก'} ออกจากตี้ · ถูกนำออกโดยหัวตี้`;
    case 'MEMBER_ALIAS_CHANGED': return `${data.from || 'สมาชิก'} เปลี่ยนชื่อในตี้เป็น ${data.to || data.alias || 'ชื่อใหม่'}`;
    case 'MEMBER_AVATAR_CHANGED': {
      const alias = data.alias || 'สมาชิก';
      if (data.fromAvatar || data.toAvatar) {
        return `${alias} เปลี่ยนตัวละครจาก ${characterName(data.fromAvatar, data.fromColor)} → ${characterName(data.toAvatar, data.toColor)}`;
      }
      return `${alias} เปลี่ยนตัวละครเป็น ${characterName(data.avatar, data.avatarColor)}`;
    }
    case 'LEAD_TRANSFERRED': return `${data.to || 'สมาชิกคนถัดไป'} รับหน้าที่หัวตี้ต่อจาก ${data.from || 'หัวตี้เดิม'}`;
    case 'PARTY_RENAMED': return `เปลี่ยนชื่อตี้จาก “${data.from || ''}” → “${data.to || ''}”`;
    case 'RULE_CHANGED': return 'กติกา Commit ถูกเปลี่ยน และเก็บกติกาเดิมไว้ในประวัติ';
    case 'LEAD_CARD_CHANGED': return 'หัวตี้เปลี่ยน Party Cover';
    case 'NPC_CHANGED': return 'ตี้เปลี่ยน PET / NPC';
    case 'PARTY_COMPLETED': return 'Quest จบสำเร็จ';
    case 'PARTY_DISSOLVED': return 'ตี้ถูกยุบ';
    default: return '';
  }
}

function stamp(value) {
  const d = new Date(value || Date.now());
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function eventNode(event) {
  const row = document.createElement('div');
  row.className = 'party-event';
  row.dataset.event = event.type || '';
  const dot = document.createElement('span'); dot.className = 'event-dot';
  const copy = document.createElement('span'); copy.className = 'event-copy'; copy.textContent = eventText(event);
  const time = document.createElement('span'); time.className = 'event-time'; time.textContent = stamp(event.at);
  row.append(dot, copy, time);
  return row;
}

function trimUrl(raw) {
  let url = raw;
  let tail = '';
  while (/[)\]}>.,!?;:'"”’]$/u.test(url)) {
    tail = url.slice(-1) + tail;
    url = url.slice(0, -1);
  }
  return { url, tail };
}

function linkifyTextNode(node) {
  const text = node.nodeValue || '';
  URL_RE.lastIndex = 0;
  let match; let last = 0; let changed = false;
  const frag = document.createDocumentFragment();
  while ((match = URL_RE.exec(text))) {
    changed = true;
    if (match.index > last) frag.append(document.createTextNode(text.slice(last, match.index)));
    const raw = match[0];
    const { url, tail } = trimUrl(raw);
    const href = url.startsWith('www.') ? `https://${url}` : url;
    const a = document.createElement('a');
    a.className = 'xty-chat-link';
    a.href = href;
    a.textContent = url;
    a.rel = 'noopener noreferrer nofollow';
    a.target = '_blank';
    if (FILE_EXT.test(href)) {
      let filename = '';
      try { filename = decodeURIComponent(new URL(href).pathname.split('/').pop() || ''); } catch {}
      a.download = filename || '';
      a.title = 'ดาวน์โหลดไฟล์';
    } else {
      a.title = 'เปิดลิงก์';
    }
    frag.append(a);
    if (tail) frag.append(document.createTextNode(tail));
    last = match.index + raw.length;
  }
  if (!changed) return;
  if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
  node.replaceWith(frag);
}

function linkify(container) {
  if (!container || container.dataset.linkified === '1') return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest('a,.tag,.reward-log-card')) continue;
    if (URL_RE.test(node.nodeValue || '')) nodes.push(node);
    URL_RE.lastIndex = 0;
  }
  nodes.forEach(linkifyTextNode);
  container.dataset.linkified = '1';
}

function syncTimeline() {
  if (syncing) return;
  const party = getParty(code);
  const box = document.getElementById('log');
  if (!party || !box) return;
  const posts = [...box.querySelectorAll(':scope > .post')];
  const log = Array.isArray(party.log) ? party.log : [];
  if (posts.length !== log.length) return;

  posts.forEach(post => linkify(post.querySelector('.txt')));
  const entries = posts.map((node, index) => ({
    at: new Date(log[index]?.sentAt || 0).getTime(),
    order: index * 2 + 1,
    node,
  }));
  const events = (Array.isArray(party.events) ? party.events : [])
    .filter(event => eventText(event))
    .map((event, index) => ({
      at: new Date(event.at || 0).getTime(),
      order: index * 2,
      node: eventNode(event),
    }));

  if (!entries.length && !events.length) return;
  const empty = box.querySelector(':scope > .empty');
  if (empty) empty.remove();
  const merged = [...entries, ...events].sort((a, b) => (a.at - b.at) || (a.order - b.order));
  syncing = true;
  box.replaceChildren(...merged.map(item => item.node));
  syncing = false;
}

function currentToken() {
  try {
    const map = JSON.parse(localStorage.getItem('mc_xty_tokens') || '{}');
    const entry = map?.[code];
    return typeof entry === 'string' ? entry : (entry?.token || '');
  } catch { return ''; }
}

function rememberParty(result) {
  if (!result?.party?.code) return;
  try {
    const list = JSON.parse(localStorage.getItem('mc_xty_parties') || '[]');
    const parties = Array.isArray(list) ? list : [];
    const index = parties.findIndex(item => item?.code === result.party.code);
    if (index >= 0) parties[index] = result.party;
    else parties.unshift(result.party);
    localStorage.setItem('mc_xty_parties', JSON.stringify(parties));
  } catch {}
}

function toast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 2800);
}

async function callMemberAction(op, body = {}) {
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  const token = currentToken();
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetch(`/api/xty-party-finish?op=${encodeURIComponent(op)}&code=${encodeURIComponent(code)}`, {
      method: 'POST', credentials: 'same-origin', headers,
      body: JSON.stringify({ ...body, profileId: getProfile()?.id || '' }),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok ? result : { ...result, error: result.error || `HTTP_${response.status}` };
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

function installIdentityCapture() {
  document.addEventListener('click', async event => {
    const button = event.target?.closest?.('#saveMyCharacter');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    const result = await callMemberAction('identity-v2', {
      alias: document.getElementById('myAliasInput')?.value || '',
      avatar: document.getElementById('myAvatarSelect')?.value || '',
      avatarColor: document.getElementById('myColorSelect')?.value || 'green',
    });
    button.disabled = false;
    if (result.error) { toast('ยังเปลี่ยนตัวละครตี้นี้ไม่ได้'); return; }
    rememberParty(result);
    toast('เปลี่ยนตัวละครแล้ว · เก็บไว้ใน Party Log');
    setTimeout(() => location.reload(), 250);
  }, true);
}

function installLeaveButton() {
  if (document.getElementById('leavePartySelf')) return;
  const tools = document.getElementById('myCharacterTools');
  if (!tools) return;
  const zone = document.createElement('div');
  zone.className = 'leave-party-zone';
  zone.id = 'leavePartyZone';
  zone.hidden = true;
  const note = document.createElement('p');
  note.className = 'whisper';
  note.style.margin = '0 0 10px';
  note.textContent = 'ออกจากตี้ได้ทุกเมื่อ · สิ่งที่เคย Commit และข้อความจะยังอยู่ในประวัติตี้';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn ghost';
  button.id = 'leavePartySelf';
  button.textContent = 'ออกตี้';
  zone.append(note, button);
  tools.insertAdjacentElement('afterend', zone);

  let armed = false;
  button.addEventListener('click', async () => {
    if (!armed) {
      armed = true;
      button.textContent = 'แน่ใจ? กดอีกครั้งเพื่อออกตี้';
      setTimeout(() => {
        if (!armed) return;
        armed = false;
        button.textContent = 'ออกตี้';
      }, 5000);
      return;
    }
    armed = false; button.disabled = true; button.textContent = 'กำลังออกตี้…';
    const result = await callMemberAction('leave-v2');
    if (result.error) {
      button.disabled = false; button.textContent = 'ออกตี้';
      toast('ยังออกตี้ไม่ได้');
      return;
    }
    clearLocalParty();
    location.replace('/xty/');
  });
}

function syncLeaveVisibility() {
  const zone = document.getElementById('leavePartyZone');
  if (!zone) return;
  const party = getParty(code);
  const identity = partyIdentity(code);
  const member = party?.members?.find(item => item.userId === identity?.userId);
  zone.hidden = !(party && ACTIVE_STATES.has(String(party.state || '').toUpperCase()) && member);
}

function clearLocalParty() {
  try {
    const map = JSON.parse(localStorage.getItem('mc_xty_tokens') || '{}');
    if (map && typeof map === 'object') {
      delete map[code];
      localStorage.setItem('mc_xty_tokens', JSON.stringify(map));
    }
  } catch {}
  try {
    const list = JSON.parse(localStorage.getItem('mc_xty_parties') || '[]');
    const parties = Array.isArray(list) ? list.filter(item => item?.code !== code) : [];
    localStorage.setItem('mc_xty_parties', JSON.stringify(parties));
  } catch {}
}
