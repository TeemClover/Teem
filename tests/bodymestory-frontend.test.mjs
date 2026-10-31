import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdsConsent, readAttribution, safeQuery, safeHash, buildLeadPayload, successfulDownload, canTrackLead, DOWNLOAD_PATH } from '../bodymestory/flow.mjs';
import { validateIntake } from '../api/_lib/bodymestory-domain.js';

test('a public ManyChat campaign survives while personal or unknown URL data is removed', () => {
  const attribution = readAttribution('?source=manychat&episode=rg01&utm_source=facebook&utm_medium=comment_dm&utm_campaign=bodymestory_7days&utm_content=RG01&email=someone%40example.com&contact_id=12345678');
  assert.equal(attribution.source, 'manychat');
  assert.equal(attribution.episode, 'RG01');
  const sanitized = safeQuery(attribution);
  assert.match(sanitized, /utm_campaign=bodymestory_7days/);
  assert.doesNotMatch(sanitized, /email|contact_id|example/);
});

test('private data disguised as UTM and an invalid episode are not sent onward', () => {
  const attribution = readAttribution('?utm_content=someone%40example.com&utm_term=contact_id%3A1234&episode=RG99&source=untrusted');
  assert.deepEqual(attribution, { source: 'website', episode: '', utm: {} });
  assert.equal(safeQuery(attribution), '');
});

test('untrusted UTM formats are discarded and a normal frontend payload passes backend validation', () => {
  const attribution = readAttribution('?source=manychat&episode=RG01&utm_source=facebook&utm_campaign=free%20workbook&utm_content=RG01&utm_term=' + 'x'.repeat(81));
  assert.deepEqual(attribution.utm, { utm_source: 'facebook', utm_content: 'RG01' });
  const payload = buildLeadPayload({ email: 'reader@example.com', privacyAcknowledged: true }, attribution, false);
  assert.doesNotThrow(() => validateIntake(payload));
  assert.equal(validateIntake(payload).source, 'manychat');
});

test('unknown URL fragments cannot carry personal data into a future Pixel PageView', () => {
  assert.equal(safeHash('#email=reader@example.com'), '');
  assert.equal(safeHash('#contact-123456'), '');
  assert.equal(safeHash('#main'), '#main');
  assert.equal(safeHash('#receive'), '#receive');
  assert.equal(safeHash('#RG01'), '#RG01');
  assert.equal(safeHash('#RG99'), '');
});

test('receiving the resource does not silently opt a visitor into news or ads', () => {
  const attribution = readAttribution('?utm_source=instagram&episode=RG30');
  const payload = buildLeadPayload({ email: '  reader@example.com ', name: ' Reader ', privacyAcknowledged: true }, attribution, false);
  assert.equal(payload.email, 'reader@example.com');
  assert.equal(payload.name, 'Reader');
  assert.equal(payload.privacyAcknowledged, true);
  assert.equal(payload.marketingConsent, false);
  assert.equal(payload.adsConsent, false);
  assert.equal(payload.source, 'instagram');
  assert.equal(payload.episode, 'RG30');
  assert.equal(Object.hasOwn(payload, 'weight'), false);
});

test('an error response or an injected download URL cannot unlock a success screen', () => {
  assert.equal(successfulDownload({ ok: true, downloadUrl: DOWNLOAD_PATH }, false), null);
  assert.equal(successfulDownload({ ok: false, downloadUrl: DOWNLOAD_PATH }, true), null);
  assert.equal(successfulDownload({ ok: true, downloadUrl: 'https://untrusted.example/file.pdf' }, true), null);
  assert.equal(successfulDownload({ ok: true, downloadUrl: DOWNLOAD_PATH }, true), DOWNLOAD_PATH);
});

test('Lead tracking requires both a persisted success and an affirmative ads choice', () => {
  const eventId = '777d476a-7d84-45ca-92a2-f34aa9aa67e0';
  assert.equal(canTrackLead({ consent: 'denied', persisted: true, eventId }), false);
  assert.equal(canTrackLead({ consent: null, persisted: true, eventId }), false);
  assert.equal(canTrackLead({ consent: 'granted', persisted: false, eventId }), false);
  assert.equal(canTrackLead({ consent: 'granted', persisted: true, eventId: 'reader@example.com' }), false);
  assert.equal(canTrackLead({ consent: 'granted', persisted: true, eventId }), true);
});

test('withdrawal in the privacy tab is observed by the form tab before submit or tracking', () => {
  let shared = null;
  let revokedInForm = 0;
  const formTab = createAdsConsent({ readStorage: () => shared, writeStorage: value => { shared = value; }, onChange: value => { if (value !== 'granted') revokedInForm++; } });
  const privacyTab = createAdsConsent({ readStorage: () => shared, writeStorage: value => { shared = value; } });
  formTab.choose('granted');
  assert.equal(privacyTab.current(), 'granted');
  privacyTab.choose('denied');
  const latest = formTab.current(); // Also used immediately before POST and Lead, even if a storage event was missed.
  assert.equal(latest, 'denied');
  assert.equal(revokedInForm, 1);
  const payload = buildLeadPayload({ email: 'reader@example.com', privacyAcknowledged: true }, readAttribution(''), latest === 'granted');
  assert.equal(payload.adsConsent, false);
  assert.equal(canTrackLead({ consent: latest, persisted: true, eventId: '777d476a-7d84-45ca-92a2-f34aa9aa67e0' }), false);
  shared = null;
  assert.equal(formTab.current(), null);
  shared = '{invalid';
  assert.equal(formTab.current(), null);
});

test('a storage quota error honors the session choice until an actual cross-tab change', () => {
  let stored = null;
  const tab = createAdsConsent({ readStorage: () => stored, writeStorage: () => { throw new Error('quota exceeded'); } });
  tab.choose('granted');
  assert.equal(tab.current(), 'granted');
  stored = JSON.stringify({ version: '2026-11-01-bodymestory-v1', value: 'denied' });
  assert.equal(tab.current(), 'denied');
});
