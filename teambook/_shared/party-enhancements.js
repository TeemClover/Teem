import { AVATAR_BY_ID } from './avatars.js';
import { getParty, getProfile, partyIdentity } from './store.js';

const code = new URLSearchParams(location.search).get('c');
const ACTIVE_STATES = new Set(['DRAFT', 'RECRUITING', 'STARTED', 'ACTIVE']);
const COLOR_TH = Object.freeze({ red: 'แดง', green: 'เขียว', blue: 'น้ำเงิน', silver: 'เงิน' });
const IDENTITY_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PARTY_SETTINGS_WINDOW_MS = 24 * 60 * 60 * 1000;
const FILE_EXT = /\.(?:pdf|zip|rar|7z|tar|gz|docx?|xlsx?|pptx?|csv|tsv|txt|md|json|xml|html?|css|js|jsx|ts|tsx|png|jpe?g|gif|webp|svg|heic|mp3|m4a|wav|ogg|mp4|mov|m4v|avi|webm|epub)(?:$|[?#])/i;
const URL_RE = /(?:(?:https?|ftp):\/\/|www\.)[^\s<>]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s<>]*)?/giu;
let syncing = false;
let scheduled = false;
let identityLockTimer = 0;
let partySettingsLockTimer = 0;
let questGateTimer = 0;

if (code && /^\d{5}$/.test(code)) install();

function install() {
  injectStyle();
  installLeaveButton();
  installIdentityCapture();
  installPartySettingsGuard();
  installQuestFinishGuard();
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
    #myCharacterTools.identity-locked{opacity:.78}
    #myCharacterTools.identity-locked input,#myCharacterTools.identity-locked select{cursor:not-allowed}
    #partyTools.party-settings-locked .tool-row input,
    #partyTools.party-settings-locked .tool-row select{cursor:not-allowed;opacity:.72}
    #partyTools .party-settings-lock-note{margin:0 0 12px}
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
    syncIdentityLock();
    syncPartySettingsLock();
    syncQuestFinishGate();
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
  const party = getParty(code);
  const actor = (party?.memberHistory?.length ? party.memberHistory : party?.members || []).find(member => member.userId === event?.actorId);
  switch (String(event?.type || '')) {
    case 'PARTY_CREATED': return data.alias ? `${data.alias} เปิดสมุดนี้` : 'สมุดถูกสร้างขึ้น';
    case 'MEMBER_JOINED': return `${data.alias || 'สมาชิก'} เข้าร่วมสมุด`;
    case 'MEMBER_LEFT': return `${data.alias || 'สมาชิก'} ออกจากสมุด`;
    case 'MEMBER_KICKED': return `${data.alias || 'สมาชิก'} ออกจากสมุด · ถูกนำออกโดยเจ้าของสมุด`;
    case 'MEMBER_ALIAS_CHANGED': return `${data.from || 'สมาชิก'} เปลี่ยนชื่อในสมุดเป็น ${data.to || data.alias || 'ชื่อใหม่'}`;
    case 'MEMBER_AVATAR_CHANGED': {
      const alias = data.alias || 'สมาชิก';
      if (data.fromAvatar || data.toAvatar) {
        return `${alias} เปลี่ยนตัวละครจาก ${characterName(data.fromAvatar, data.fromColor)} → ${characterName(data.toAvatar, data.toColor)}`;
      }
      return `${alias} เปลี่ยนตัวละครเป็น ${characterName(data.avatar, data.avatarColor)}`;
    }
    case 'LEAD_TRANSFERRED': return `${data.to || 'สมาชิกคนถัดไป'} รับหน้าที่เจ้าของสมุดต่อจาก ${data.from || 'เจ้าของสมุดเดิม'}`;
    case 'PARTY_RENAMED': return `เปลี่ยนชื่อสมุดจาก “${data.from || ''}” → “${data.to || ''}”`;
    case 'RULE_CHANGED': return 'กติกาการลงชื่อถูกเปลี่ยน และเก็บกติกาเดิมไว้ในประวัติ';
    case 'LEAD_CARD_CHANGED': return 'เจ้าของสมุดเปลี่ยนปกสมุด';
    case 'NPC_CHANGED': return 'สมุดเปลี่ยนเพื่อนร่วมทาง';
    case 'FIRST_SEEN_REWARD_EARNED': return `${data.alias || actor?.alias || 'สมาชิก'} กด “เห็นแล้ว” ครั้งแรก · ได้การ์ด 1 ใบ`;
    case 'PARTY_COMPLETED': return 'ปิดเล่มสำเร็จ';
    case 'PARTY_DISSOLVED': return 'สมุดถูกยุบ';
    default: return '';
  }
}

function stamp(value) {
  const d = new Date(value || Date.now());
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function lockStamp(value) {
  const d = new Date(value || 0);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }) + ' น.';
}

