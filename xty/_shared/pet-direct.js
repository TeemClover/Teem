/* XTY direct PET wake
   Loaded lazily only on /xty/p. Scheduled PET turns remain sparse; this
   module exists only so a human who explicitly calls the current PET by
   name does not wait up to six hours for an answer. */

import { getParty, partyIdentity } from './store.js';
import { PET_BY_ID } from './pets.js';

const code = String(new URLSearchParams(location.search).get('c') || '').trim();
let pending = '';

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function addressed(body) {
  const party = getParty(code);
  const pet = party?.petId ? PET_BY_ID[party.petId] : null;
  if (!pet) return false;
  const text = String(body || '').toLocaleLowerCase('th-TH');
  const names = [pet.nameTh];
  if (pet.id === 'cat') names.push('แมว');
  return names.some(name => text.includes(String(name).toLocaleLowerCase('th-TH')));
}

function exactHumanMessageIsLocal(body) {
  const party = getParty(code);
  const mine = partyIdentity(code)?.userId || '';
  const latestHuman = [...(party?.log || [])].reverse().find(post =>
    post.kind === 'message' && !post.retracted && (!mine || post.userId === mine));
  return String(latestHuman?.body || '').trim() === body;
}

async function waitForCanonicalMessage(body) {
  /* The capture listener fires before the page's normal send handler. Wait
     until store.js has received the canonical server response and updated the
     local party snapshot. This prevents answering an older direct message on
     a slow LINE/in-app browser connection. */
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (pending !== body) return false;
    if (exactHumanMessageIsLocal(body)) return true;
    await sleep(250);
  }
  return false;
}

async function poke(body) {
  if (!code || !body || !addressed(body)) return;
  pending = body;
  if (!await waitForCanonicalMessage(body)) {
    if (pending === body) pending = '';
    return;
  }

  const identity = partyIdentity(code);
  const headers = { accept: 'application/json', 'content-type': 'application/json' };
  if (identity?.token) headers.authorization = `Bearer ${identity.token}`;
  try {
    const response = await fetch('/api/xty-pet', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ mode: 'direct', code, text: body }),
    });
    const result = await response.json().catch(() => ({}));
    if (result?.spoke) {
      pending = '';
      /* Reuse the page's canonical refresh path so local cache + UI stay in
         sync with the server-written PET bubbles. */
      document.getElementById('refresh')?.click();
      return;
    }
  } catch {
    // PET failure must never make the human message fail.
  }
  if (pending === body) pending = '';
}

function captureComposer() {
  const body = String(document.getElementById('msg')?.value || '').trim();
  if (body && addressed(body)) void poke(body);
}

document.addEventListener('click', event => {
  if (event.target?.closest?.('#send')) captureComposer();
}, true);

document.addEventListener('keydown', event => {
  if (event.target?.id !== 'msg' || event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
  captureComposer();
}, true);
