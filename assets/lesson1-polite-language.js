/* AI ใส่ซอส · บท 1 ใช้ภาษาสุภาพกับผู้เรียนใหม่
   แก้เฉพาะ /classroom/free-ai.html และครอบคลุมข้อความที่ถูกสร้างภายหลัง
   บท 7 ยังคงภาษาบอสเดิม
*/

function isLessonOne() {
  return /\/classroom\/free-ai\.html$/.test(location.pathname);
}

const ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

function replaceText(root) {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    if (!SKIP.has(root.parentElement?.tagName) && root.nodeValue?.includes('มึง')) {
      root.nodeValue = root.nodeValue.replaceAll('มึง', 'คุณ');
    }
    return;
  }

  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;

  if (root instanceof Element) {
    if (SKIP.has(root.tagName)) return;
    ATTRIBUTES.forEach(name => {
      const value = root.getAttribute(name);
      if (value?.includes('มึง')) root.setAttribute(name, value.replaceAll('มึง', 'คุณ'));
    });
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!SKIP.has(node.parentElement?.tagName) && node.nodeValue?.includes('มึง')) {
      node.nodeValue = node.nodeValue.replaceAll('มึง', 'คุณ');
    }
  }

  if (root.querySelectorAll) {
    root.querySelectorAll(ATTRIBUTES.map(name => `[${name}]`).join(',')).forEach(element => {
      ATTRIBUTES.forEach(name => {
        const value = element.getAttribute(name);
        if (value?.includes('มึง')) element.setAttribute(name, value.replaceAll('มึง', 'คุณ'));
      });
    });
  }
}

function alignLessonOneBrandAndEnding() {
  if (!isLessonOne()) return;

  const brand = document.querySelector('nav.top .bk');
  if (brand) {
    brand.href = '/';
    brand.setAttribute('aria-label', 'myClover');
    brand.innerHTML = 'my<em>Clover</em>';
  }

  if (document.getElementById('mcLesson1Prologue')) return;
  const nextRow = document.querySelector('.nextrow');
  if (!nextRow) return;

  if (!document.getElementById('mcLesson1PrologueStyle')) {
    const style = document.createElement('style');
    style.id = 'mcLesson1PrologueStyle';
    style.textContent = `
      #mcLesson1Prologue{width:min(1024px,calc(100vw - 32px));margin:34px 0 28px 50%;transform:translateX(-50%)}
      #mcLesson1Prologue img{display:block;width:100%;height:auto;max-width:none}
    `;
    document.head.appendChild(style);
  }

  const figure = document.createElement('figure');
  figure.id = 'mcLesson1Prologue';
  figure.innerHTML = '<img src="/classroom/sauce-cup/header-prologue.jpeg" width="1024" height="1536" alt="จากกระดาษ A4 1 แผ่น สู่จุดเริ่มต้นของ AI ใส่ซอส">';
  nextRow.before(figure);
}

function boot() {
  if (!isLessonOne() || document.documentElement.dataset.lesson1Polite === '1') return;
  document.documentElement.dataset.lesson1Polite = '1';
  replaceText(document.body);
  alignLessonOneBrandAndEnding();

  let queued = false;
  const observer = new MutationObserver(records => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      records.forEach(record => {
        record.addedNodes.forEach(replaceText);
        if (record.type === 'characterData') replaceText(record.target);
        if (record.type === 'attributes') replaceText(record.target);
      });
      alignLessonOneBrandAndEnding();
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
