// Render the private lesson Markdown as DOM nodes; raw HTML is always text.
// Bodies arrive only from the authenticated lesson endpoint, never a static bundle.
import { safeAssetUrl, parseRoute } from './learn-core.js?v=guided-0921';

export function readingHref(value, origin) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return null;
  if (safeAssetUrl(value, origin)) return value;
  try {
    const url = new URL(value, origin);
    if (['https://chatgpt.com/', 'https://claude.ai/', 'https://gemini.google.com/'].includes(url.href)) return url.href;
    if (url.origin === origin && url.pathname === '/learn/' && parseRoute(url.search).courseId) return url.pathname + url.search;
    if (url.origin === origin && url.pathname === '/classroom/dungeon/' && !url.username && !url.password) return url.pathname + url.search + url.hash;
  } catch { /* leave unsupported links as readable text */ }
  return null;
}

export function parseReadingDiagram(source) {
  try {
    const value = JSON.parse(source);
    if (!value || typeof value.title !== 'string' || !Array.isArray(value.steps) || !value.steps.length || value.steps.length > 12) return null;
    if (!value.steps.every(step => step && typeof step.label === 'string' && typeof step.detail === 'string')) return null;
    return { title: value.title.slice(0, 200), steps: value.steps.map(step => ({ label: step.label.slice(0, 200), detail: step.detail.slice(0, 1200) })), caption: typeof value.caption === 'string' ? value.caption.slice(0, 1200) : '' };
  } catch { return null; }
}

export function renderLessonReading(container, markdown, { origin = window.location.origin, onLesson, onResource, resourcesLocked = false, copyText = text => globalThis.navigator.clipboard.writeText(text) } = {}) {
  container.replaceChildren();
  if (typeof markdown !== 'string' || !markdown.trim()) { container.hidden = true; return; }
  container.hidden = false;
  const node = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  const inline = (parent, text) => {
    const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)/g;
    let start = 0, match;
    while ((match = re.exec(text))) {
      if (match.index > start) parent.append(document.createTextNode(text.slice(start, match.index)));
      if (match[1]) parent.append(node('strong', match[1]));
      else if (match[2]) parent.append(node('code', match[2]));
      else {
        const href = readingHref(match[4], origin);
        const a = node(href ? 'a' : 'span', match[3]);
        if (href) {
          a.href = href;
          if (resourcesLocked && safeAssetUrl(href, origin)) a.append(document.createTextNode(' · ไฟล์ในคอร์สเต็ม'));
          if (href.startsWith('/learn/?') && onLesson) a.addEventListener('click', event => { event.preventDefault(); onLesson(parseRoute(new URL(href, origin).search)); });
          else if (safeAssetUrl(href, origin) && onResource) a.addEventListener('click', event => { if (onResource(href) === false) event.preventDefault(); });
          if (!href.startsWith('/learn/?')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        }
        parent.append(a);
      }
      start = re.lastIndex;
    }
    if (start < text.length) parent.append(document.createTextNode(text.slice(start)));
  };
  const lines = markdown.replace(/\r\n?/g, '\n').slice(0, 200000).split('\n');
  let i = 0;
  const special = line => /^(?:#{1,6}\s|\s*[-*]\s|\s*\d+[.)]\s|>\s?|```|\s*---\s*$)/.test(line);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const language = line.slice(3).trim().toLowerCase();
      const code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      const text = code.join('\n'), diagram = language === 'diagram' ? parseReadingDiagram(text) : null;
      if (diagram) {
        const figure = node('figure'); figure.className = 'reading-diagram';
        figure.append(node('figcaption', diagram.title));
        const steps = node('ol'); steps.className = 'diagram-steps';
        diagram.steps.forEach((step, index) => {
          const item = node('li'), number = node('span', String(index + 1).padStart(2, '0'));
          number.className = 'diagram-number'; number.setAttribute('aria-hidden', 'true');
          item.append(number, node('strong', step.label), node('p', step.detail)); steps.append(item);
        });
        figure.append(steps); if (diagram.caption) figure.append(node('p', diagram.caption)); container.append(figure);
      } else {
        const reference = ['template', 'reference'].includes(language);
        const block = node(reference ? 'details' : 'div'); block.className = 'copy-block' + (reference ? ' reading-reference' : '');
        if (reference) { block.append(node('summary', 'ดูโครงสร้างประกอบ · ไม่ต้องกรอกเอง')); block.append(node('p', 'ใช้ปุ่มให้ AI พาทำด้านบนก่อน ส่วนนี้เก็บไว้ดูรูปแบบและทำความเข้าใจผลลัพธ์')); }
        const label = reference ? 'โครงสร้างอ้างอิง' : language === 'example' ? 'ตัวอย่างประกอบ · ไม่ใช่ข้อมูลจริงของคุณ' : language === 'prompt' ? 'คำสั่งสำหรับส่งในแชต AI' : 'ข้อความประกอบบทเรียน';
        const bar = node('div'); bar.className = 'copy-bar'; bar.append(node('span', label));
        const copy = node('button', reference ? 'คัดลอกโครงสร้าง' : 'คัดลอก'); copy.type = 'button'; copy.className = 'copy-button';
        const feedback = node('span'); feedback.className = 'copy-feedback'; feedback.setAttribute('role', 'status');
        copy.addEventListener('click', async () => {
          copy.disabled = true;
          try { await copyText(text); feedback.textContent = 'คัดลอกแล้ว'; }
          catch {
            feedback.textContent = 'เลือกข้อความด้านล่าง แล้วกดคัดลอก';
            let field = block.querySelector('textarea');
            if (!field) { field = node('textarea'); field.value = text; field.readOnly = true; field.setAttribute('aria-label', 'ข้อความพร้อมคัดลอก'); field.rows = Math.min(12, Math.max(4, code.length)); block.append(field); }
            field.focus(); field.select();
          } finally { copy.disabled = false; }
        });
        bar.append(copy, feedback); block.append(bar);
        const pre = node('pre'); pre.tabIndex = 0; pre.setAttribute('aria-label', 'ข้อความสำหรับคัดลอก เลื่อนเพื่ออ่านทั้งหมด');
        pre.append(node('code', text)); block.append(pre); container.append(block);
      }
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { const h = node('h' + Math.min(6, heading[1].length + 2)); inline(h, heading[2]); container.append(h); i++; continue; }
    if (/^\s*---\s*$/.test(line)) { container.append(node('hr')); i++; continue; }
    if (/^>/.test(line)) {
      const quote = node('blockquote');
      while (i < lines.length && /^>/.test(lines[i])) { const p = node('p'); inline(p, lines[i++].replace(/^>\s?/, '')); quote.append(p); }
      container.append(quote); continue;
    }
    const list = /^\s*(?:([-*])|(\d+)[.)])\s+(.+)$/.exec(line);
    if (list) {
      const ordered = Boolean(list[2]), ul = node(ordered ? 'ol' : 'ul');
      while (i < lines.length) {
        const m = /^\s*(?:([-*])|(\d+)[.)])\s+(.+)$/.exec(lines[i]);
        if (!m || Boolean(m[2]) !== ordered) break;
        const li = node('li'); inline(li, m[3]); ul.append(li); i++;
      }
      container.append(ul); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !special(lines[i])) paragraph.push(lines[i++]);
    const text = paragraph.join('\n'), p = node('p');
    if (/^\*\*[^*]+\*\*$/.test(text.trim())) p.className = 'reading-keypoint';
    inline(p, text); container.append(p);
  }
}
