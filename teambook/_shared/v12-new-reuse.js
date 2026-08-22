/* TeamBook V1.2 — reusable cards on the New Book screen.
   Legacy pickers hid a card while it was present in another active book.
   V1.2 treats a collectible as a reusable character skin: it can appear in
   many books, but the same physical choice cannot occupy Cover + Companion
   inside one book at the same time. */

import { getProfile, ownedCards } from './store.js';
import { cardById, cardDescriptorTh } from './cards.js';
import { cardMarkup } from './card-ui.js';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[ch]));
}

function installStyles() {
  if (document.getElementById('tb12-new-reuse-style')) return;
  const style = document.createElement('style');
  style.id = 'tb12-new-reuse-style';
  style.textContent = `
    .tb12-reuse{margin-top:14px;padding-top:14px;border-top:1px dashed var(--xty-border)}
    .tb12-reuse-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .tb12-reuse-head b{font-size:13px}.tb12-reuse-head small{color:var(--xty-muted);font-size:10.5px}
    .tb12-reuse-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:10px}
    .tb12-reuse-card{padding:0;border:0;background:transparent;border-radius:12px;overflow:visible;text-align:left}
    .tb12-reuse-card[aria-checked="true"]{outline:3px solid rgba(85,181,106,.3);outline-offset:3px}
    .tb12-reuse-card.is-blocked{opacity:.42;filter:grayscale(.6)}
    .tb12-reuse-card>.animal-card{width:100%!important;height:auto!important;aspect-ratio:var(--xty-card-aspect)!important}
    .tb12-reuse-name{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--xty-muted);font-size:9.5px}
    .tb12-reuse-note{margin:8px 0 0;color:var(--xty-muted);font-size:11px;line-height:1.45}
  `;
  document.head.appendChild(style);
}

function owned(role) {
  return ownedCards(getProfile())
    .map(item => cardById(item.cardId))
    .filter(Boolean)
    .filter(card => card.eligibility?.[role]);
}

function mountShelf({ host, kind, cards, title, note }) {
  if (!host || !cards.length) return;
  const shell = document.createElement('div');
  shell.className = 'tb12-reuse';
  shell.dataset.kind = kind;
  shell.innerHTML = `<div class="tb12-reuse-head"><b>${esc(title)}</b><small>V1.2 · ใช้ซ้ำข้ามสมุดได้</small></div><div class="tb12-reuse-grid"></div><p class="tb12-reuse-note">${esc(note)}</p>`;
  const grid = shell.querySelector('.tb12-reuse-grid');

  function selectedId() {
    if (kind === 'cover') return String(window.__teambookCoverV2?.leadCardId || '');
    return String(window.__teambookNpcV12 || '');
  }

  function blocked(card) {
    if (kind === 'cover') return String(window.__teambookNpcV12 || '') === card.cardId;
    return String(window.__teambookCoverV2?.leadCardId || '') === card.cardId;
  }

  function render() {
    grid.innerHTML = '';
    cards.forEach(card => {
      const button = document.createElement('button');
      const isBlocked = blocked(card);
      const selected = selectedId() === card.cardId;
      button.type = 'button';
      button.className = `tb12-reuse-card${isBlocked ? ' is-blocked' : ''}`;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
      button.setAttribute('aria-disabled', isBlocked ? 'true' : 'false');
      button.setAttribute('aria-label', `${kind === 'cover' ? 'ใช้เป็นปกสมุด' : 'ใช้เป็นเพื่อนร่วมทาง'} · ${cardDescriptorTh(card)}`);
      button.innerHTML = `${cardMarkup(card)}<span class="tb12-reuse-name">${esc(cardDescriptorTh(card))}</span>`;
      button.addEventListener('click', () => {
        if (isBlocked) return;
        if (kind === 'cover') {
          const current = String(window.__teambookCoverV2?.leadCardId || '');
          window.__teambookCoverV2 = current === card.cardId
            ? { coverType: 'card_back', leadCardId: null }
            : { coverType: 'card', leadCardId: card.cardId };
          window.__xtyCoverV2 = window.__teambookCoverV2;
        } else {
          const current = String(window.__teambookNpcV12 || '');
          window.__teambookNpcV12 = current === card.cardId ? null : card.cardId;
        }
        document.querySelectorAll('.tb12-reuse').forEach(node => node.dispatchEvent(new CustomEvent('tb12refresh')));
      });
      grid.appendChild(button);
    });
  }

  shell.addEventListener('tb12refresh', render);
  render();
  host.appendChild(shell);
}

function install() {
  if (!/^\/new(?:\/|$)/.test(location.pathname)) return;
  const profile = getProfile();
  if (!profile || document.getElementById('tb12ReuseInstalled')) return;
  installStyles();

  const marker = document.createElement('i');
  marker.id = 'tb12ReuseInstalled';
  marker.hidden = true;
  document.body.appendChild(marker);

  const level = Math.max(1, Number(profile.level || 1));
  const coverHost = document.getElementById('coverSection');
  const companionHost = document.getElementById('npcCardPick')?.closest('.notebook-card') || document.getElementById('petPick')?.closest('.notebook-card');

  if (level > 1) {
    mountShelf({
      host: coverHost,
      kind: 'cover',
      cards: owned('partyCover'),
      title: 'การ์ดของคุณที่ใช้เป็นปกได้',
      note: 'การ์ดใบเดียวกันใช้เป็นปกให้หลายสมุดได้ แต่ในสมุดเดียวกันจะเป็นทั้งปกและเพื่อนร่วมทางพร้อมกันไม่ได้',
    });
  }
  mountShelf({
    host: companionHost,
    kind: 'npc',
    cards: owned('npc'),
    title: 'การ์ดของคุณที่ใช้เป็นเพื่อนร่วมทางได้',
    note: 'เลือกซ้ำจากสมุดอื่นได้ การเลือกตรงนี้จะใช้กับสมุดใหม่เล่มนี้เท่านั้น',
  });

  /* If the user goes back to a legacy picker after touching the V1.2 shelf,
     let that explicit click win rather than leaving an invisible override. */
  document.getElementById('leadPick')?.addEventListener('click', event => {
    if (event.target.closest('.tb12-reuse')) return;
    delete window.__teambookCoverV2;
  }, true);
  document.getElementById('npcCardPick')?.addEventListener('click', event => {
    if (event.target.closest('.tb12-reuse')) return;
    delete window.__teambookNpcV12;
  }, true);
  document.getElementById('petPick')?.addEventListener('click', () => {
    window.__teambookNpcV12 = null;
    document.querySelectorAll('.tb12-reuse').forEach(node => node.dispatchEvent(new CustomEvent('tb12refresh')));
  }, true);
}

requestAnimationFrame(() => requestAnimationFrame(install));
