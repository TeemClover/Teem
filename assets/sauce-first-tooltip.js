/* AI ใส่ซอส · อธิบายคำว่า “ซอส” ครั้งแรกของแต่ละบท */
const SAUCE_DEFINITION = 'Source คือชุดข้อมูลต้นทางที่ AI ต้องยึดเป็นฐาน เช่น เป้าหมาย ข้อเท็จจริง กติกา ตัวอย่าง น้ำเสียง และข้อห้ามที่จำเป็นต่องาน';

const LESSONS = {
  'lesson-0': {
    label: 'บท 0 · เปิดครัว',
    relation: 'บทนี้เตรียมเครื่องมือที่จะรับและใช้ซอส ก่อนบท 1 จะพาคุณสกัดซอสขวดแรก'
  },
  'learn:free-ai': {
    label: 'บท 1 · SOURCE',
    relation: 'บทนี้เปลี่ยนเสียง ไฟล์ หรือแชตเดิมให้เป็นซอสที่ตรวจแล้ว และบรรจุเป็นไฟล์ .md เพื่อย้ายข้ามแชตหรือข้าม AI'
  },
  'learn:image-ai': {
    label: 'บท 2 · TASTE',
    relation: 'บทนี้ใช้ภาพเป็นช้อนชิม ถ้าภาพหลุดแกน ให้แก้กลับที่ซอส เพื่อให้ภาพถัดไปยึดรายละเอียดชุดเดียวกัน'
  },
  'learn:clip-ai': {
    label: 'บท 3 · COOK',
    relation: 'บทนี้ใช้ซอสคุมสาร ตัวตน และข้อเท็จจริง ก่อนแปลงให้เป็นคลิปสั้นที่พาคนดูไปสู่ Action เดียวที่ชัดเจน'
  },
  'learn:notebooklm': {
    label: 'บท 4 · MULTIPLY',
    relation: 'บทนี้ใช้ซอสขวดเดียวแตกเป็นภาพ สไลด์ เสียง และงานหลายรูปแบบ โดยไม่ให้ข้อเท็จจริงหรือ Canon เพี้ยน'
  },
  'learn:prompts': {
    label: 'บท 5 · SEASON',
    relation: 'บทนี้ให้ซอสเก็บความจริง ส่วน Prompt หรือผงปรุงรสมีหน้าที่เลือกว่าจะนำความจริงนั้นไปทำงานอะไร'
  },
  'learn:first-web': {
    label: 'บท 6 · SERVE',
    relation: 'บทนี้เปลี่ยนซอสให้เป็นไฟล์ HTML ที่คนอื่นเปิดใช้ได้ โดยซอสยังคุมเนื้อหา กติกา และสิ่งที่ห้ามแต่งเพิ่ม'
  },
  'sauce-cup': {
    label: 'บท 1 · ถ้วยซอส',
    relation: 'ตัวอย่างนี้สกัดซอสจากแชตเดิมเป็นข้อความสั้น แล้วส่งให้ AI อีกตัวทำงานต่อ ยังไม่ต้องสร้างไฟล์ .md'
  }
};

const FULL_RELATIONS = {
  1: LESSONS['learn:free-ai'],
  2: LESSONS['learn:image-ai'],
  3: LESSONS['learn:clip-ai'],
  4: LESSONS['learn:notebooklm'],
  5: LESSONS['learn:prompts'],
  6: LESSONS['learn:first-web']
};

