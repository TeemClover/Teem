import { getParty } from './store.js';
import { avatarById } from './avatars.js';
import { cardById as xtyCardById, cardDescriptorTh } from './cards.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';

const code = new URLSearchParams(location.search).get('c');
let scheduled = false;

function coverName(party, data = {}) {
  if (data.coverName) return data.coverName;
  if (party?.coverType === 'core7_card') {
    const card = core7CardById(party.coverValue);
    return card ? `${card.en} · ${card.th}` : 'การ์ด myClover';
  }
  if (['card','legacy_card'].includes(party?.coverType)) {
    const card = xtyCardById(party.leadCardId || party.coverValue);
    return card ? cardDescriptorTh(card) : 'การ์ด XTY';
  }
  if (party?.coverType === 'avatar') {
    let snapshot = {};
    try { snapshot = JSON.parse(party.coverValue || '{}'); } catch {}
    return `การ์ดตัวละคร ${avatarById(snapshot.species).nameTh}`;
  }
  return 'หลังการ์ด myClover';
}

function createdText(party, data = {}) {
  if (data.creationLabel) return data.creationLabel;
  const alias = data.alias || party?.members?.find(member => member.role === 'lead')?.alias || 'หัวตี้';
  const name = coverName(party, data);
  if (name.startsWith('การ์ดตัวละคร ')) return `${alias} สร้างตี้ ด้วย${name}`;
  if (name.startsWith('หลังการ์ด ')) return `${alias} สร้างตี้ ด้วย${name}`;
  return `${alias} สร้างตี้ ด้วยการ์ด ${name}`;
}

function sync() {
  scheduled = false;
  if (!code) return;
  const party = getParty(code);
  const log = document.getElementById('log');
  if (!party || !log) return;

  const created = (party.events || []).find(event => event.type === 'PARTY_CREATED');
  const createdCopy = log.querySelector('.party-event[data-event="PARTY_CREATED"] .event-copy');
  if (created && createdCopy) createdCopy.textContent = createdText(party, created.data || {});

  const changes = (party.events || []).filter(event => event.type === 'LEAD_CARD_CHANGED');
  const rows = [...log.querySelectorAll('.party-event[data-event="LEAD_CARD_CHANGED"] .event-copy')];
  rows.forEach((copy, index) => {
    const data = changes[index]?.data || {};
    const from = data.fromName || data.from || 'ใบเดิม';
    const to = data.toName || data.to || 'ใบใหม่';
    copy.textContent = `หัวตี้เปลี่ยนการ์ดประจำตี้จาก ${from} → ${to}`;
  });
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(sync);
}

if (code && /^\d{5}$/.test(code)) {
  const log = document.getElementById('log');
  if (log) new MutationObserver(schedule).observe(log, { childList:true, subtree:true, characterData:true });
  schedule();
  setTimeout(schedule, 120);
}