function timeRemaining(until) {
  const remaining = Math.max(0, Number(until || 0) - Date.now());
  if (remaining <= 0) return 'หมดเวลาแล้ว';
  const totalMinutes = Math.max(1, Math.ceil(remaining / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const chunks = [];
  if (days) chunks.push(`${days} วัน`);
  if (hours) chunks.push(`${hours} ชม.`);
  if (!days && minutes) chunks.push(`${minutes} นาที`);
  return chunks.join(' ') || 'น้อยกว่า 1 นาที';
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

function absoluteHref(url) {
  return /^(?:https?|ftp):\/\//i.test(url) ? url : `https://${url}`;
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
    const href = absoluteHref(url);
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
    URL_RE.lastIndex = 0;
    if (URL_RE.test(node.nodeValue || '')) nodes.push(node);
  }
  URL_RE.lastIndex = 0;
  nodes.forEach(linkifyTextNode);
  container.dataset.linkified = '1';
}

function timelineSignature(log, events) {
  const lastPost = log[log.length - 1];
  const lastEvent = events[events.length - 1];
  return [
    log.length,
    lastPost?.seq || '',
    lastPost?.sentAt || '',
    events.length,
    lastEvent?.type || '',
    lastEvent?.at || '',
  ].join('|');
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
  const visibleEvents = (Array.isArray(party.events) ? party.events : []).filter(event => eventText(event));
  const signature = timelineSignature(log, visibleEvents);
  if (box.dataset.xtyTimelineSignature === signature
      && box.querySelectorAll(':scope > .party-event').length === visibleEvents.length) return;

  const entries = posts.map((node, index) => ({
    at: new Date(log[index]?.sentAt || 0).getTime(),
    order: index * 2 + 1,
    node,
  }));
  const events = visibleEvents.map((event, index) => ({
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
  box.dataset.xtyTimelineSignature = signature;
  syncing = false;
}

function currentToken() {
  try {
    const map = JSON.parse(localStorage.getItem('teambook_book_tokens_v1') || '{}');
    const entry = map?.[code];
    return typeof entry === 'string' ? entry : (entry?.token || '');
  } catch { return ''; }
}

function rememberParty(result) {
  if (!result?.party?.code) return;
  try {
    const list = JSON.parse(localStorage.getItem('teambook_books_v1') || '[]');
    const parties = Array.isArray(list) ? list : [];
    const index = parties.findIndex(item => item?.code === result.party.code);
    if (index >= 0) parties[index] = result.party;
    else parties.unshift(result.party);
    localStorage.setItem('teambook_books_v1', JSON.stringify(parties));
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
    const response = await fetch(`/api/teambook-party-finish?op=${encodeURIComponent(op)}&code=${encodeURIComponent(code)}`, {
      method: 'POST', credentials: 'same-origin', headers,
      body: JSON.stringify({ ...body, profileId: getProfile()?.id || '' }),
    });
    const result = await response.json().catch(() => ({}));
    return response.ok ? result : { ...result, error: result.error || `HTTP_${response.status}` };
  } catch {
    return { ok: false, error: 'OFFLINE' };
  }
}

function identityLockState(party, member) {
  const source = member?.role === 'lead'
    ? (party?.createdAt || member?.joinedAt)
    : (member?.joinedAt || party?.createdAt);
  const anchor = new Date(source || 0).getTime();
  const lockedAt = Number.isFinite(anchor) && anchor > 0 ? anchor + IDENTITY_EDIT_WINDOW_MS : 0;
  return { lockedAt, locked: !lockedAt || Date.now() >= lockedAt };
}

function syncIdentityLock() {
  const tools = document.getElementById('myCharacterTools');
  if (!tools) return;
  const party = getParty(code);
  const identity = partyIdentity(code);
  const member = party?.members?.find(item => item.userId === identity?.userId);
  if (!party || !member) return;

  const state = identityLockState(party, member);
  const alias = document.getElementById('myAliasInput');
  const avatar = document.getElementById('myAvatarSelect');
  const color = document.getElementById('myColorSelect');
  const button = document.getElementById('saveMyCharacter');
  const summary = tools.querySelector('summary');
  const note = tools.querySelector('.whisper');
  tools.classList.toggle('identity-locked', state.locked);
  if (alias) alias.disabled = state.locked;
  if (avatar) avatar.disabled = state.locked;
  if (color) color.disabled = state.locked;
  if (button) button.disabled = state.locked;
  if (summary) summary.textContent = state.locked ? 'ตัวละครของฉันในสมุดนี้ · ล็อกแล้ว' : 'ตัวละครของฉันในสมุดนี้';
  if (note) {
    note.textContent = state.locked
      ? `ครบ 24 ชม. แล้ว · ชื่อและสัตว์ถูกล็อกตั้งแต่ ${lockStamp(state.lockedAt)} เพื่อให้ตัวละครต่อเนื่องจนปิดเล่ม`
      : `เหลือเวลาเปลี่ยนได้อีก ${timeRemaining(state.lockedAt)} · เปลี่ยนได้ถึง ${lockStamp(state.lockedAt)}`;
  }

  if (identityLockTimer) clearTimeout(identityLockTimer);
  identityLockTimer = 0;
  if (!state.locked && state.lockedAt) {
    const untilLock = Math.max(100, state.lockedAt - Date.now() + 50);
    identityLockTimer = setTimeout(syncIdentityLock, Math.min(60000, untilLock));
  }
}

function partySettingsLockState(party) {
  const anchor = new Date(party?.createdAt || party?.startAt || 0).getTime();
  const lockedAt = Number.isFinite(anchor) && anchor > 0 ? anchor + PARTY_SETTINGS_WINDOW_MS : 0;
  return { lockedAt, locked: !lockedAt || Date.now() >= lockedAt };
}

function syncPartySettingsLock() {
  const tools = document.getElementById('partyTools');
  if (!tools || tools.hidden) return;
  const party = getParty(code);
  if (!party) return;
  const identity = partyIdentity(code);
  const member = party?.members?.find(item => item.userId === identity?.userId);
  if (!member || member.role !== 'lead') return;

  const state = partySettingsLockState(party);
  const summary = tools.querySelector('summary');
  let note = tools.querySelector('.party-settings-lock-note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'whisper party-settings-lock-note';
    const first = tools.querySelector('.whisper');
    if (first) first.insertAdjacentElement('afterend', note);
    else summary?.insertAdjacentElement('afterend', note);
  }
  tools.classList.toggle('party-settings-locked', state.locked);
  if (summary) summary.textContent = state.locked ? 'จัดการสมุด · ตั้งค่าล็อกแล้ว' : 'จัดการสมุด';
  if (note) {
    note.textContent = state.locked
      ? `ตั้งค่าหลักของสมุดล็อกตั้งแต่ ${lockStamp(state.lockedAt)} · สมาชิกยังจัดการได้ และปิดสมุดได้ตามปกติ`
      : `เหลือเวลาแก้ชื่อสมุด กติกา ปก และเพื่อนร่วมทาง อีก ${timeRemaining(state.lockedAt)} · เปลี่ยนได้ถึง ${lockStamp(state.lockedAt)}`;
  }

  const settingIds = ['renameInput', 'ruleInput', 'leadSelect', 'npcSelect', 'renameBtn', 'ruleBtn', 'leadBtn', 'npcBtn'];
  settingIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = state.locked;
  });

  if (partySettingsLockTimer) clearTimeout(partySettingsLockTimer);
  partySettingsLockTimer = 0;
  if (!state.locked && state.lockedAt) {
    const untilLock = Math.max(100, state.lockedAt - Date.now() + 50);
    partySettingsLockTimer = setTimeout(syncPartySettingsLock, Math.min(60000, untilLock));
  }
}

function installPartySettingsGuard() {
  const guarded = new Set(['renameBtn', 'ruleBtn', 'leadBtn', 'npcBtn']);
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('button');
    if (!button || !guarded.has(button.id)) return;
    const party = getParty(code);
    if (!party || !partySettingsLockState(party).locked) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    syncPartySettingsLock();
    toast('ตั้งค่าสมุดล็อกแล้วหลังครบ 24 ชม.');
  }, true);
}

function strictQuestGate(party) {
  const start = new Date(party?.startAt || party?.startedAt || party?.createdAt || 0).getTime();
  const durationDays = Math.max(1, Number(party?.durationDays || 7));
  const fullDurationEnd = Number.isFinite(start) && start > 0 ? start + durationDays * 86400000 : 0;
  const stored = new Date(party?.scheduledEndAt || 0).getTime();
  const endAt = Math.max(fullDurationEnd, Number.isFinite(stored) ? stored : 0);
  return { durationDays, endAt, eligible: !!endAt && Date.now() >= endAt };
}

function syncQuestFinishGate() {
  const party = getParty(code);
  const panel = document.getElementById('questFinishPanel');
  const button = document.getElementById('completeParty');
  const copy = document.getElementById('completeGate');
  if (!party || !panel || !button || panel.hidden) return;
  const state = strictQuestGate(party);
  const active = ACTIVE_STATES.has(String(party.state || '').toUpperCase());
  button.disabled = !active || !state.eligible;
  button.classList.toggle('quest-locked', !state.eligible);
  if (state.eligible) {
    button.textContent = 'ปิดเล่ม';
    if (copy) copy.textContent = `ครบ ${state.durationDays} วันเต็มแล้ว · กดปิดเล่มเพื่อรับการ์ดได้`;
  } else {
    button.textContent = `ปิดเล่ม · ต้องอยู่ครบ ${state.durationDays} วัน`;
    if (copy) copy.textContent = `ต้องอยู่ครบ ${state.durationDays} วันเต็ม · กดได้ ${lockStamp(state.endAt)}`;
  }

  if (questGateTimer) clearTimeout(questGateTimer);
  questGateTimer = 0;
  if (!state.eligible && state.endAt) {
    const untilEnd = Math.max(100, state.endAt - Date.now() + 50);
    questGateTimer = setTimeout(syncQuestFinishGate, Math.min(60000, untilEnd));
  }
}

function installQuestFinishGuard() {
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('#completeParty');
    if (!button) return;
    const party = getParty(code);
    if (!party || strictQuestGate(party).eligible) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    syncQuestFinishGate();
    toast(`ต้องอยู่ครบ ${strictQuestGate(party).durationDays} วันก่อนปิดเล่ม`);
  }, true);
}

