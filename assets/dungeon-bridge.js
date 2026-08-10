/* myClover · THE DUNGEON bridge
   Source of truth for Collection mini-achievements + normalized Dungeon behavior.
   The retired /classroom/awaken/ boss page is intentionally not consulted here.
*/

if (/^\/classroom\/dungeon\/?(?:index\.html)?$/.test(location.pathname)) {
  const STATE_KEY = 'mc_dungeon_state_v2';
  const CLEAR_KEY = 'mc_dungeon_cleared_v1';
  const AWAKENED_KEY = 'mc_dungeon_awakened_v1';
  const WELL_DONE_KEY = 'mc_dungeon_well_done_v1';
  const $ = id => document.getElementById(id);

  function state() {
    try {
      const value = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      return value && value.v === 2 ? value : null;
    } catch { return null; }
  }

  function mark(key) { try { localStorage.setItem(key, '1'); } catch { /* private mode */ } }
  function unlock(id) {
    try { window.MC_MINI_UNLOCK?.(id); } catch { /* private mode / early boot */ }
  }

  function syncAchievements() {
    const s = state();
    if (!s) return;
    if (s.party) unlock('party-box-open');
    if (s.folds?.f1b) unlock('timebox-open');
    if (s.level >= 3) unlock('xp-scroll-used');
    if (s.luckybug) unlock('lucky-bug');
    try { if (localStorage.getItem(WELL_DONE_KEY) === '1') unlock('well-done'); } catch {}
    if (s.loot) {
      mark(CLEAR_KEY);
      if (s.loot.broken) unlock('salt-speedrun');
      else {
        unlock('boss-chest');
        if (Number(s.loot.stars) === 3) unlock('boss-3-stars');
        if (Number(s.loot.stars) === 5) {
          unlock('boss-5-stars');
          mark(AWAKENED_KEY);
        }
      }
    }
  }

  function handleDungeonAct(id) {
    const s = state();
    if (id === 'dungeon-q3') unlock('party-box-open');
    if (id === 'dungeon-scroll-lv3') unlock('xp-scroll-used');
    if (id === 'dungeon-chest-open') {
      mark(CLEAR_KEY);
      unlock('boss-chest');
      if (Number(s?.loot?.stars) === 3) unlock('boss-3-stars');
      if (Number(s?.loot?.stars) === 5) {
        unlock('boss-5-stars');
        mark(AWAKENED_KEY);
      }
    }
    if (id === 'dungeon-chest-broken') {
      mark(CLEAR_KEY);
      unlock('salt-speedrun');
    } else if (id === 'dungeon-pry-3') unlock('salt-speedrun');
    if (id === 'dungeon-dragon-wake') {
      mark(WELL_DONE_KEY);
      unlock('well-done');
    }
    if (id === 'dungeon-lucky-bug') unlock('lucky-bug');
  }

  const previousAct = window.MC_ACT;
  if (typeof previousAct === 'function' && !previousAct.__dungeonBridge) {
    const wrapped = function dungeonActBridge(id, ...args) {
      const out = previousAct.call(this, id, ...args);
      handleDungeonAct(String(id || ''));
      return out;
    };
    wrapped.__dungeonBridge = true;
    window.MC_ACT = wrapped;
  }

  function bindOldBox() {
    const fold = document.querySelector('.fold[data-fold="f1b"]');
    const button = fold?.querySelector(':scope > button');
    if (!button || button.dataset.dungeonAchievementBound === '1') return;
    button.dataset.dungeonAchievementBound = '1';
    button.addEventListener('click', () => {
      requestAnimationFrame(() => {
        if (fold.classList.contains('open')) unlock('timebox-open');
      });
    });
  }

  const OBJECT_RULES = [
    ['dungeon-object-forge', /โรงตีเหล็ก/],
    ['dungeon-object-computer', /คอม|computer|terminal/i],
    ['dungeon-object-school', /โรงเรียน/],
    ['dungeon-object-kitchen', /ห้องครัว|ทอดไก่|หม้อซอส/],
    ['dungeon-object-shop', /ร้าน|shop/i],
    ['dungeon-object-savepoint', /จุดเซฟ|save point/i],
    ['dungeon-object-guild', /หอกิลด์|กิลด์|guild/i],
    ['dungeon-object-construction', /ก่อสร้าง|เครน|construction/i],
    ['dungeon-object-fishing', /ตกปลา|คันเบ็ด|เบ็ด/],
    ['dungeon-object-sign', /ป้าย/],
    ['dungeon-object-notebook', /สมุด/],
    ['dungeon-object-dragon', /มังกร|dragon/i],
    ['dungeon-object-gold', /กองทอง|ทองของมังกร|ขโมยทอง/],
    ['dungeon-object-clover', /โคลเวอร์สี่แฉก|โคลเวอร์/],
  ];
  const SECRET_RULES = [
    ['dungeon-secret-boot', /รองเท้าบูท/],
    ['dungeon-secret-clover', /โคลเวอร์สี่แฉก/],
  ];
  let lastMessage = '';
  function classifyMessage() {
    const text = String($('rpgMsg')?.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text === lastMessage) return;
    lastMessage = text;
    for (const [id, re] of OBJECT_RULES) if (re.test(text)) { try { window.MC_ACT?.(id); } catch {} }
    for (const [id, re] of SECRET_RULES) if (re.test(text)) { try { window.MC_ACT?.(id); } catch {} }
  }

  function boot() {
    bindOldBox();
    syncAchievements();
    const msg = $('rpgMsg');
    if (msg) new MutationObserver(classifyMessage).observe(msg, { childList:true, subtree:true, characterData:true });
    classifyMessage();
    addEventListener('pageshow', syncAchievements);
    addEventListener('focus', syncAchievements);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
}
