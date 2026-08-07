/* myClover · Post-Forge flow fix
   - Walkthrough remains an optional Subquest, never a required compass stage
   - The 3 Hall starter cards unlock as soon as all 7 Forge episodes are complete
   - Remove copy that incorrectly says there is no Walkthrough

   This compatibility layer keeps existing progress keys intact while the older stage
   table still contains the Walkthrough row. It can be removed after stage.js is
   rebuilt around the branching Main Quest.
*/

const WALK_KEY = 'mc_walk_done';
const EPISODES = [
  'ep1-everyone-gets-to-play',
  'ep2-the-first-item',
  'ep3-the-item-that-came-back',
  'ep4-what-traveled-without-us',
  'ep5-from-answers-to-a-system',
  'ep6-the-starter-kit',
  'ep7-a-voice-that-went-further',
];

function raw(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function forgeComplete() {
  if (raw('mc_forge_done') === '1') return true;

  try {
    const titles = JSON.parse(raw('mc_titles', '[]'));
    if (Array.isArray(titles) && titles.includes('BLACKSMITH')) return true;
  } catch { /* use episode count below */ }

  const read = raw('mc_read')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return EPISODES.every(slug => read.includes(slug));
}

function withWalkthroughBypassed(task) {
  let previous = null;
  let existed = false;
  let bypassed = false;

  try {
    previous = localStorage.getItem(WALK_KEY);
    existed = previous !== null;
    localStorage.setItem(WALK_KEY, '1');
    bypassed = true;
  } catch { /* private mode: run without temporary storage */ }

  try {
    return task();
  } finally {
    if (!bypassed) return;
    try {
      if (existed) localStorage.setItem(WALK_KEY, previous);
      else localStorage.removeItem(WALK_KEY);
    } catch { /* private mode */ }
  }
}

function unlockStarterCards() {
  if (!forgeComplete()) return;
  document.querySelectorAll('.highlights[data-mc-stage="hall"]').forEach(section => {
    section.hidden = false;
  });
}

function cleanForgeRouteCopy() {
  const intros = document.querySelectorAll('.forge-routes__intro');
  intros.forEach(intro => {
    if (!intro.textContent.includes('ไม่มี Walkthrough มาคั่นทางหลัก')) return;
    intro.textContent = 'เลือกเรียนต่อได้ทันที หรือทำตามเข็มทิศไปลองเกมก่อน';
  });
  return intros.length > 0;
}

function patchStage() {
  const base = window.MC_STAGE;
  if (!base || base.__postForgeFlowFixed) return;

  const originalStages = Array.isArray(base.STAGES) ? base.STAGES.slice() : [];
  const walkIndex = originalStages.indexOf('walkthrough');

  function adjustSnapshot(snapshot) {
    if (!snapshot || walkIndex < 0) return snapshot;
    const adjusted = { ...snapshot };
    if (typeof adjusted.total === 'number') adjusted.total = Math.max(0, adjusted.total - 1);
    if (typeof adjusted.index === 'number' && adjusted.index > walkIndex) adjusted.index -= 1;
    return adjusted;
  }

  const patched = {
    ...base,
    __postForgeFlowFixed: true,
    STAGES: originalStages.filter(id => id !== 'walkthrough'),
    get() {
      return adjustSnapshot(withWalkthroughBypassed(() => base.get()));
    },
    rail() {
      return withWalkthroughBypassed(() => base.rail())
        .filter(step => step.id !== 'walkthrough');
    },
    reached(id) {
      if (id === 'walkthrough') return false;
      return withWalkthroughBypassed(() => base.reached(id));
    },
    paint() {
      withWalkthroughBypassed(() => base.paint());
      unlockStarterCards();
    },
  };

  window.MC_STAGE = patched;
}

function refreshStage() {
  patchStage();
  window.MC_STAGE?.paint?.();
  unlockStarterCards();
  cleanForgeRouteCopy();
}

function notifyHallCompass() {
  /* hall-core.js keeps its compass renderer private and repaints on storage. */
  try { window.dispatchEvent(new Event('storage')); } catch { /* optional */ }
}

function boot() {
  refreshStage();
  notifyHallCompass();

  let observer = null;
  if (!cleanForgeRouteCopy() && document.body) {
    observer = new MutationObserver(() => {
      if (cleanForgeRouteCopy()) observer?.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('pageshow', () => {
    refreshStage();
    notifyHallCompass();
  });
  window.addEventListener('storage', () => window.setTimeout(refreshStage, 0));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshStage();
      notifyHallCompass();
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}
