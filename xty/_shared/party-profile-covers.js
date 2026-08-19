import { getParty, getProfile, partyIdentity, availableOwnedCards } from './store.js';
import { cardById as xtyCardById, cardDescriptorTh } from './cards.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';

const code = new URLSearchParams(location.search).get('c');
let busy = false;
let scheduled = false;

if (/^\d{5}$/.test(code || '')) install();

function unlockedCore7Ids() {
  try {
    const ids = JSON.parse(localStorage.getItem('c7:collection') || '[]');
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids)].filter(id => {
      const card = typeof id === 'string' ? core7CardById(id) : null;
      return !!card && !card.generic && String(card.id || '').startsWith('fh-');
    });
  } catch { return []; }
}

function install() {
  /* Cover management remains here, but this module deliberately never
     touches #seats anymore. In TeamBook a Book Cover and a person's
     character are two independent identities. */
  document.addEventListener('click', interceptCoverSave, true);
  const observer = new MutationObserver(schedule);
  const view = document.getElementById('view');
  if (view) observer.observe(view, { childList: true, subtree: true });
  schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    syncCoverTools();
    syncRichEvents();
  });
}

function currentToken() {
  try {
    const map = JSON.parse(localStorage.getItem('mc_xty_tokens') || '{}');
    const entry = map?.[code];
    return typeof entry === 'string' ? entry : (entry?.token || '');
  } catch { return ''; }
}

function remember(result) {
  if (!result?.party?.code) return;
  try {
    const list = JSON.parse(localStorage.getItem('mc_xty_parties') || '[]');
    const arr = Array.isArray(list) ? list : [];
    const i = arr.findIndex(item => item?.code === result.party.code);
    if (i >= 0) arr[i] = result.party;
    else arr.unshift(result.party);
    localStorage.setItem('mc_xty_parties', JSON.stringify(arr));
  } catch {}
}

async function callCover(body) {
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  const token = currentToken();
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const r = await fetch(`/api/xty-party-finish?op=cover-v2&code=${encodeURIComponent(code)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ ...body, profileId: getProfile()?.id || '' }),
    });
    const data = await r.json().catch(() => ({}));
    return r.ok ? data : { ...data, error: data.error || `HTTP_${r.status}` };
  } catch { return { error: 'OFFLINE' }; }
}

function syncCoverTools() {
  const p = getParty(code);
  const select = document.getElementById('leadSelect');
  const button = document.getElementById('leadBtn');
  if (!p || !select || !button) return;

  const me = partyIdentity(code);
  const member = p.members.find(item => item.userId === me?.userId);
  if (!member || member.role !== 'lead') return;

  /* Make the separation explicit in the management UI too. */
  const label = document.querySelector('label[for="leadSelect"]');
  if (label && label.textContent !== 'ปกสมุด') label.textContent = 'ปกสมุด';

  const core7Ids = unlockedCore7Ids();
  const signature = [p.coverType, p.coverValue, p.leadCardId, core7Ids.join(',')].join('|');
  if (select.dataset.coverV3 === signature) return;

  select.dataset.coverV3 = signature;
  select.disabled = false;
  button.disabled = false;
  select.innerHTML = '';

  const add = (value, text, selected = false) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = selected;
    select.appendChild(option);
  };

  add('v3:back', 'หลังการ์ด myClover', p.coverType === 'card_back');

  const xtyCards = availableOwnedCards({ role: 'lead', exceptPartyCode: code });
  if (p.leadCardId) {
    const current = xtyCardById(p.leadCardId);
    if (current && !xtyCards.some(card => card.cardId === current.cardId)) xtyCards.unshift(current);
  }
  xtyCards.forEach(card => add(
    `v3:xty:${card.cardId}`,
    cardDescriptorTh(card),
    p.coverType === 'card' && p.leadCardId === card.cardId,
  ));

  if (p.coverType === 'core7_card' && p.coverValue && !core7Ids.includes(p.coverValue)) {
    core7Ids.push(p.coverValue);
  }
  core7Ids.forEach(id => {
    const card = core7CardById(id);
    if (card) add(
      `v3:core7:${id}`,
      `${card.en} · ${card.th}`,
      p.coverType === 'core7_card' && p.coverValue === id,
    );
  });
}

async function interceptCoverSave(event) {
  const target = event.target?.closest?.('#leadBtn');
  if (!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (busy) return;

  const value = document.getElementById('leadSelect')?.value || '';
  let payload;
  if (value === 'v3:back') payload = { coverType: 'card_back' };
  else if (value.startsWith('v3:xty:')) payload = { coverType: 'card', leadCardId: value.slice(7) };
  else if (value.startsWith('v3:core7:')) payload = { coverType: 'core7_card', core7CardId: value.slice(9) };
  else return;

  busy = true;
  target.disabled = true;
  const result = await callCover(payload);
  busy = false;
  target.disabled = false;

  const toast = document.getElementById('toast');
  if (result.error) {
    if (toast) {
      toast.textContent = result.error === 'CARD_IN_USE'
        ? 'การ์ดใบนี้กำลังใช้กับสมุดอื่นอยู่'
        : 'ยังเปลี่ยนปกสมุดไม่ได้';
      toast.classList.add('on');
      setTimeout(() => toast.classList.remove('on'), 2800);
    }
    return;
  }

  remember(result);
  location.reload();
}

function dataOf(event) {
  return event?.data && typeof event.data === 'object' ? event.data : {};
}

function richText(event) {
  const data = dataOf(event);
  if (event.type === 'PARTY_CREATED' && data.coverName) {
    return `${data.alias || 'เจ้าของสมุด'} เปิดสมุดนี้ · ใช้ ${data.coverName} เป็นปกสมุด`;
  }
  if (event.type === 'LEAD_CARD_CHANGED') {
    return `${data.alias || 'เจ้าของสมุด'} เปลี่ยนปกสมุดจาก ${data.fromName || data.from || 'ใบเดิม'} → ${data.toName || data.to || 'ใบใหม่'}`;
  }
  return '';
}

function syncRichEvents() {
  const p = getParty(code);
  if (!p) return;
  const events = (p.events || []).filter(event => richText(event));
  const counters = new Map();

  document.querySelectorAll('#log > .party-event').forEach(node => {
    const type = node.dataset.event || '';
    const n = counters.get(type) || 0;
    const matches = events.filter(event => event.type === type);
    const event = matches[n];
    counters.set(type, n + 1);
    if (!event) return;

    const copy = node.querySelector('.event-copy');
    const text = richText(event);
    if (copy && copy.textContent !== text) copy.textContent = text;
  });
}
