/* myClover · Main Quest CORE7 handoff
   - Main-site routes use /core7/quick/; the normal tutorial remains inside the game
   - The Main Quest never asks a first-time visitor to build a hand
   - After the Quick Tutorial, the compass resumes the Match directly
   - A false/legacy free-ai mark cannot make the compass skip lesson 1
*/

const QUICK_PATH = '/core7/quick/';
const MAIN_MATCH_PATH = '/core7/bot/?level=easy&entry=main';
const LESSON_ONE = '/classroom/free-ai.html';

function read(key, fallback = '') {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function lessonOneFinished() {
  if (read('mc-sauce-lesson-1-complete') === '1') return true;
  try {
    const state = JSON.parse(read('mc:ai-sauce-lite:free-ai', '{}'));
    return state?.finished === true;
  } catch {
    return false;
  }
}

function shouldRewriteLink(link) {
  const href = link.getAttribute('href') || '';
  if (!href) return false;
  if (/\/core7\/tutorial\//.test(href) && /entry=(forge|walkthrough|journey|main)/.test(href)) return true;
  if (/\/core7\/hand\//.test(href) && /entry=(forge|walkthrough|journey|main)/.test(href)) return true;
  return false;
}

function rewriteMainQuestLinks(root = document) {
  root.querySelectorAll?.('a[href]').forEach(link => {
    if (!shouldRewriteLink(link)) return;
    link.setAttribute('href', QUICK_PATH);
  });
}

function patchStage() {
  const base = window.MC_STAGE;
  if (!base || base.__mainQuestCore7Fixed) return;

  const patched = {
    ...base,
    __mainQuestCore7Fixed: true,
    get() {
      const snapshot = base.get();
      if (!snapshot) return snapshot;
      const next = snapshot.next ? { ...snapshot.next } : null;
      const adjusted = { ...snapshot, next };
      const en = read('mc_lang', 'th') === 'en';

      if (snapshot.id === 'tutorial') {
        adjusted.next = {
          ...(next || {}),
          href: QUICK_PATH,
          icon: '🎓',
          label: en ? 'Playable proof' : 'หลักฐานที่เล่นได้',
          title: en ? '🎓 Quick Tutorial → your first Match' : '🎓 Quick Tutorial → Match แรก',
          desc: en
            ? 'No hand selection. Learn the few rules, then meet the EASY BOT immediately.'
            : 'ไม่ต้องเลือกมือ เรียนกติกาสั้น ๆ แล้วเจอ EASY BOT ทันที',
          cta: en ? 'Start Quick Tutorial →' : 'เริ่ม Quick Tutorial →',
        };
      }

      if (snapshot.id === 'core7') {
        adjusted.next = {
          ...(next || {}),
          href: MAIN_MATCH_PATH,
          icon: '🃏',
          label: en ? 'First Match' : 'Match แรก',
          title: en ? '🃏 Continue your Match against the EASY BOT' : '🃏 กลับไปเล่น Match แรกกับ EASY BOT',
          desc: en
            ? 'The Quick Tutorial is already complete. Continue straight at the table.'
            : 'Quick Tutorial จบแล้ว กลับเข้าสนามต่อได้ทันที ไม่ต้องเรียนซ้ำหรือเลือกมือใหม่',
          cta: en ? 'Continue the Match →' : 'กลับเข้า Match →',
        };
      }

      /* Old scroll-based progress could add free-ai to mc_learn before the learner
         explicitly finished the quest. During the Main Quest, the completion button
         state is authoritative, so lesson 1 must remain the next destination. */
      if (snapshot.id === 'hall' && read('mc_force_lesson1_until_explicit') === '1' && !lessonOneFinished()) {
        adjusted.learn = 0;
        adjusted.next = {
          href: LESSON_ONE,
          icon: '⚡',
          label: en ? 'Lesson 1' : 'บทที่ 1',
          title: en ? '⚡ AI Sauce — lesson 1' : '⚡ AI ใส่ซอส — บทที่ 1',
          desc: en
            ? 'Build your first Source from your own material.'
            : 'สร้าง Source ขวดแรกจากวัตถุดิบจริงของคุณ',
          cta: en ? 'Start lesson 1 →' : 'เริ่มบทที่ 1 →',
        };
      }
      return adjusted;
    },
    paint() {
      base.paint();
      rewriteMainQuestLinks();
    },
  };

  window.MC_STAGE = patched;
}

function refresh() {
  patchStage();
  window.MC_STAGE?.paint?.();
  rewriteMainQuestLinks();
}

function boot() {
  refresh();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLAnchorElement) {
        if (shouldRewriteLink(record.target)) record.target.setAttribute('href', QUICK_PATH);
      } else {
        record.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches?.('a[href]') && shouldRewriteLink(node)) node.setAttribute('href', QUICK_PATH);
          rewriteMainQuestLinks(node);
        });
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  window.addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
