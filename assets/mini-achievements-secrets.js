/* myClover · Mini Achievement secrecy rules
   - Locked Mini Achievements reveal no name, icon, or unlock hint.
   - Unlocking the 5-star chest also unlocks the 3-star threshold.
*/

const KEY = 'mc_mini_achievements_v1';
const THREE = 'boss-3-stars';
const FIVE = 'boss-5-stars';

function readSet() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* private mode */ }
}

function normalizeThresholds() {
  const set = readSet();
  if (!set.has(FIVE) || set.has(THREE)) return false;
  set.add(THREE);
  writeSet(set);
  return true;
}

function installCascade() {
  const original = window.MC_MINI_UNLOCK;
  if (typeof original !== 'function' || original.__miniSecretCascade) return false;

  function unlockWithThreshold(id) {
    const changed = original(id);
    if (id === FIVE) original(THREE);
    normalizeThresholds();
    queueCollectionSync();
    return changed;
  }
  unlockWithThreshold.__miniSecretCascade = true;
  window.MC_MINI_UNLOCK = unlockWithThreshold;
  return true;
}

let queued = false;
function queueCollectionSync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    syncCollectionCards();
  });
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function syncCollectionCards() {
  if (!/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) return;
  normalizeThresholds();

  const registry = Array.isArray(window.MC_MINI_ACHIEVEMENTS)
    ? window.MC_MINI_ACHIEVEMENTS
    : [];
  const byId = new Map(registry.map(item => [item.id, item]));
  const unlocked = readSet();

  document.querySelectorAll('.mini-achievement[data-mini-id]').forEach(card => {
    const id = card.dataset.miniId;
    const item = byId.get(id);
    const isUnlocked = unlocked.has(id);
    const icon = card.querySelector('.mini-icon');
    const name = card.querySelector('b');
    const copy = card.querySelector('small');
    const state = card.querySelector('.mini-state');

    card.classList.toggle('unlocked', isUnlocked);
    card.classList.toggle('locked', !isUnlocked);

    if (isUnlocked && item) {
      setText(icon, item.emoji);
      icon?.classList.toggle('stars', /★/.test(item.emoji));
      setText(name, item.name);
      setText(copy, `✓ ปลดแล้ว · ${item.hint}`);
      setText(state, '✓');
      return;
    }

    setText(icon, '🔒');
    icon?.classList.remove('stars');
    setText(name, '???');
    setText(copy, 'ยังไม่ปลด');
    setText(state, '🔒');
  });

  const count = document.querySelector('.mini-achievement-group .group-count');
  if (count && registry.length) {
    setText(count, `${registry.filter(item => unlocked.has(item.id)).length}/${registry.length}`);
  }
}

function boot() {
  normalizeThresholds();

  if (!installCascade()) {
    const retry = window.setInterval(() => {
      if (installCascade()) window.clearInterval(retry);
    }, 50);
    window.setTimeout(() => window.clearInterval(retry), 3000);
  }

  if (/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) {
    const album = document.getElementById('album');
    if (album) new MutationObserver(queueCollectionSync).observe(album, { childList:true, subtree:true });
    document.addEventListener('click', event => {
      if (event.target.closest?.('.filter')) window.setTimeout(queueCollectionSync, 0);
    });
    window.addEventListener('mc:mini-achievement', queueCollectionSync);
    queueCollectionSync();
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
