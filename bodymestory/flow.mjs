export const DOWNLOAD_PATH = '/bodymestory/assets/bodymestory-7-day-workbook.pdf';
export const ADS_CONSENT_KEY = 'bodymestory_ads_consent_v1';
export const PRIVACY_VERSION = '2026-11-01-bodymestory-v1';

export function createAdsConsent({ readStorage, writeStorage, onChange = () => {} }) {
  const parse = raw => {
    try { const saved = JSON.parse(raw || 'null'); return saved?.version === PRIVACY_VERSION && ['granted', 'denied'].includes(saved.value) ? saved.value : null; } catch { return null; }
  };
  let value = null;
  let sessionOverride = false;
  let overrideBaseline;
  try { value = parse(readStorage()); } catch { /* Session-only choice if storage is unavailable. */ }
  const update = next => { if (next !== value) { const before = value; value = next; onChange(next, before); } return value; };
  return {
    get value() { return value; },
    current() {
      try {
        const raw = readStorage();
        if (sessionOverride && raw === overrideBaseline) return value;
        sessionOverride = false;
        return update(parse(raw));
      } catch { return value; }
    },
    choose(next) {
      if (!['granted', 'denied'].includes(next)) return value;
      try { writeStorage(JSON.stringify({ version: PRIVACY_VERSION, value: next, at: new Date().toISOString() })); sessionOverride = false; }
      catch { sessionOverride = true; try { overrideBaseline = readStorage(); } catch { overrideBaseline = undefined; } }
      return update(next);
    }
  };
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const PUBLIC_VALUE = /^[A-Za-z0-9_-]{1,80}$/;
const ALLOWED_SOURCES = new Set(['facebook', 'instagram', 'manychat', 'website']);

// Never pass arbitrary query strings, a contact ID, email or message text to ads.
export function readAttribution(search = '') {
  const params = new URLSearchParams(search);
  const utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && PUBLIC_VALUE.test(value) && !/\b(?:email|phone|contact[_-]?id)\b/i.test(value)) utm[key] = value;
  }
  const rawEpisode = (params.get('episode') || '').toUpperCase();
  const episode = /^RG(?:0[1-9]|[12]\d|30)$/.test(rawEpisode) ? rawEpisode : '';
  const rawSource = (params.get('source') || utm.utm_source || '').toLowerCase();
  const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'website';
  return { source, episode, utm };
}

export function safeQuery(attribution) {
  const params = new URLSearchParams(attribution.utm);
  if (attribution.episode) params.set('episode', attribution.episode);
  if (attribution.source !== 'website') params.set('source', attribution.source);
  return params.size ? `?${params.toString()}` : '';
}

export function safeHash(hash = '') {
  return /^#(?:main|receive|gift-title|hero-title|inside-title|faq-title|success-title|RG(?:0[1-9]|[12]\d|30))$/.test(hash) ? hash : '';
}

export function buildLeadPayload({ email, name, privacyAcknowledged, marketingConsent, website = '' }, attribution, adsAllowed) {
  return {
    email: String(email || '').trim(),
    name: String(name || '').trim(),
    privacyAcknowledged: privacyAcknowledged === true,
    privacyVersion: PRIVACY_VERSION,
    marketingConsent: marketingConsent === true,
    adsConsent: adsAllowed === true,
    campaign: '7-days',
    source: attribution.source,
    episode: attribution.episode,
    utm: { ...attribution.utm },
    website: String(website || '')
  };
}

export function successfulDownload(result, responseOk) {
  return responseOk === true && result?.ok === true && result.downloadUrl === DOWNLOAD_PATH ? DOWNLOAD_PATH : null;
}

export function leadErrorMessage(status) {
  if (status === 429) return 'ลองส่งหลายครั้งติดกัน กรุณารอสักครู่แล้วลองอีกครั้งนะ';
  if (status === 400) return 'ตรวจอีเมลและช่องยอมรับประกาศความเป็นส่วนตัวอีกครั้งนะ';
  return 'ตอนนี้ยังบันทึกไม่สำเร็จ ข้อมูลในฟอร์มยังอยู่ ลองอีกครั้งได้เลย';
}

export function canTrackLead({ consent, persisted, eventId }) {
  return consent === 'granted' && persisted === true && typeof eventId === 'string' && /^[0-9a-f-]{36}$/i.test(eventId);
}
