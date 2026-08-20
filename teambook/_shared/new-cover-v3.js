import { getProfile, availableOwnedCards } from './store.js';
import { cardNameTh } from './cards.js';

function escAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[ch]));
}

function installStyles() {
  if (document.getElementById('xty-cover-v3-style')) return;
  const style = document.createElement('style');
  style.id = 'xty-cover-v3-style';
  style.textContent = `
    #leadPick{display:block!important}
    .xty-cover-picker{display:grid;gap:12px}
    .xty-cover-current{display:flex;align-items:center;gap:14px;padding:12px;border:1px solid var(--xty-border);border-radius:18px;background:rgba(255,255,255,.72)}
    .xty-cover-current-art{flex:none;width:88px;aspect-ratio:var(--xty-card-aspect);overflow:hidden;border-radius:11px;background:#13291d;box-shadow:0 3px 10px rgba(62,51,44,.14)}
    .xty-cover-current-art img,.xty-cover-current-art svg{display:block;width:100%;height:100%;object-fit:cover;border-radius:0}

    /* TeamBook uses the exact same visual idea as FIRST HAND: one outer card mask,
       one image inside. The raw TeamBook image is never rounded or clipped again,
       so its printed border cannot be bitten away by a second mask. */
    .xty-cover-current-art[data-category="xty"]{
      overflow:hidden!important;
      border-radius:11px!important;
      background:#13291d!important;
      box-shadow:0 3px 10px rgba(62,51,44,.14)!important;
    }
    .xty-cover-current-art[data-category="xty"]>.xty-cover-raw-card{
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      object-fit:cover!important;
      object-position:center!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
    }

    .xty-cover-current-copy{min-width:0;flex:1}.xty-cover-current-copy b{display:block;font-size:16px;line-height:1.35}.xty-cover-current-copy small{display:block;margin-top:4px;color:var(--xty-muted);font-size:12px;line-height:1.4}
    .xty-cover-open{margin-top:10px;min-height:40px!important;padding:0 14px!important}
    .xty-cover-library{border:1px solid var(--xty-border);border-radius:18px;background:var(--xty-surface);overflow:hidden;box-shadow:0 10px 26px rgba(62,51,44,.10)}
    .xty-cover-tabs{display:flex;gap:6px;padding:9px;overflow-x:auto;border-bottom:1px solid var(--xty-border);scrollbar-width:none}.xty-cover-tabs::-webkit-scrollbar{display:none}
    .xty-cover-tab{flex:none;border:1px solid var(--xty-border);background:var(--xty-paper);border-radius:999px;padding:8px 11px;font:800 11px/1 var(--sans);color:var(--xty-muted)}
    .xty-cover-tab.active{border-color:#2e8b59;color:#2e8b59;background:rgba(50,139,92,.08)}
    .xty-cover-scroll{max-height:min(52dvh,520px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px}
    .xty-cover-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}
    .xty-cover-option{border:1px solid var(--xty-border);border-radius:13px;background:var(--xty-paper);padding:6px;min-width:0;text-align:left;overflow:visible}
    .xty-cover-option[aria-checked="true"]{outline:3px solid rgba(50,139,92,.22);border-color:#2e8b59}
    .xty-cover-thumb{width:100%;aspect-ratio:var(--xty-card-aspect);overflow:hidden;border-radius:9px;background:#13291d}
    .xty-cover-thumb img,.xty-cover-thumb svg{display:block;width:100%;height:100%;object-fit:cover;border-radius:0}

    /* Single-mask crop for TeamBook shelf cards too. The option shell is only the
       selection UI; the thumb is the sole clipping boundary. */
    .xty-cover-option[data-category="xty"] .xty-cover-thumb{
      overflow:hidden!important;
      border-radius:9px!important;
      background:#13291d!important;
    }
    .xty-cover-option[data-category="xty"] .xty-cover-thumb>.xty-cover-raw-card{
      display:block!important;
      width:100%!important;
      height:100%!important;
      max-width:none!important;
      max-height:none!important;
      margin:0!important;
      object-fit:cover!important;
      object-position:center!important;
      border:0!important;
      border-radius:0!important;
      box-shadow:none!important;
    }

    .xty-cover-label{display:block;margin-top:6px;font-size:10.5px;font-weight:800;line-height:1.3;overflow-wrap:anywhere}
    .xty-cover-empty{grid-column:1/-1;margin:4px 0;color:var(--xty-muted);font-size:12px}
    @media (min-width:600px){.xty-cover-current-art{width:104px}.xty-cover-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function backArt() { return '<div class="animal-card card-back"><span class="back-mark">TB</span><small>TEAMBOOK</small></div>'; }
function xtyArt(card) {
  const src = card?.imageFull || card?.art || card?.image || '';
  return src ? `<img class="xty-cover-raw-card" src="${escAttr(src)}" alt="" loading="eager" decoding="async">` : '';
}
function setOverride(item) {
  window.__xtyCoverV2 = { coverType: item.coverType, leadCardId: item.leadCardId || null };
}

function install() {
  const host = document.getElementById('leadPick');
  const hint = document.getElementById('coverHint');
  if (!host || host.dataset.coverV3 === '1') return;
  host.dataset.coverV3 = '1'; installStyles(); host.innerHTML = '';

  const profile = getProfile();
  const xtyCards = availableOwnedCards({ role: 'lead', profile });
  const groups = {
    back: [{ key:'back', category:'back', coverType:'card_back', title:'หลังการ์ด', subtitle:'ใช้ได้เสมอ', art:backArt() }],
    xty: xtyCards.map(card => ({
      key:`xty:${card.cardId}`, category:'xty', coverType:'card', leadCardId:card.cardId,
      title:cardNameTh(card), subtitle:'TEAMBOOK CARD', art:xtyArt(card),
    })),
  };

  const unlockedCovers = xtyCards.length;
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
    ['back','หลังการ์ด',groups.back.length], ['xty','TeamBook',groups.xty.length],
  ];

  function syncCurrent() {
    currentArt.dataset.category = selected.category;
    currentArt.innerHTML = selected.art;
    currentTitle.textContent = selected.title;
    currentSub.textContent = selected.subtitle;
    if (!hint) return;
    hint.textContent = unlockedCovers
      ? `เลือกไว้ ${selected.title} · มีปกให้เลือก ${total} แบบ กด “เปลี่ยนปก” เพื่อเปิดคลัง`
      : 'สมุดนี้ใช้หลังการ์ดเป็นปก · เปิดสมุดต่อได้เลย ไม่ต้องรอ — ปกแบบอื่นมาจากการ์ดที่ได้ตอนเล่นสมุดจนจบช่วง';
  }

  function renderCategory() {
    grid.innerHTML = '';
    const list = groups[activeCategory] || [];
    if (!list.length) {
      const empty = document.createElement('p'); empty.className = 'xty-cover-empty';
      empty.textContent = 'ยังไม่มีการ์ดหมวดนี้ที่ใช้เป็นปกได้ · การ์ดได้จากการเล่นสมุดจนจบช่วง';
      grid.appendChild(empty); return;
    }
    for (const item of list) {
      const option = document.createElement('button');
      option.type = 'button'; option.className = 'xty-cover-option'; option.dataset.category = item.category; option.setAttribute('role','radio');
      option.setAttribute('aria-checked', item.key === selected.key ? 'true' : 'false');
      option.setAttribute('aria-label', `ใช้ ${item.title} เป็นปกสมุด`);
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
