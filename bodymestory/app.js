import { ADS_CONSENT_KEY, createAdsConsent, readAttribution, safeQuery, safeHash, buildLeadPayload, successfulDownload, leadErrorMessage, canTrackLead } from './flow.mjs';

const attribution = readAttribution(location.search);
const publicQuery = safeQuery(attribution);
// Strip any non-public parameters before a visitor may opt in to a pixel.
const publicHash = safeHash(location.hash);
if (location.search !== publicQuery || location.hash !== publicHash) history.replaceState(null, '', `${location.pathname}${publicQuery}${publicHash}`);
document.querySelectorAll('[data-attribution-link]').forEach(link => { link.href = `${link.getAttribute('href').split('?')[0]}${publicQuery}`; });

let pixelId = null;
let pixelLoaded = false;
let configPending = null;
let sdkPending = null;
let pageViewed = false;
let completedEvent = null;
let leadTracked = false;
const consent = createAdsConsent({
  readStorage: () => localStorage.getItem(ADS_CONSENT_KEY),
  writeStorage: value => localStorage.setItem(ADS_CONSENT_KEY, value),
  onChange: value => {
    if (value !== 'granted' && pixelLoaded) window.fbq('consent', 'revoke');
    renderConsent();
  }
});

function renderConsent() {
  const banner = document.querySelector('[data-consent-banner]');
  if (banner) banner.hidden = consent.value !== null;
  const status = consent.value === 'granted' ? 'อนุญาตแล้ว' : 'ยังไม่อนุญาต';
  document.querySelectorAll('[data-consent-status]').forEach(node => { node.textContent = status; });
}

async function ensurePixel() {
  if (consent.current() !== 'granted') return;
  if (!['www.myclover.com', 'myclover.com'].includes(location.hostname)) return;
  if (!pixelId) {
    if (!configPending) configPending = (async () => { try {
      const response = await fetch('/api/bodymestory?public=config', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const config = await response.json();
      if (response.ok && /^\d{5,25}$/.test(config.pixelId || '')) pixelId = config.pixelId;
    } catch { /* Config failures never block the free resource. */ } finally { configPending = null; } })();
    await configPending;
  }
  if (!pixelId || consent.current() !== 'granted') return;
  if (!pixelLoaded) {
    if (!sdkPending) sdkPending = new Promise(resolve => {
      if (typeof window.fbq?.callMethod === 'function') { resolve(true); return; }
      if (!window.fbq) {
        const queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
        queue.push = queue; queue.loaded = true; queue.version = '2.0'; queue.queue = [];
        window.fbq = queue; if (!window._fbq) window._fbq = queue;
      }
      const script = document.createElement('script'); script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.onload = () => resolve(typeof window.fbq?.callMethod === 'function'); script.onerror = () => resolve(false);
      document.head.append(script);
    });
    const ready = await sdkPending;
    // Never queue PageView/Lead while the SDK is still loading: a visitor may withdraw first.
    if (!ready || consent.current() !== 'granted') return;
    if (!pixelLoaded) {
    // No advanced matching, email, name, food logs or health information.
      window.fbq('set', 'autoConfig', false, pixelId);
      window.fbq('init', pixelId);
      pixelLoaded = true;
    }
  }
  if (consent.current() !== 'granted') return;
  window.fbq('consent', 'grant');
  if (!pageViewed) { window.fbq('track', 'PageView'); pageViewed = true; }
  trackCompletedLead();
}

function trackCompletedLead() {
  if (leadTracked || !pixelLoaded || !canTrackLead({ consent: consent.current(), persisted: Boolean(completedEvent), eventId: completedEvent })) return;
  window.fbq('track', 'Lead', { content_name: 'bodymestory_7_days', content_category: 'free_resource' }, { eventID: completedEvent });
  leadTracked = true;
}

function chooseAds(value) {
  consent.choose(value);
  renderConsent();
  if (value === 'granted') ensurePixel();
}

document.querySelectorAll('[data-ads-choice]').forEach(button => button.addEventListener('click', () => chooseAds(button.dataset.adsChoice)));
document.querySelectorAll('[data-open-consent]').forEach(button => button.addEventListener('click', () => {
  const banner = document.querySelector('[data-consent-banner]'); if (!banner) return;
  banner.hidden = false; banner.querySelector('button')?.focus();
}));
renderConsent();
window.addEventListener('storage', event => {
  if (event.key !== ADS_CONSENT_KEY && event.key !== null) return;
  if (consent.current() === 'granted') ensurePixel();
});
if (consent.current() === 'granted') ensurePixel();

const leadForm = document.querySelector('[data-lead-form]');
if (leadForm) leadForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!leadForm.reportValidity()) return;
  const data = new FormData(leadForm);
  const submit = leadForm.querySelector('[type=submit]');
  const status = leadForm.querySelector('[data-form-status]');
  const payload = buildLeadPayload({ email: data.get('email'), name: data.get('name'), privacyAcknowledged: data.get('privacyAcknowledged') === 'on', marketingConsent: data.get('marketingConsent') === 'on', website: data.get('website') }, attribution, consent.current() === 'granted');
  submit.disabled = true; submit.textContent = 'กำลังบันทึก…'; status.textContent = 'อีกสักครู่ สมุดของคุณกำลังพร้อม'; status.classList.remove('is-error');
  try {
    const response = await fetch('/api/bodymestory', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => null);
    const download = successfulDownload(result, response.ok);
    if (!download) { status.textContent = leadErrorMessage(response.status); status.classList.add('is-error'); return; }
    completedEvent = result.eventId;
    const success = document.querySelector('[data-lead-success]');
    success.querySelector('[data-download]').href = download;
    leadForm.hidden = true; success.hidden = false; success.querySelector('h2').focus();
    trackCompletedLead();
  } catch {
    status.textContent = 'การเชื่อมต่อสะดุด ข้อมูลในฟอร์มยังอยู่ ลองส่งใหม่ได้เลย'; status.classList.add('is-error');
  } finally {
    submit.disabled = false; submit.textContent = 'รับสมุดฟรี →';
  }
});

document.querySelectorAll('[data-download]').forEach(link => link.addEventListener('click', () => {
  const note = document.querySelector('[data-download-note]'); if (note) note.textContent = 'หากไฟล์ไม่เริ่มดาวน์โหลด กดเปิดอ่านในแท็บใหม่แล้วบันทึกได้เลย';
}));
