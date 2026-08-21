/* XTY Legacy brand layer.
   Keep the original notebook-language engine intact while clearly presenting
   /xty as the development-stage ancestor of the standalone TeamBook product. */

import './language-core.js?v=20260821-legacy1';

const LEGACY_LOGO = '/xty/assets/xty-logo.png';
const LEGACY_SHARE = '/xty/assets/xty-og-share-1200x630.jpg';
const CURRENT_BRAND_ASSET = /\/xty\/assets\/brand\/teambook-(?:logo|icon-512|mark-256|icon-180)\.png(?:[?#].*)?$/i;

function legacyCopy(value) {
  return String(value ?? '')
    .replace(/TEAMBOOK/g, 'XTY LEGACY')
    .replace(/TeamBook/g, 'XTY Legacy');
}

function isHumanContent(node) {
  const el = node?.parentElement;
  if (!el) return true;
  if (el.closest('[data-xty-no-translate]')) return true;
  if (['SCRIPT','STYLE','NOSCRIPT','CODE','PRE'].includes(el.tagName)) return true;
  if (el.matches('#pname, #act, #ruleText, #sheetRule, .who, .al, .seat-card-name, .tb-card-name')) return true;
  if (el.matches('#log .txt')) return true;
  if (el.matches('#mainParty h2')) return true;
  if (el.matches('#leadPartyRows .tx > b, #joinedPartyRows .tx > b')) return true;
  return false;
}

function brandText(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (isHumanContent(root)) return;
    const next = legacyCopy(root.data);
    if (next !== root.data) root.data = next;
    return;
  }
  if (root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.ELEMENT_NODE) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  for (const textNode of nodes) {
    if (isHumanContent(textNode)) continue;
    const next = legacyCopy(textNode.data);
    if (next !== textNode.data) textNode.data = next;
  }
}

function brandAssets(root = document) {
  root.querySelectorAll?.('img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (!CURRENT_BRAND_ASSET.test(src)) return;
    img.setAttribute('src', LEGACY_LOGO);
    img.setAttribute('alt', 'XTY Legacy');
  });

  document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes('/xty/assets/brand/')) {
      link.setAttribute('href', LEGACY_LOGO);
      link.setAttribute('type', 'image/png');
    }
  });

  document.querySelectorAll('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]').forEach(meta => {
    const value = meta.getAttribute('content') || '';
    if (value.includes('/xty/assets/brand/teambook-og-1200x630.jpg')) {
      meta.setAttribute('content', new URL(LEGACY_SHARE, location.origin).href);
    }
  });

  document.querySelectorAll('meta[content]').forEach(meta => {
    const before = meta.getAttribute('content') || '';
    const after = legacyCopy(before);
    if (after !== before) meta.setAttribute('content', after);
  });
}

function installLegacyBadge() {
  if (document.getElementById('xtyLegacyBrandStyle')) return;
  const style = document.createElement('style');
  style.id = 'xtyLegacyBrandStyle';
  style.textContent = `
    html[data-xty-legacy="true"] .top .mark img{width:auto;max-width:116px;max-height:44px;object-fit:contain}
    html[data-xty-legacy="true"] .welcome-logo{width:min(260px,72vw)!important;height:auto!important;object-fit:contain!important}
    .xty-legacy-badge{display:inline-flex;align-items:center;min-height:24px;padding:3px 8px;border:1px solid rgba(106,91,67,.24);border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#756953;background:rgba(255,255,255,.58);white-space:nowrap}
  `;
  document.head.appendChild(style);

  const top = document.querySelector('.top');
  const mark = top?.querySelector('.mark');
  if (top && mark && !top.querySelector('.xty-legacy-badge')) {
    const badge = document.createElement('span');
    badge.className = 'xty-legacy-badge';
    badge.textContent = 'Legacy';
    mark.insertAdjacentElement('afterend', badge);
  }
}

function applyLegacyBrand(root = document) {
  if (!location.pathname.startsWith('/xty/')) return;
  document.documentElement.dataset.xtyLegacy = 'true';
  brandAssets(root.nodeType === Node.ELEMENT_NODE ? root : document);
  brandText(root);
  document.title = legacyCopy(document.title);
  installLegacyBadge();
}

if (location.pathname.startsWith('/xty/')) {
  applyLegacyBrand(document);
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => applyLegacyBrand(node));
      if (mutation.type === 'characterData') applyLegacyBrand(mutation.target);
    }
  });
  observer.observe(document.documentElement, {subtree:true, childList:true, characterData:true});
  window.XTYLegacyBrand = Object.freeze({apply: () => applyLegacyBrand(document)});
}
