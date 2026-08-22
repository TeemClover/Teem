import { getParty } from './store.js';

/* Keep the notebook home clean: the existing daily-summary card is the single
   entry point for per-member activity/rule details. The old standalone trigger
   stays hidden only as an internal compatibility hook for the existing sheet. */

const code = String(new URLSearchParams(location.search).get('c') || '').toUpperCase();

function addStyles() {
  if (document.getElementById('tb-today-details-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-today-details-style';
  style.textContent = `
    .today.tb-today-details-trigger{cursor:pointer;user-select:none;transition:border-color .15s ease,background .15s ease}
    .today.tb-today-details-trigger:hover{border-color:rgba(41,136,87,.72);background:#edf9e9}
    .today.tb-today-details-trigger:focus-visible{outline:3px solid rgba(91,141,255,.4);outline-offset:3px}
    .tb-today-details-arrow{flex:none;margin-left:2px;color:#66755e;font-size:24px;line-height:1;font-weight:800}
    .tb-activity-verification-note{margin:16px 2px 2px;padding-top:14px;border-top:1px solid rgba(92,75,49,.14);color:#736650;font-size:12px;line-height:1.55}
  `;
  document.head.appendChild(style);
}

function decorateSheet() {
  const sheet = document.querySelector('.tb-activity-sheet');
  if (!sheet || sheet.querySelector('.tb-activity-verification-note')) return;
  const party = getParty(code);
  if (party?.verificationMode !== 'confirm') return;
  const note = document.createElement('p');
  note.className = 'tb-activity-verification-note';
  note.textContent = 'ลงชื่อแล้ว · ให้เพื่อนอย่างน้อย 1 คนกด เห็นแล้ว ได้ถึงวันถัดไป';
  sheet.appendChild(note);
}

function openDetails() {
  const compatibilityTrigger = document.getElementById('tbActivityRulesButton');
  if (!compatibilityTrigger) return;
  compatibilityTrigger.click();
  requestAnimationFrame(decorateSheet);
}

function mount() {
  addStyles();

  const verificationLine = document.getElementById('verificationLine');
  if (verificationLine) {
    verificationLine.hidden = true;
    verificationLine.setAttribute('aria-hidden', 'true');
  }

  const compatibilityTrigger = document.getElementById('tbActivityRulesButton');
  if (compatibilityTrigger) {
    compatibilityTrigger.hidden = true;
    compatibilityTrigger.setAttribute('aria-hidden', 'true');
  }

  const today = document.querySelector('.today');
  if (!today || !compatibilityTrigger) return false;
  if (today.dataset.todayDetailsReady === '1') return true;

  today.dataset.todayDetailsReady = '1';
  today.classList.add('tb-today-details-trigger');
  today.setAttribute('role', 'button');
  today.setAttribute('tabindex', '0');
  today.setAttribute('aria-label', 'ดูรายละเอียดกิจกรรมและเงื่อนไขของทุกคนวันนี้');

  if (!today.querySelector('.tb-today-details-arrow')) {
    const arrow = document.createElement('span');
    arrow.className = 'tb-today-details-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '›';
    today.appendChild(arrow);
  }

  today.addEventListener('click', openDetails);
  today.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openDetails();
  });
  return true;
}

if (!mount()) {
  const observer = new MutationObserver(() => {
    if (mount()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 8000);
}