function lessonConfig() {
  const path = location.pathname;
  if (/\/classroom\/lesson-0(?:\.html)?$/.test(path)) return { id:'lesson-0', ...LESSONS['lesson-0'] };
  if (/\/classroom\/sauce-cup\//.test(path)) return { id:'sauce-cup', ...LESSONS['sauce-cup'] };
  if (/\/classroom\/full-lessons(?:\.html)?$/.test(path)) {
    const match = location.hash.match(/lesson-(\d)/);
    const number = match && FULL_RELATIONS[match[1]] ? Number(match[1]) : 1;
    return { id:`full-${number}`, ...FULL_RELATIONS[number] };
  }
  const id = document.querySelector('meta[name="mc-item"]')?.content;
  return LESSONS[id] ? { id, ...LESSONS[id] } : null;
}

function contentRoot() {
  if (/\/classroom\/full-lessons(?:\.html)?$/.test(location.pathname)) return document.getElementById('reader');
  return document.querySelector('main') || document.querySelector('body > .wrap') || document.body;
}

function isVisible(element) {
  if (!element || element.closest('[hidden],[aria-hidden="true"]')) return false;
  const style = getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

function firstSauceText(root) {
  if (!root) return null;
  const blocked = 'script,style,noscript,textarea,input,button,a,pre,code,[role="tooltip"],[data-mc-sauce-term]';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.includes('ซอส')) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest(blocked) || !isVisible(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  return walker.nextNode();
}

function injectStyle() {
  if (document.getElementById('mc-sauce-first-style')) return;
  const style = document.createElement('style');
  style.id = 'mc-sauce-first-style';
  style.textContent = `
    .mc-sauce-term{appearance:none;display:inline-flex;align-items:center;gap:.22em;margin:0;border:0;border-bottom:1px dotted currentColor;padding:0 .04em;background:transparent;color:inherit;font-family:inherit!important;font-size:1em!important;font-style:inherit!important;font-weight:inherit!important;letter-spacing:inherit!important;line-height:inherit!important;cursor:help;vertical-align:baseline}.mc-sauce-term__q{display:inline-grid;place-items:center;width:1.18em;height:1.18em;border:1px solid currentColor;border-radius:50%;font-size:.58em;font-weight:900;line-height:1;opacity:.76}.mc-sauce-term[aria-expanded="true"]{border-bottom-style:solid}.mc-sauce-pop{position:fixed;z-index:12000;width:min(360px,calc(100vw - 28px));padding:17px 18px 16px;border:1px solid rgb(190 148 66/.56);border-radius:16px;background:#071a10;color:#f8f6f0;box-shadow:0 20px 50px rgb(0 0 0/.34);font-family:"Anuphan",system-ui,sans-serif;line-height:1.65;opacity:0;visibility:hidden;transform:translateY(5px);transition:opacity .15s,transform .15s,visibility .15s}.mc-sauce-pop[data-open="1"]{opacity:1;visibility:visible;transform:none}.mc-sauce-pop__top{display:flex;align-items:center;justify-content:space-between;gap:12px}.mc-sauce-pop__tag{color:#dfbd70;font:800 10.5px "Bai Jamjuree","Anuphan",sans-serif;letter-spacing:.11em}.mc-sauce-pop__close{width:30px;height:30px;display:grid;place-items:center;border:1px solid rgb(255 255 255/.18);border-radius:50%;background:rgb(255 255 255/.08);color:#fff;font:700 18px/1 sans-serif;cursor:pointer}.mc-sauce-pop h3{margin:5px 0 6px;color:#fff;font:800 20px/1.35 "Bai Jamjuree","Anuphan",sans-serif}.mc-sauce-pop p{margin:0;color:rgb(255 255 255/.76);font-size:13.5px}.mc-sauce-pop__relation{margin-top:10px!important;padding-top:10px;border-top:1px solid rgb(255 255 255/.13);color:rgb(255 255 255/.9)!important}.mc-sauce-pop__relation b{color:#dfbd70}.mc-sauce-pop:after{content:"";position:absolute;left:var(--arrow-left,28px);top:-7px;width:12px;height:12px;rotate:45deg;background:#071a10;border-left:1px solid rgb(190 148 66/.56);border-top:1px solid rgb(190 148 66/.56)}
    @media(max-width:640px){.mc-sauce-pop{left:12px!important;right:12px!important;bottom:12px!important;top:auto!important;width:auto;border-radius:19px;padding:19px 20px calc(18px + env(safe-area-inset-bottom))}.mc-sauce-pop:after{display:none}}
    @media(prefers-reduced-motion:reduce){.mc-sauce-pop{transition:none}}
  `;
  document.head.append(style);
}

let activeButton = null;
let hideTimer = 0;
let pinned = false;

function popover() {
  let pop = document.getElementById('mcSauceFirstPop');
  if (pop) return pop;
  pop = document.createElement('aside');
  pop.id = 'mcSauceFirstPop';
  pop.className = 'mc-sauce-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'false');
  pop.setAttribute('aria-labelledby', 'mcSauceFirstTitle');
  pop.innerHTML = `<div class="mc-sauce-pop__top"><span class="mc-sauce-pop__tag"></span><button class="mc-sauce-pop__close" type="button" aria-label="ปิดคำอธิบาย">×</button></div><h3 id="mcSauceFirstTitle">ซอส = Source</h3><p class="mc-sauce-pop__definition"></p><p class="mc-sauce-pop__relation"></p>`;
  pop.querySelector('.mc-sauce-pop__close').addEventListener('click', closePopover);
  pop.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  pop.addEventListener('pointerleave', () => scheduleClose());
  document.body.append(pop);
  return pop;
}

function positionPopover(button, pop) {
  if (innerWidth <= 640) return;
  const rect = button.getBoundingClientRect();
  const width = Math.min(360, innerWidth - 28);
  let left = Math.max(14, Math.min(rect.left, innerWidth - width - 14));
  let top = rect.bottom + 10;
  if (top + pop.offsetHeight > innerHeight - 14) top = Math.max(14, rect.top - pop.offsetHeight - 10);
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.style.setProperty('--arrow-left', `${Math.max(18, Math.min(rect.left + rect.width / 2 - left - 6, width - 30))}px`);
}

function track(config) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event:'sauce_first_tooltip_open', lesson:config.id });
}

