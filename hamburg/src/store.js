import { brandIds, config, normalizeCart, offerById } from './product.js';
import { newId } from './id.js';
const prefix = 'hamburg:v1:';
const memory = new Map();
export function read(key, fallback) {
  if (memory.has(key)) return memory.get(key);
  try { return JSON.parse(localStorage.getItem(prefix + key) ?? 'null') ?? fallback; }
  catch { return memory.get(key) ?? fallback; }
}
export function write(key, value) {
  memory.set(key, value);
  try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* Tab memory fallback. */ }
}
function id(key) {
  let value = read(key, null);
  if (!value) { value = newId(); write(key, value); }
  return value;
}
export const visitorId = id('visitor');
export const sessionId = (() => {
  try {
    let value = sessionStorage.getItem(prefix + 'session');
    if (!value) { value = newId(); sessionStorage.setItem(prefix + 'session', value); }
    return value;
  } catch { return newId(); }
})();
export const boothOrder = (() => {
  let order = read('boothOrder', null);
  if (!Array.isArray(order) || order.length !== 3 || new Set(order).size !== 3 || order.some(b => !brandIds.includes(b))) {
    order = [...brandIds];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]];
    }
    write('boothOrder', order);
  }
  return order;
})();
const params = new URLSearchParams(location.search);
const sessionContextKey = prefix + 'entryContext';
let entryContext = {};
try { entryContext = JSON.parse(sessionStorage.getItem(sessionContextKey) || '{}'); } catch { /* Session fallback. */ }
if (params.get('entry') === 'assigned') {
  const requestedBrand = params.get('brand');
  const pathBrand = location.pathname.split('/').filter(Boolean).at(-1);
  const requested = brandIds.includes(requestedBrand) ? requestedBrand : pathBrand;
  if (brandIds.includes(requested)) {
    if (!brandIds.includes(read('assignment', null))) write('assignment', requested);
    entryContext = { entryMode: 'assigned_landing', assignment: read('assignment', requested) };
  }
}
export const entryMode = entryContext.entryMode === 'assigned_landing' ? 'assigned_landing' : 'arena_choice';
export const assignment = entryMode === 'assigned_landing' ? entryContext.assignment : null;
const safeAttribution = { ...(entryContext.source || {}) };
for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
  const value = params.get(key);
  if (value && /^[\p{L}\p{N}_. -]{1,80}$/u.test(value)) safeAttribution[key] = value;
}
try { sessionStorage.setItem(sessionContextKey, JSON.stringify({ entryMode, assignment, source: safeAttribution })); } catch { /* Session fallback. */ }
export function record(event, brandId = null, details = {}) {
  if (event === 'purchase_confirmed') throw new Error('Preview cannot confirm purchases');
  // An allowlist prevents accidental collection of checkout fields or personal data.
  const clean = {};
  for (const key of ['offer_id', 'quantity', 'section_id']) if (details[key] !== undefined) clean[key] = details[key];
  const row = {
    event_id: newId(), event, timestamp: new Date().toISOString(),
    visitor_id: visitorId, session_id: sessionId, brand_id: brandId,
    entry_mode: entryMode, booth_order: boothOrder, first_selected_brand: read('firstBrand', null),
    assignment, source: safeAttribution, sales_mode: config.salesMode, ...clean
  };
  write('events', [...read('events', []), row].slice(-10000));
  return row;
}
export function selectBooth(brand) {
  if (!read('firstBrand', null)) write('firstBrand', brand);
  record('booth_select', brand);
}
export function getCart(brand) {
  const rows = normalizeCart(read('cart:' + brand, {}));
  return Object.fromEntries(rows.map(row => [row.id, row.quantity]));
}
export function changeCart(brand, offerId, quantity) {
  if (!brandIds.includes(brand) || !offerById(offerId) || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) return false;
  const cart = getCart(brand);
  if (quantity === 0) delete cart[offerId]; else cart[offerId] = quantity;
  write('cart:' + brand, cart);
  return true;
}
