/* myClover Collection · Achievement artwork + collapsible groups
   Surgical UI patch. Core achievement state/filter/render logic stays in collection.js. */

if (/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) {
  const COLLAPSE_KEY = 'mc_collection_collapsed_v1';

  function readCollapsed() {
    try {
      const value = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]');
      return new Set(Array.isArray(value) ? value : []);
    } catch {
      return new Set();
    }
  }

  const collapsed = readCollapsed();

  function saveCollapsed() {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed])); } catch { /* private mode */ }
  }

  function ensureStyles() {
    if (document.getElementById('collection-achievement-polish-style')) return;
    const style = document.createElement('style');
    style.id = 'collection-achievement-polish-style';
    style.textContent = `
      #album .group-head{position:relative}
      #album .collection-collapse-toggle{
        flex:0 0 auto;display:inline-grid;place-items:center;width:38px;height:38px;
        margin-left:8px;border:1px solid rgb(18 40 28/.12);border-radius:999px;
        background:rgb(255 255 255/.72);color:rgb(18 40 28);cursor:pointer;
        font:800 18px/1 system-ui,sans-serif;transition:background .16s,border-color .16s,transform .16s;
      }
      #album .collection-collapse-toggle:hover{background:#fff;border-color:rgb(190 148 66/.55)}
      #album .collection-collapse-toggle:focus-visible{outline:3px solid rgb(190 148 66/.55);outline-offset:3px}
      #album .collection-collapse-toggle .chev{display:block;transition:transform .18s ease}
      #album .group.is-collapsed .collection-collapse-toggle .chev{transform:rotate(-90deg)}
      #album .group.is-collapsed > .grid,
      #album .group.is-collapsed > .mini-achievement-grid{display:none!important}
      #album .group-head[data-collapse-ready="1"] > div:first-child{cursor:pointer}
      @media(max-width:620px){
        #album .collection-collapse-toggle{width:34px;height:34px;margin-left:4px;font-size:16px}
      }
    `;
    document.head.appendChild(style);
  }

  function setText(root, selector, value) {
    const el = root.querySelector(selector);
    if (el && el.textContent !== value) el.textContent = value;
  }

  function ensureCardImage(card, src, styleText) {
    const art = card && card.querySelector('.ach-art');
    if (!art) return;
    let img = art.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      art.insertBefore(img, art.firstChild);
    }
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    if (styleText !== undefined) img.setAttribute('style', styleText);
  }

  function polishCards(root) {
    const blacksmith = root.querySelector('[data-id="blacksmith"]');
    if (blacksmith) {
      ensureCardImage(
        blacksmith,
        '/forge/original/07.jpeg?v=20260813-blacksmith-crt',
        'object-position:center top;transform:scale(1.34);transform-origin:center top'
      );
    }

    const ep7 = root.querySelector('[data-id="forge-7"]');
    if (ep7) {
      ensureCardImage(
        ep7,
        '/forge/img/07-p1.jpg?v=20260813-ep7-crop',
        'object-position:center 15%;transform:scale(1.12);transform-origin:center 15%'
      );
    }

    const awakened = root.querySelector('[data-id="awakened"]');
    if (awakened) {
      setText(awakened, '.kind', 'SIGIL · DUNGEON 5/5');
      const nameParts = awakened.querySelectorAll('.ach-name span');
      if (nameParts.length) nameParts[nameParts.length - 1].textContent = 'ผู้ตื่นรู้ · AWAKENED';
      const unlocked = awakened.classList.contains('unlocked');
      const hint = awakened.querySelector('.hint');
      if (hint) hint.innerHTML = unlocked
        ? '<b>✓ ปลดแล้ว</b> — เปิดหีบ THE DUNGEON ที่ 5/5 และได้รับตรา AWAKENED'
        : '<b>ปลดเมื่อ</b> เปิดหีบ THE DUNGEON ที่ 5/5 และได้รับตรา AWAKENED';
      if (awakened.tagName === 'A') awakened.setAttribute('href', '../classroom/dungeon/');
      setText(awakened, '.go', 'ไป THE DUNGEON →');
      ensureCardImage(awakened, '../img/achievement-awakened.jpg?v=20260813-1', 'object-position:center center');
    }

    const song = root.querySelector('[data-id="clover-song-2010"]');
    if (song) {
      ensureCardImage(song, '../img/achievement-clover-song.jpg?v=20260813-1', 'object-position:center center');
    }
  }

  function groupKey(section, index) {
    if (section.dataset.collapseKey) return section.dataset.collapseKey;
    const eyebrow = (section.querySelector('.eyebrow')?.textContent || '').toUpperCase();
    const title = section.querySelector('h2')?.textContent || '';
    let key = '';
    if (eyebrow.includes('STORY COLLECTION')) key = 'story';
    else if (eyebrow.includes('CLASSROOM COLLECTION')) key = 'learn';
    else if (eyebrow.includes('WORLD & PROOF')) key = 'world';
    else if (eyebrow.includes('BADGES & SECRET ROUTE')) key = 'badges';
    else if (eyebrow.includes('CORE7 ACHIEVEMENTS')) key = 'core7';
    else if (eyebrow.includes('MINI ACHIEVEMENTS') || title.includes('ด่านบอส')) key = 'dungeon-events';
    else if (eyebrow.includes('HIDDEN ORIGIN')) key = 'genesis';
    else key = `group-${index}`;
    section.dataset.collapseKey = key;
    return key;
  }

  function applyCollapsed(section, button, content, key) {
    const isCollapsed = collapsed.has(key);
    section.classList.toggle('is-collapsed', isCollapsed);
    button.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    button.setAttribute('aria-label', `${isCollapsed ? 'ขยาย' : 'ย่อ'} ${section.querySelector('h2')?.textContent || 'หมวดรางวัล'}`);
    if (content) content.hidden = false;
  }

  function upgradeGroups(root) {
    ensureStyles();
    root.querySelectorAll(':scope > .group').forEach((section, index) => {
      const head = section.querySelector(':scope > .group-head');
      const content = section.querySelector(':scope > .grid, :scope > .mini-achievement-grid');
      if (!head || !content) return;
      const key = groupKey(section, index);
      if (!content.id) content.id = `collection-group-${key}`;

      let button = head.querySelector('.collection-collapse-toggle');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'collection-collapse-toggle';
        button.innerHTML = '<span class="chev" aria-hidden="true">⌄</span>';
        button.setAttribute('aria-controls', content.id);
        head.appendChild(button);

        const toggle = () => {
          if (collapsed.has(key)) collapsed.delete(key);
          else collapsed.add(key);
          saveCollapsed();
          applyCollapsed(section, button, content, key);
        };
        button.addEventListener('click', event => { event.stopPropagation(); toggle(); });
        const titleArea = head.querySelector(':scope > div:first-child');
        if (titleArea) {
          titleArea.setAttribute('role', 'button');
          titleArea.setAttribute('tabindex', '0');
          titleArea.addEventListener('click', toggle);
          titleArea.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggle();
            }
          });
        }
        head.dataset.collapseReady = '1';
      }
      applyCollapsed(section, button, content, key);
    });
  }

  function polish() {
    const root = document.getElementById('album');
    if (!root) return;
    polishCards(root);
    upgradeGroups(root);
  }

  function boot() {
    const root = document.getElementById('album');
    if (!root) return;
    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; polish(); });
    };
    new MutationObserver(queue).observe(root, { childList:true, subtree:true });
    window.addEventListener('mc:mini-achievement', queue);
    document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => setTimeout(queue, 0)));
    queue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
}