function openPopover(button, config, shouldPin = false) {
  clearTimeout(hideTimer);
  if (activeButton && activeButton !== button) activeButton.setAttribute('aria-expanded', 'false');
  activeButton = button;
  pinned = shouldPin || (pinned && activeButton === button);
  const pop = popover();
  pop.querySelector('.mc-sauce-pop__tag').textContent = config.label;
  pop.querySelector('.mc-sauce-pop__definition').textContent = SAUCE_DEFINITION;
  pop.querySelector('.mc-sauce-pop__relation').innerHTML = `<b>เกี่ยวกับบทนี้:</b> ${config.relation}`;
  button.setAttribute('aria-expanded', 'true');
  pop.dataset.open = '1';
  requestAnimationFrame(() => positionPopover(button, pop));
  if (button.dataset.mcSauceTracked !== '1') {
    button.dataset.mcSauceTracked = '1';
    track(config);
  }
}

function closePopover() {
  clearTimeout(hideTimer);
  if (activeButton) activeButton.setAttribute('aria-expanded', 'false');
  const pop = document.getElementById('mcSauceFirstPop');
  if (pop) pop.dataset.open = '0';
  activeButton = null;
  pinned = false;
}

function scheduleClose() {
  if (pinned) return;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(closePopover, 130);
}

function wrapFirstSauce() {
  const config = lessonConfig();
  const root = contentRoot();
  if (!config || !root) return false;
  let existing = root.querySelector('[data-mc-sauce-term]');
  let text = firstSauceText(root);
  if (existing) {
    const candidateComesFirst = text && (text.compareDocumentPosition(existing) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (isVisible(existing) && !candidateComesFirst) return true;
    existing.replaceWith(document.createTextNode('ซอส'));
    existing = null;
    text = firstSauceText(root);
  }
  if (!text) return false;
  const index = text.nodeValue.indexOf('ซอส');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mc-sauce-term';
  button.dataset.mcSauceTerm = '1';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML = 'ซอส<span class="mc-sauce-term__q" aria-hidden="true">?</span>';
  const fragment = document.createDocumentFragment();
  fragment.append(text.nodeValue.slice(0, index), button, text.nodeValue.slice(index + 3));
  text.replaceWith(fragment);
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.getAttribute('aria-expanded') === 'true' && pinned) closePopover();
    else openPopover(button, lessonConfig() || config, true);
  });
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') openPopover(button, lessonConfig() || config);
  });
  button.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') scheduleClose();
  });
  button.addEventListener('focus', () => requestAnimationFrame(() => {
    if (button.matches(':focus-visible')) openPopover(button, lessonConfig() || config);
  }));
  button.addEventListener('blur', scheduleClose);
  return true;
}

function apply() {
  injectStyle();
  const root = contentRoot();
  if (!root) return;
  let refreshTimer = 0;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(wrapFirstSauce, 40);
  };
  wrapFirstSauce();
  const observer = new MutationObserver(() => {
    refresh();
  });
  observer.observe(root, { childList:true, subtree:true });
  setTimeout(wrapFirstSauce, 250);
  setTimeout(wrapFirstSauce, 1000);
}

document.addEventListener('click', event => {
  if (!event.target.closest?.('.mc-sauce-pop,.mc-sauce-term')) closePopover();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePopover(); });
addEventListener('resize', () => { if (activeButton) positionPopover(activeButton, popover()); });
addEventListener('scroll', () => { if (activeButton) positionPopover(activeButton, popover()); }, { passive:true });
addEventListener('hashchange', () => {
  closePopover();
  setTimeout(wrapFirstSauce, 0);
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once:true });
else apply();
