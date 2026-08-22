/* Show the notebook's discoverability where its owner and members can see it.
   Public/private is an application setting, independent from whether the
   underlying database is reachable from the public internet. */
import { getParty } from './store.js';

const code = new URLSearchParams(location.search).get('c') || '';

function ensureStatusNode() {
  const title = document.getElementById('pname');
  if (!title) return null;
  let node = document.getElementById('bookVisibilityStatus');
  if (node) return node;
  node = document.createElement('p');
  node.id = 'bookVisibilityStatus';
  node.className = 'whisper';
  node.style.margin = '7px 0 0';
  node.setAttribute('aria-live', 'polite');
  title.insertAdjacentElement('afterend', node);
  return node;
}

function renderVisibility() {
  if (!/^\d{5}$/.test(code)) return false;
  const party = getParty(code);
  if (!party) return false;
  const node = ensureStatusNode();
  if (!node) return false;
  const isPublic = party.visibility === 'public';
  node.dataset.visibility = isPublic ? 'public' : 'private';
  node.textContent = isPublic
    ? '☀️ สาธารณะ · แสดงในห้องสาธารณะและเปิดให้คนอื่นดูรายละเอียดได้'
    : '🔒 ส่วนตัว · ไม่แสดงในห้องสาธารณะ เข้าร่วมผ่านคำเชิญหรือรหัสสมุด';
  return true;
}

/* A party page renders its local snapshot first and then refreshes canonical
   server state. Keep checking briefly even after the first render so a stale
   local Private/Public badge cannot survive the server refresh in the same
   tab (the browser does not fire `storage` for writes made by that tab). */
let attempt = 0;
function boot() {
  renderVisibility();
  if (attempt++ < 30) setTimeout(boot, 400);
}

boot();
window.addEventListener('storage', renderVisibility);
