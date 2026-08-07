/* myClover · Post-Forge flow fix
   - Walkthrough remains an optional recommended Subquest, never a required compass stage
   - The 3 Hall starter cards unlock as soon as all 7 Forge episodes are complete
   - The compass rail shows only 4 Main Quest markers
   - Remove copy that incorrectly says there is no Walkthrough

   This compatibility layer keeps existing progress keys intact while the older stage
   table still contains the Walkthrough row. It can be removed after stage.js is
   rebuilt around the branching Main Quest.
*/

const WALK_KEY = 'mc_walk_done';
const SIDEQUEST_ID = 'walkthroughCompassSidequest';
const SIDEQUEST_STYLE_ID = 'walkthrough-compass-sidequest-style';
const MAIN_RAIL_IDS = ['forge', 'core7', 'hall'];
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

function isEnglish() {
  return raw('mc_lang', 'th') === 'en';
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
    if (bypassed) {
      try {
        if (existed) localStorage.setItem(WALK_KEY, previous);
        else localStorage.removeItem(WALK_KEY);
      } catch { /* private mode */ }
    }
  }
}

function restoreWalkthroughRewards() {
  const done = raw(WALK_KEY) === '1';
  document.querySelectorAll('[data-mc-when]').forEach(node => {
    const condition = node.getAttribute('data-mc-when');
    if (condition === 'walk') node.hidden = !done;
    if (condition === '!walk') node.hidden = done;
  });
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

function addSidequestStyles() {
  if (document.getElementById(SIDEQUEST_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SIDEQUEST_STYLE_ID;
  style.textContent = `
    .walkthrough-sidequest{margin-top:14px}
    .walkthrough-sidequest__card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;padding:20px 22px;border:1px solid rgb(190 148 66/.48);border-radius:18px;background:linear-gradient(145deg,rgb(10 40 24),rgb(18 67 40));color:#fff;box-shadow:0 18px 46px -34px rgb(7 31 19/.75);transition:transform .18s,border-color .18s,box-shadow .18s}
    .walkthrough-sidequest__card:hover{transform:translateY(-2px);border-color:rgb(190 148 66/.82);box-shadow:0 24px 52px -32px rgb(7 31 19/.85)}
    .walkthrough-sidequest__icon{width:52px;height:52px;display:grid;place-items:center;border:1px solid rgb(255 255 255/.16);border-radius:16px;background:rgb(255 255 255/.08);font-size:27px}
    .walkthrough-sidequest__tag{display:block;color:rgb(219 183 101);font-family:"Bai Jamjuree",system-ui;font-size:10.5px;font-weight:800;letter-spacing:.12em}
    .walkthrough-sidequest__title{display:block;margin-top:4px;color:#fff;font-family:"Bai Jamjuree",system-ui;font-size:17px;line-height:1.35}
    .walkthrough-sidequest__copy{display:block;margin-top:4px;color:rgb(255 255 255/.68);font-size:13px;line-height:1.65}
    .walkthrough-sidequest__go{color:rgb(219 183 101);font-family:"Bai Jamjuree",system-ui;font-size:13px;font-weight:800;white-space:nowrap}
    @media(max-width:620px){
      .walkthrough-sidequest__card{grid-template-columns:auto minmax(0,1fr);padding:18px 17px}
      .walkthrough-sidequest__go{grid-column:2;white-space:normal}
      .walkthrough-sidequest__icon{width:46px;height:46px;border-radius:14px;font-size:24px}
    }
    @media(prefers-reduced-motion:reduce){.walkthrough-sidequest__card{transition:none}}
  `;
  document.head.append(style);
}

function renderWalkthroughSidequest() {
  const existing = document.getElementById(SIDEQUEST_ID);
  const stage = window.MC_STAGE?.get?.();
  const shouldShow = Boolean(
    forgeComplete()
    && raw(WALK_KEY) !== '1'
    && stage
    && stage.id === 'hall'
    && !stage.done
  );

  if (!shouldShow) {
    existing?.remove();
    return;
  }

  const activeQuest = document.querySelector('#questHud .active-quest');
  if (!activeQuest) return;

  addSidequestStyles();
  const en = isEnglish();
  const markup = `
    <a class="walkthrough-sidequest__card" href="/walkthrough/" data-mc-act="hall-walkthrough-sidequest">
      <span class="walkthrough-sidequest__icon" aria-hidden="true">🗺️</span>
      <span>
        <span class="walkthrough-sidequest__tag">${en ? 'RECOMMENDED SIDEQUEST · OPTIONAL' : 'SIDEQUEST แนะนำ · ไม่บังคับ'}</span>
        <b class="walkthrough-sidequest__title">${en ? 'Open the Walkthrough while you learn' : 'อ่าน Walkthrough ระหว่างเรียน AI ใส่ซอส'}</b>
        <span class="walkthrough-sidequest__copy">${en
          ? 'See how the Webtoon, CORE7, and all 6 lessons grew from the same Source.'
          : 'ดูว่า Webtoon, CORE7 และบทเรียนทั้ง 6 บท เติบโตจาก Source ชุดเดียวกันอย่างไร'}</span>
      </span>
      <span class="walkthrough-sidequest__go">${en ? 'Open →' : 'เปิดอ่าน →'}</span>
    </a>`;

  if (existing) {
    existing.innerHTML = markup;
    return;
  }

  const section = document.createElement('aside');
  section.id = SIDEQUEST_ID;
  section.className = 'walkthrough-sidequest';
  section.setAttribute('aria-label', en ? 'Recommended optional Walkthrough' : 'Walkthrough เควสรองแนะนำ');
  section.innerHTML = markup;
  activeQuest.insertAdjacentElement('afterend', section);
}

function patchStage() {
  const base = window.MC_STAGE;
  if (!base || base.__postForgeFlowFixed) return;

  const originalStages = Array.isArray(base.STAGES) ? base.STAGES.slice() : [];
  const walkIndex = originalStages.indexOf('walkthrough');

  function adjustSnapshot(snapshot) {
    if (!snapshot) return snapshot;
    const adjusted = { ...snapshot };

    if (walkIndex >= 0) {
      if (typeof adjusted.total === 'number') adjusted.total = Math.max(0, adjusted.total - 1);
      if (typeof adjusted.index === 'number' && adjusted.index > walkIndex) adjusted.index -= 1;
    }

    /* The active quest card already has a separate icon. Avoid 🌱 appearing twice. */
    if (adjusted.id === 'intro' && adjusted.next?.title) {
      adjusted.next = {
        ...adjusted.next,
        title: adjusted.next.title.replace(/^🌱\s*/, ''),
      };
    }
    return adjusted;
  }

  function mainRail() {
    const steps = withWalkthroughBypassed(() => base.rail())
      .filter(step => MAIN_RAIL_IDS.includes(step.id));
    const complete = Boolean(adjustSnapshot(withWalkthroughBypassed(() => base.get()))?.done);
    const mystery = complete ? 'Guild X' : '?';

    steps.push({
      id: 'destination',
      icon: '🏰',
      th: mystery,
      en: mystery,
      label: mystery,
      done: false,
      current: complete,
    });
    return steps;
  }

  const patched = {
    ...base,
    __postForgeFlowFixed: true,
    STAGES: originalStages.filter(id => id !== 'walkthrough'),
    get() {
      return adjustSnapshot(withWalkthroughBypassed(() => base.get()));
    },
    rail() {
      return mainRail();
    },
    reached(id) {
      if (id === 'walkthrough') return false;
      return withWalkthroughBypassed(() => base.reached(id));
    },
    paint() {
      withWalkthroughBypassed(() => base.paint());
      restoreWalkthroughRewards();
      unlockStarterCards();
      renderWalkthroughSidequest();
    },
  };

  window.MC_STAGE = patched;
}

function refreshStage() {
  patchStage();
  window.MC_STAGE?.paint?.();
  restoreWalkthroughRewards();
  unlockStarterCards();
  cleanForgeRouteCopy();
  renderWalkthroughSidequest();
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

  document.querySelectorAll('[data-lang]').forEach(button => {
    button.addEventListener('click', () => window.setTimeout(renderWalkthroughSidequest, 0));
  });

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
