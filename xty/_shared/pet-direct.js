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

async function poke(body) {
  if (!code || !body || !addressed(body)) return;
  pending = body;
  /* Let the normal message POST land first. If an in-app browser/network is
     slow, NOT_DIRECT means the server is still seeing the previous message;
     retry once rather than answering the wrong thread. */
  await sleep(650);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (pending !== body) return;
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
      if (result?.skipped !== 'NOT_DIRECT') {
        pending = '';
        return;
      }
    } catch {
      pending = '';
      return; // PET failure must never make the human message fail.
    }
    await sleep(900);
  }
  pending = '';
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
