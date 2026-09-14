/* A server enrollment, including a pending one, is required before this link exists. */
let serial = 0, entry;
function remove() { entry?.remove(); entry = null; }
export async function refreshLearningEntry(fetcher = window.fetch.bind(window)) {
  const run = ++serial; remove();
  try {
    const response = await fetcher('/api/learn?action=entry', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (run !== serial || data?.ok !== true || data.hasEnrollment !== true) return;
    const parent = document.querySelector('[data-my-learning-mount]') || document.querySelector('.quiet-tools') || document.querySelector('nav.topbar') || document.querySelector('header');
    if (!parent) return;
    if (!document.getElementById('my-learning-entry-style')) { const style = document.createElement('style'); style.id = 'my-learning-entry-style'; style.textContent = '.my-learning-entry{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:8px 12px;border:1px solid #b9aa80;border-radius:99px;background:#f7f5ee;color:#244530!important;font:600 12px/1.35 Anuphan,system-ui,sans-serif;text-decoration:none;white-space:nowrap;pointer-events:auto}.my-learning-entry:focus-visible{outline:3px solid #cf8b30;outline-offset:4px}@media(max-width:600px){.my-learning-entry{position:fixed;right:16px;top:calc(76px + env(safe-area-inset-top,0px));z-index:80;box-shadow:0 2px 12px #17291912}}'; document.head.append(style); }
    entry = document.createElement('a'); entry.className = 'my-learning-entry'; entry.href = '/learn/'; entry.textContent = 'ห้องเรียนของฉัน ↗'; parent.prepend(entry);
  } catch { if (run === serial) remove(); }
}
window.addEventListener('mc:account-changed', () => refreshLearningEntry());
window.addEventListener('mc:account-ready', () => refreshLearningEntry());
window.addEventListener('pageshow', () => refreshLearningEntry());
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshLearningEntry(); });
refreshLearningEntry();
