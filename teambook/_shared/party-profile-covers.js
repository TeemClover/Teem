import { getParty, getProfile, partyIdentity, ownedCards } from './store.js';
import { cardById as xtyCardById, cardDescriptorTh } from './cards.js';
import { cardCanBePartyCover } from './cover-eligibility.js';
import { TEAMBOOK_V1_PETS } from './pets.js';

const code = new URLSearchParams(location.search).get('c');
let busy = false;
let scheduled = false;

if (/^\d{5}$/.test(code || '')) install();

function install() {
  /* Book Cover and a person's character are independent identities.
     V1.2 cards may be reused across books; only same-book role collision is
     excluded from these pickers. Capture phase prevents the legacy handlers
     from re-applying the old cross-book CARD_IN_USE rule. */
  document.addEventListener('click', interceptCoverSave, true);
  document.addEventListener('click', interceptNpcSave, true);
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
    syncNpcTools();
    syncRichEvents();
  });
}

function currentToken() {
  try {
    const map = JSON.parse(localStorage.getItem('teambook_book_tokens_v1') || '{}');
    const entry = map?.[code];
    return typeof entry === 'string' ? entry : (entry?.token || '');
  } catch { return ''; }
}

function ownedCardObjects(role) {
  return ownedCards(getProfile())
    .map(entry => xtyCardById(entry.cardId))
    .filter(Boolean)
    .filter(card => role === 'partyCover' ? cardCanBePartyCover(card) : card.eligibility?.[role]);
}

async function callPlacement(action, body) {
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  const token = currentToken();
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const r = await fetch(`/api/teambook-v12?action=${encodeURIComponent(action)}&code=${encodeURIComponent(code)}`, {
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

  const label = document.querySelector('label[for="leadSelect"]');
  if (label && label.textContent !== 'ปกสมุด') label.textContent = 'ปกสมุด';

  if (p.coverType === 'avatar') {
    select.dataset.coverV12 = [p.coverType, p.coverValue, p.leadCardId].join('|');
    select.innerHTML = '<option selected>การ์ดตัวละครตอนสร้างสมุด · ล็อกแล้ว</option>';
    select.disabled = true;
    button.hidden = true;
    return;
  }
  button.hidden = false;

  const signature = [p.coverType, p.coverValue, p.leadCardId, p.npcCardId].join('|');
  if (select.dataset.coverV12 === signature) return;
  select.dataset.coverV12 = signature;
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

  add('v12:back', 'หลังการ์ด TeamBook', p.coverType === 'card_back');
  ownedCardObjects('partyCover')
    .filter(card => card.cardId !== p.npcCardId)
    .forEach(card => add(
      `v12:card:${card.cardId}`,
      cardDescriptorTh(card),
      p.coverType === 'card' && p.leadCardId === card.cardId,
    ));
}

function syncNpcTools() {
  const p = getParty(code);
  const select = document.getElementById('npcSelect');
  const button = document.getElementById('npcBtn');
  if (!p || !select || !button) return;
  const me = partyIdentity(code);
  const member = p.members.find(item => item.userId === me?.userId);
  if (!member || member.role !== 'lead') return;

  const signature = [p.npcCardId, p.petId, p.leadCardId, ownedCards(getProfile()).length].join('|');
  if (select.dataset.npcV12 === signature) return;
  select.dataset.npcV12 = signature;
  select.innerHTML = '';

  const add = (value, text, selected = false) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = selected;
    select.appendChild(option);
  };
  add('v12:none', 'ไม่มีเพื่อนร่วมทาง', !p.npcCardId && !p.petId);
  TEAMBOOK_V1_PETS.forEach(pet => add(
    `v12:pet:${pet.id}`,
    `เพื่อนร่วมทาง · ${pet.nameTh}`,
    !p.npcCardId && p.petId === pet.id,
  ));
  ownedCardObjects('npc')
    .filter(card => card.cardId !== p.leadCardId)
    .forEach(card => add(
      `v12:card:${card.cardId}`,
      `การ์ด · ${cardDescriptorTh(card)}`,
      p.npcCardId === card.cardId,
    ));
}

function showPlacementError(result) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = result.error === 'INVALID_CARD_PLACEMENT'
    ? 'การ์ดใบเดียวกันใช้เป็นทั้งปกและเพื่อนร่วมทางในสมุดเดียวกันไม่ได้'
    : result.error === 'COVER_LOCKED'
      ? 'ปกสมุด Level 1 ถูกล็อกตั้งแต่สร้างสมุดแล้ว'
      : result.error === 'CARD_NOT_OWNED'
        ? 'ไม่พบการ์ดใบนี้ในคอลเลกชันของคุณ'
        : 'ยังบันทึกการเปลี่ยนแปลงไม่ได้';
  toast.classList.add('on');
  setTimeout(() => toast.classList.remove('on'), 2800);
}

async function interceptCoverSave(event) {
  const target = event.target?.closest?.('#leadBtn');
  if (!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (busy) return;

  const value = document.getElementById('leadSelect')?.value || '';
  let payload;
  if (value === 'v12:back' || value === 'back' || value === 'v3:back') payload = { coverType: 'card_back' };
  else if (value.startsWith('v12:card:')) payload = { coverType: 'card', leadCardId: value.slice('v12:card:'.length) };
  else if (value.startsWith('v3:xty:')) payload = { coverType: 'card', leadCardId: value.slice(7) };
  else if (value && xtyCardById(value)) payload = { coverType: 'card', leadCardId: value };
  else return;

  busy = true;
  target.disabled = true;
  const result = await callPlacement('place-cover', payload);
  busy = false;
  target.disabled = false;
  if (result.error) { showPlacementError(result); return; }
  location.reload();
}

async function interceptNpcSave(event) {
  const target = event.target?.closest?.('#npcBtn');
  if (!target) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (busy) return;

  const value = document.getElementById('npcSelect')?.value || 'v12:none';
  let payload = { npcCardId: null, petId: null };
  if (value.startsWith('v12:card:')) payload = { npcCardId: value.slice('v12:card:'.length), petId: null };
  else if (value.startsWith('v12:pet:')) payload = { npcCardId: null, petId: value.slice('v12:pet:'.length) };
  else if (value.startsWith('card:')) payload = { npcCardId: value.slice(5), petId: null };
  else if (value.startsWith('pet:')) payload = { npcCardId: null, petId: value.slice(4) };

  busy = true;
  target.disabled = true;
  const result = await callPlacement('place-npc', payload);
  busy = false;
  target.disabled = false;
  if (result.error) { showPlacementError(result); return; }
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
