// Render the private lesson Markdown as DOM nodes; raw HTML is always text.
// Bodies arrive only from the authenticated lesson endpoint, never a static bundle.
import { safeAssetUrl, parseRoute } from './learn-core.js';

export function readingHref(value, origin) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return null;
  if (safeAssetUrl(value, origin)) return value;
  try {
    const url = new URL(value, origin);
    if (url.origin === origin && url.pathname === '/learn/' && parseRoute(url.search).courseId) return url.pathname + url.search;
    if (url.origin === origin && ['/ai-source/', '/learn/classroom/'].includes(url.pathname)) return url.pathname + url.search + url.hash;
    if (/^https:\/\//i.test(value) && url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* leave unsupported links as readable text */ }
  return null;
}

export function renderLessonReading(container, markdown, { origin = window.location.origin, onLesson, onResource, resourcesLocked = false } = {}) {
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
          if (resourcesLocked && href.startsWith('/api/learn-media?')) a.append(document.createTextNode(' · ไฟล์ในคอร์สเต็ม'));
          if (href.startsWith('/learn/?') && onLesson) a.addEventListener('click', event => { event.preventDefault(); onLesson(parseRoute(new URL(href, origin).search)); });
          else if (href.startsWith('/api/learn-media?') && onResource) a.addEventListener('click', event => { if (onResource(href) === false) event.preventDefault(); });
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
      const code = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      const pre = node('pre'); pre.append(node('code', code.join('\n'))); container.append(pre); continue;
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
    const p = node('p'); inline(p, paragraph.join('\n')); container.append(p);
  }
}
