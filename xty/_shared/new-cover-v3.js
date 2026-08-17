import { getProfile, availableOwnedCards } from './store.js';
import { cardMarkup } from './card-ui.js';
import { cardNameTh } from './cards.js';
import { cardById as core7CardById } from '../../core7/js/cards.js';
import { cardSVG } from '../../core7/js/art.js';

const BACK = '/core7/assets/myclover-back.webp';

function unlockedCore7Ids() {
  try {
    const ids = JSON.parse(localStorage.getItem('c7:collection') || '[]');
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids)].filter(id => {
      const card = typeof id === 'string' ? core7CardById(id) : null;
      return !!card && !card.generic && String(card.id || '').startsWith('fh-');
    });
  } catch { return []; }
}

function installStyles() {
  if (document.getElementById('xty-cover-v3-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-cover-v3-style';
  style.textContent = `
    #leadPick{display:block!important}
    .xty-cover-picker{display:grid;gap:12px}
    .xty-cover-current{display:flex;align-items:center;gap:14px;padding:12px;border:1px solid var(--xty-border);border-radius:18px;background:rgba(255,255,255,.72)}
    .xty-cover-current-art{flex:none;width:88px;aspect-ratio:63/88;overflow:hidden;border-radius:11px;background:#13291d;box-shadow:0 3px 10px rgba(62,51,44,.14)}
    .xty-cover-current-art img,.xty-cover-current-art svg,.xty-cover-current-art .animal-card{display:block;width:100%;height:100%;object-fit:cover;border-radius:0}
    .xty-cover-current-copy{min-width:0;flex:1}.xty-cover-current-copy b{display:block;font-size:16px;line-height:1.35}.xty-cover-current-copy small{display:block;margin-top:4px;color:var(--xty-muted);font-size:12px;line-height:1.4}
    .xty-cover-open{margin-top:10px;min-height:40px!important;padding:0 14px!important}
    .xty-cover-library{border:1px solid var(--xty-border);border-radius:18px;background:var(--xty-surface);overflow:hidden;box-shadow:0 10px 26px rgba(62,51,44,.10)}
    .xty-cover-tabs{display:flex;gap:6px;padding:9px;overflow-x:auto;border-bottom:1px solid var(--xty-border);scrollbar-width:none}.xty-cover-tabs::-webkit-scrollbar{display:none}
    .xty-cover-tab{flex:none;border:1px solid var(--xty-border);background:var(--xty-paper);border-radius:999px;padding:8px 11px;font:800 11px/1 var(--sans);color:var(--xty-muted)}
    .xty-cover-tab.active{border-color:#2e8b59;color:#2e8b59;background:rgba(50,139,92,.08)}
    .xty-cover-scroll{max-height:min(52dvh,520px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px}
    .xty-cover-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}
    .xty-cover-option{border:1px solid var(--xty-border);border-radius:13px;background:var(--xty-paper);padding:6px;min-width:0;text-align:left}
    .xty-cover-option[aria-checked="true"]{outline:3px solid rgba(50,139,92,.22);border-color:#2e8b59}
    .xty-cover-thumb{width:100%;aspect-ratio:63/88;overflow:hidden;border-radius:9px;background:#13291d}.xty-cover-thumb img,.xty-cover-thumb svg,.xty-cover-thumb .animal-card{display:block;width:100%;height:100%;object-fit:cover;border-radius:0}
    .xty-cover-label{display:block;margin-top:6px;font-size:10.5px;font-weight:800;line-height:1.3;overflow-wrap:anywhere}
    .xty-cover-empty{grid-column:1/-1;margin:4px 0;color:var(--xty-muted);font-size:12px}
    @media (min-width:600px){.xty-cover-current-art{width:104px}.xty-cover-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function backArt() { return `<img src="${BACK}" alt="หลังการ์ด myClover">`; }
function core7Art(id) {
  const card = core7CardById(id);
  return card ? cardSVG(id, { width: 300, showNumber: true }) : '';
}
function setOverride(item) {
  window.__xtyCoverV2 = { coverType: item.coverType, leadCardId: item.leadCardId || null, core7CardId: item.core7CardId || null };
}

function install() {
  const host = document.getElementById('leadPick');
  const hint = document.getElementById('coverHint');
  if (!host || host.dataset.coverV3 === '1') return;
  host.dataset.coverV3 = '1'; installStyles(); host.innerHTML = '';

  const profile = getProfile();
  const xtyCards = availableOwnedCards({ role: 'lead', profile });
  const core7Ids = unlockedCore7Ids();
  const groups = {
    back: [{ key:'back', category:'back', coverType:'card_back', title:'หลังการ์ด myClover', subtitle:'ใช้ได้เสมอ', art:backArt() }],
    xty: xtyCards.map(card => ({
      key:`xty:${card.cardId}`, category:'xty', coverType:'card', leadCardId:card.cardId,
      title:cardNameTh(card), subtitle:'XTY CARD', art:cardMarkup(card, { role:'lead' }),
    })),
    core7: core7Ids.map(id => {
      const card = core7CardById(id);
      return card ? {
        key:`core7:${id}`, category:'core7', coverType:'core7_card', core7CardId:id,
        title:`${card.en} · ${card.th}`, subtitle:'myClover · FIRST HAND', art:core7Art(id),
      } : null;
    }).filter(Boolean),
  };

  /* No shelf of cards you have not found. It used to show twelve of them,
     locked, so a new player could see what a cover can be — but that hands
     over the art of the set before anybody has opened a single card. What
     a player needs here is the rule (covers come from cards, cards come
     from finishing quests), and that is copy, not a grid. */

  const unlockedCovers = xtyCards.length + core7Ids.length;
  const total = 1 + unlockedCovers;
  let selected = groups.back[0];
  let activeCategory = 'back';
  setOverride(selected);

  const shell = document.createElement('div'); shell.className = 'xty-cover-picker';
  const current = document.createElement('div'); current.className = 'xty-cover-current';
  const currentArt = document.createElement('div'); currentArt.className = 'xty-cover-current-art';
  const currentCopy = document.createElement('div'); currentCopy.className = 'xty-cover-current-copy';
  const currentTitle = document.createElement('b');
  const currentSub = document.createElement('small');
  const open = document.createElement('button'); open.type = 'button'; open.className = 'btn ghost sm xty-cover-open';
  open.textContent = unlockedCovers ? 'เปลี่ยนปก' : 'ดูปกที่ใช้ได้ตอนนี้';
  currentCopy.append(currentTitle, currentSub, open); current.append(currentArt, currentCopy);

  const library = document.createElement('div'); library.className = 'xty-cover-library'; library.hidden = true;
  const tabs = document.createElement('div'); tabs.className = 'xty-cover-tabs';
  const scroller = document.createElement('div'); scroller.className = 'xty-cover-scroll';
  const grid = document.createElement('div'); grid.className = 'xty-cover-grid'; scroller.appendChild(grid);
  library.append(tabs, scroller); shell.append(current, library); host.appendChild(shell);

  const categoryMeta = [
    ['back','หลังการ์ด',groups.back.length], ['xty','XTY',groups.xty.length], ['core7','FIRST HAND',groups.core7.length],
  ];

  function syncCurrent() {
    currentArt.innerHTML = selected.art;
    currentTitle.textContent = selected.title;
    currentSub.textContent = selected.subtitle;
    if (!hint) return;
    /* Never phrased as a blocker: the party can be created right now, the
       cover is simply the one everybody starts with. */
    hint.textContent = unlockedCovers
      ? `เลือกไว้ ${selected.title} · มีปกให้เลือก ${total} แบบ กด “เปลี่ยนปก” เพื่อเปิดคลัง`
      : 'ตี้นี้ใช้หลังการ์ด myClover เป็นปก · ตั้งตี้ต่อได้เลย ไม่ต้องรอ — ปกแบบอื่นมาจากการ์ดที่ได้ตอนเล่นตี้จนจบเควส';
  }

  function renderCategory() {
    grid.innerHTML = '';
    const list = groups[activeCategory] || [];
    if (!list.length) {
      const empty = document.createElement('p'); empty.className = 'xty-cover-empty';
      empty.textContent = activeCategory === 'core7' ? 'ยังไม่มี FIRST HAND ที่ปลดล็อกในเครื่องนี้'
        : 'ยังไม่มีการ์ดหมวดนี้ที่ใช้เป็นปกได้ · การ์ดได้จากการเล่นตี้จนจบเควส';
      grid.appendChild(empty); return;
    }
    for (const item of list) {
      const option = document.createElement('button');
      option.type = 'button'; option.className = 'xty-cover-option'; option.setAttribute('role','radio');
      option.setAttribute('aria-checked', item.key === selected.key ? 'true' : 'false');
      option.setAttribute('aria-label', `ใช้ ${item.title} เป็นปกตี้`);
      option.innerHTML = `<div class="xty-cover-thumb">${item.art}</div><span class="xty-cover-label"></span>`;
      option.querySelector('.xty-cover-label').textContent = item.title;
      option.addEventListener('click', () => {
        selected = item; setOverride(selected); syncCurrent(); library.hidden = true;
        open.textContent = unlockedCovers ? 'เปลี่ยนปก' : 'ดูปกที่ใช้ได้ตอนนี้';
      });
      grid.appendChild(option);
    }
    scroller.scrollTop = 0;
  }

  categoryMeta.forEach(([id,label,count]) => {
    const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'xty-cover-tab'; tab.dataset.category = id;
    tab.textContent = `${label}${id === 'back' ? '' : ` ${count}`}`;
    tab.addEventListener('click', () => {
      activeCategory = id;
      tabs.querySelectorAll('.xty-cover-tab').forEach(node => node.classList.toggle('active', node === tab));
      renderCategory();
    });
    if (id === activeCategory) tab.classList.add('active');
    tabs.appendChild(tab);
  });

  open.addEventListener('click', () => {
    library.hidden = !library.hidden;
    open.textContent = library.hidden ? (unlockedCovers ? 'เปลี่ยนปก' : 'ดูปกที่ใช้ได้ตอนนี้') : 'ปิดคลัง';
    if (!library.hidden) {
      activeCategory = selected.category;
      tabs.querySelectorAll('.xty-cover-tab').forEach(node => node.classList.toggle('active', node.dataset.category === activeCategory));
      renderCategory();
    }
  });

  syncCurrent();
}

requestAnimationFrame(() => requestAnimationFrame(install));
