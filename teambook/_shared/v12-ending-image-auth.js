/* TeamBook V1.2 — authenticated Ending candidate images.
   Local profiles keep party auth in a bearer token, which a plain <img> cannot
   attach. Hydrate the member-gated image route through fetch and give the DOM
   a short-lived object URL. Account sessions work through the same path. */

import { partyIdentity } from './store.js';

function codeFromPage() {
  const code = new URLSearchParams(location.search).get('c') || '';
  return /^\d{5}$/.test(code) ? code : '';
}

async function hydrate(img, code) {
  if (!img || img.dataset.endingAuth === 'done' || img.dataset.endingAuth === 'loading') return;
  img.dataset.endingAuth = 'loading';
  const headers = { accept: 'image/*' };
  const token = partyIdentity(code)?.token || '';
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetch(img.src, { credentials: 'same-origin', headers, cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('NOT_IMAGE');
    const objectUrl = URL.createObjectURL(blob);
    const previous = img.dataset.endingObjectUrl || '';
    img.dataset.endingObjectUrl = objectUrl;
    img.dataset.endingAuth = 'done';
    img.src = objectUrl;
    if (previous) URL.revokeObjectURL(previous);
  } catch {
    img.dataset.endingAuth = 'failed';
  }
}

function scan() {
  const code = codeFromPage();
  if (!code) return;
  document.querySelectorAll('img[src*="/api/teambook-ending-image?"]').forEach(img => hydrate(img, code));
}

function install() {
  if (!/^\/p(?:\/|$)/.test(location.pathname)) return;
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}

requestAnimationFrame(install);
