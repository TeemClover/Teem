import { dispatchForDebug } from './game.js?v=8';
import { EVENTS } from './game-data-v8.js';

const dialog = document.querySelector('#gameDialog');
const content = document.querySelector('#dialogContent');

function hardClose() {
  if (dialog?.open) dialog.close();
  if (content) content.innerHTML = '';
  document.body.style.removeProperty('overflow');
  requestAnimationFrame(() => document.querySelector('#actionBar button, #peopleButton, #monthButton')?.focus?.());
}

document.addEventListener('click', (event) => {
  const work = event.target.closest('#gameDialog [data-work-event]');
  if (work && !work.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = {};
    if (work.dataset.id) payload.id = work.dataset.id;
    if (work.dataset.source) payload.source = work.dataset.source;
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    const gameEvent = work.dataset.workEvent;
    hardClose();
    dispatchForDebug(gameEvent, payload);
    return;
  }
  const endMonth = event.target.closest('#gameDialog [data-dialog-action="end-month"]');
  if (endMonth) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    dispatchForDebug(EVENTS.END_MONTH);
  }
}, { capture: true });
