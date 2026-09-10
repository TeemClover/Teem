/** Optional knowledge → practice links. No tracking, storage or progress gates. */
import { validId } from '../assets/front-door/contract.js';
export const CARE_TOPICS = Object.freeze(['xvisor-context', 'care-framework', 'certification', 'privacy-boundary']);
const CARRY_PATHS = new Set(['/xircle/', '/xircle/learn/', '/xircle/learn/topic/', '/xircle/doc/xvisor/', '/xvisor/', '/meet/']);

export function careTopic(search) {
  const query = new URLSearchParams(search);
  return query.getAll('t').length === 1 && CARE_TOPICS.includes(query.get('t'));
}

/** Pass only an already-present opaque reference; never copy visitor answers. */
export function onwardHref(href, location) {
  const query = new URLSearchParams(location.search);
  const handoff = query.getAll('fdh').length === 1 ? query.get('fdh') : null;
  if (!validId(handoff, 'h')) return href;
  try {
    const url = new URL(href, location.origin);
    if (url.origin !== location.origin || !CARRY_PATHS.has(url.pathname)) return href;
    url.searchParams.set('fdh', handoff);
    return url.pathname + url.search + url.hash;
  } catch { return href; }
}

export function setupXvisorPath(document, location) {
  const topic = document.querySelector('[data-xvisor-topic-bridge]');
  if (topic) topic.hidden = !careTopic(location.search);
  const returning = document.querySelector('[data-xircle-return]');
  const query = new URLSearchParams(location.search);
  if (returning) returning.hidden = !(query.getAll('from').length === 1 && query.get('from') === 'xircle');
  const carry = anchor => {
    if (!anchor?.getAttribute) return;
    const href = anchor.getAttribute('href');
    if (href) anchor.setAttribute('href', onwardHref(href, location));
  };
  document.querySelectorAll('a[href]').forEach(carry);
  // Search results and the reference navigation can be assembled after this module.
  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType !== 1) return;
    if (node.matches('a[href]')) carry(node);
    node.querySelectorAll('a[href]').forEach(carry);
  })));
  observer.observe(document.body, {childList:true, subtree:true});
  document.addEventListener('click', event => carry(event.target.closest?.('a[href]')), true);
}

if (globalThis.document) setupXvisorPath(document, location);