function installIdentityCapture() {
  document.addEventListener('click', async event => {
    const button = event.target?.closest?.('#saveMyCharacter');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const party = getParty(code);
    const identity = partyIdentity(code);
    const member = party?.members?.find(item => item.userId === identity?.userId);
    if (!party || !member || identityLockState(party, member).locked) {
      syncIdentityLock();
      toast('ชื่อและสัตว์ล็อกแล้วหลังครบ 24 ชม.');
      return;
    }
    button.disabled = true;
    const result = await callMemberAction('identity-v2', {
      alias: document.getElementById('myAliasInput')?.value || '',
      avatar: document.getElementById('myAvatarSelect')?.value || '',
      avatarColor: document.getElementById('myColorSelect')?.value || 'green',
    });
    button.disabled = false;
    if (result.error === 'IDENTITY_LOCKED') {
      syncIdentityLock();
      toast('ครบ 24 ชม. แล้ว · ชื่อและสัตว์ถูกล็อก');
      return;
    }
    if (result.error) { toast('ยังเปลี่ยนตัวละครสมุดนี้ไม่ได้'); return; }
    rememberParty(result);
    toast('เปลี่ยนตัวละครแล้ว · เก็บไว้ในเรื่องในสมุด');
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
  note.textContent = 'สมาชิกออกจากสมุดได้ทุกเมื่อ · สิ่งที่เคยลงชื่อและข้อความจะยังอยู่ในประวัติสมุด';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn ghost';
  button.id = 'leavePartySelf';
  button.textContent = 'ออกสมุด';
  zone.append(note, button);
  tools.insertAdjacentElement('afterend', zone);

  let armed = false;
  button.addEventListener('click', async () => {
    if (!armed) {
      armed = true;
      button.textContent = 'แน่ใจ? กดอีกครั้งเพื่อออกสมุด';
      setTimeout(() => {
        if (!armed) return;
        armed = false;
        button.textContent = 'ออกสมุด';
      }, 5000);
      return;
    }
    armed = false; button.disabled = true; button.textContent = 'กำลังออกสมุด…';
    const result = await callMemberAction('leave-v2');
    if (result.error === 'LEAD_CANNOT_LEAVE') {
      button.disabled = false; button.textContent = 'ออกสมุด';
      syncLeaveVisibility();
      toast('เจ้าของสมุดออกสมุดไม่ได้ · ถ้าไม่ใช้สมุดนี้ให้ปิดสมุด');
      return;
    }
    if (result.error) {
      button.disabled = false; button.textContent = 'ออกสมุด';
      toast('ยังออกสมุดไม่ได้');
      return;
    }
    clearLocalParty();
    location.replace('/');
  });
}

function syncLeaveVisibility() {
  const zone = document.getElementById('leavePartyZone');
  if (!zone) return;
  const party = getParty(code);
  const identity = partyIdentity(code);
  const member = party?.members?.find(item => item.userId === identity?.userId);
  zone.hidden = !(party && ACTIVE_STATES.has(String(party.state || '').toUpperCase()) && member && member.role !== 'lead');
}

function clearLocalParty() {
  try {
    const map = JSON.parse(localStorage.getItem('teambook_book_tokens_v1') || '{}');
    if (map && typeof map === 'object') {
      delete map[code];
      localStorage.setItem('teambook_book_tokens_v1', JSON.stringify(map));
    }
  } catch {}
  try {
    const list = JSON.parse(localStorage.getItem('teambook_books_v1') || '[]');
    const parties = Array.isArray(list) ? list.filter(item => item?.code !== code) : [];
    localStorage.setItem('teambook_books_v1', JSON.stringify(parties));
  } catch {}
}
