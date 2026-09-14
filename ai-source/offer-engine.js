(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SauceOffer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var WINDOW_MS = 48 * 60 * 60 * 1000;
  var DAY_MS = 24 * 60 * 60 * 1000, BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
  var CALENDAR_POLICY = 'first_visit_calendar_deadline', RECEIPT_MAX_BYTES = 2 * 1024 * 1024;
  var TERM_KEYS = ['access_terms', 'refund_terms', 'support_terms', 'delivery_terms', 'tool_cost_terms', 'payment_deadline_policy'];
  function positivePrice(v) { return typeof v === 'number' && Number.isFinite(v) && v > 0; }
  function nonempty(v) { return typeof v === 'string' && v.trim().length > 0; }
  function timestamp(v) { return Number.isSafeInteger(v) && v >= 0 && v <= 8640000000000000; }
  // A visit on Bangkok day D remains eligible through D+2, ending at D+3 00:00.
  // Arithmetic uses the explicit +07 offset, never the visitor's local timezone.
  function bangkokCalendarDeadline(firstSeen, calendarDays) {
    if (!timestamp(firstSeen) || calendarDays !== 2) return null;
    var end = (Math.floor((firstSeen + BANGKOK_OFFSET_MS) / DAY_MS) + calendarDays + 1) * DAY_MS - BANGKOK_OFFSET_MS;
    return timestamp(end) && end > firstSeen ? end : null;
  }
  function deadlineKind(c, firstSeen, endsAt) {
    if (!timestamp(firstSeen) || !timestamp(endsAt) || endsAt <= firstSeen) return null;
    // Existing 48h visitors retain their earlier deadline during policy migration.
    if (endsAt - firstSeen === WINDOW_MS) return 'legacy_48h';
    if (c.offer_type === CALENDAR_POLICY && endsAt === bangkokCalendarDeadline(firstSeen, c.calendar_days)) return 'calendar';
    return null;
  }
  function recordSpanValid(c, r) {
    var kind = deadlineKind(c, r.firstSeen, r.endsAt);
    return (r.version === 1 && kind === 'legacy_48h') ||
      (r.version === 2 && r.policy === CALENDAR_POLICY && r.calendarDays === 2 && kind === 'calendar');
  }
  function safeCheckout(v) {
    if (!nonempty(v)) return false;
    try { var u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; }
    catch (_) { return false; }
  }
  function configProblems(c) {
    var p = [];
    if (c.status !== 'approved') p.push('offer_not_approved');
    if (c.currency !== 'THB' || c.timezone !== 'Asia/Bangkok') p.push('currency_or_timezone_invalid');
    if (!positivePrice(c.launch_price) || !positivePrice(c.regular_price) || c.regular_price <= c.launch_price) p.push('prices_invalid');
    var policyValid = (c.offer_type === 'first_visit_48h' && c.duration_hours === 48) ||
      (c.offer_type === CALENDAR_POLICY && c.calendar_days === 2);
    if (!policyValid || c.expiry_action !== 'regular_price') p.push('offer_policy_invalid');
    if (!nonempty(c.storage_key) || !nonempty(c.offer_id)) p.push('storage_identity_missing');
    return p;
  }
  function bankValid(c) {
    var b = c.bank || {};
    return c.payment_method === 'manual_bank_transfer' && nonempty(b.name) && /^\d{10}$/.test(b.account_number || '') && nonempty(b.account_name);
  }
  function purchaseProblems(c) {
    var p = [];
    if (!bankValid(c)) p.push('bank_details_missing_or_invalid');
    if (c.sales_enabled !== true) p.push('sales_not_enabled');
    if (c.onboarding_verified !== true) p.push('onboarding_not_verified');
    if (!safeCheckout(c.receipt_submission_url)) p.push('receipt_submission_url_missing_or_invalid');
    if (c.refund_clock_confirmed !== true) p.push('refund_clock_not_confirmed');
    TERM_KEYS.forEach(function (k) { if (!nonempty(c[k])) p.push(k + '_missing'); });
    return p;
  }
  // Local preview price persistence, not identity verification or payment proof.
  // A corrupt/unavailable record closes the discount; it never restarts the offer.
  function createVisitTracker(config, storage) {
    var c = config || {}, memory = null, initialized = false, locked = null;
    function close(reason, now) {
      locked = { status: reason === 'expired' ? 'expired' : 'unavailable', reason: reason, firstSeen: memory && memory.firstSeen, endsAt: memory && memory.endsAt };
      var tombstone = { version: memory ? memory.version : 2, offerId: c.offer_id, closed: true, reason: reason };
      if (reason === 'expired' && memory) {
        tombstone.firstSeen = memory.firstSeen; tombstone.endsAt = memory.endsAt;
        if (memory.policy) { tombstone.policy = memory.policy; tombstone.calendarDays = memory.calendarDays; }
      }
      try { storage.setItem(c.storage_key, JSON.stringify(tombstone)); } catch (_) { /* Regular price remains latched in this session. */ }
      return locked;
    }
    return { read: function (now) {
      if (locked) return locked;
      if (configProblems(c).length) return {status: 'unavailable', reason: 'config_invalid'};
      if (!timestamp(now)) return close('clock_invalid', now);
      try {
        var raw = storage.getItem(c.storage_key), r;
        if (raw === null) {
          if (initialized) return close('record_removed', now);
          var calendar = c.offer_type === CALENDAR_POLICY;
          r = {version: calendar ? 2 : 1, offerId: c.offer_id, firstSeen: now,
            endsAt: calendar ? bangkokCalendarDeadline(now, c.calendar_days) : now + WINDOW_MS, lastSeen: now};
          if (calendar) { r.policy = CALENDAR_POLICY; r.calendarDays = c.calendar_days; }
          storage.setItem(c.storage_key, JSON.stringify(r));
          // Read-back is mandatory: blocked or silently ignored writes are not persistence.
          raw = storage.getItem(c.storage_key);
          if (raw === null) return close('storage_not_persistent', now);
        }
        r = JSON.parse(raw);
        if (!r || ![1, 2].includes(r.version) || r.offerId !== c.offer_id) return close('record_invalid', now);
        if (r.closed === true) {
          if (r.reason === 'expired' && recordSpanValid(c, r)) memory = r;
          return close(r.reason === 'expired' ? 'expired' : 'record_closed', now);
        }
        if (!recordSpanValid(c, r) || !timestamp(r.lastSeen) || r.lastSeen < r.firstSeen || r.lastSeen >= r.endsAt) return close('record_invalid', now);
        if (now + 2000 < r.lastSeen || now + 2000 < r.firstSeen) return close('clock_moved_backwards', now);
        // Two tabs can capture Date.now a few milliseconds apart before storage reads.
        now = Math.max(now, r.lastSeen, r.firstSeen);
        // A later record in another tab cannot extend the earliest deadline seen here.
        if (memory && (r.firstSeen > memory.firstSeen || r.endsAt > memory.endsAt)) r = Object.assign({}, memory);
        memory = r; initialized = true;
        if (now >= r.endsAt) return close('expired', now);
        // Avoid a write/event feedback loop between open tabs.
        if (now - r.lastSeen >= 1000 || JSON.stringify(r) !== raw) {
          r.lastSeen = now;
          var serialized = JSON.stringify(r);
          storage.setItem(c.storage_key, serialized);
          if (storage.getItem(c.storage_key) !== serialized) return close('storage_write_unverified', now);
        }
        return {status: 'valid', firstSeen: r.firstSeen, endsAt: r.endsAt, lastSeen: r.lastSeen};
      } catch (_) { return close('storage_unavailable_or_corrupt', now); }
    }};
  }
  // Shape validation only. Only the server verifies its signed cookie and price.
  // The page supplies server-clock time (serverNow + monotonic elapsed time) to
  // evaluateOffer. Failure never falls back to creating a local live offer.
  function normalizeServerVisit(config, payload) {
    var c = config || {}, v = payload;
    function unavailable(reason) { return {status: 'unavailable', reason: reason, authority: 'server'}; }
    if (configProblems(c).length) return unavailable('config_invalid');
    if (!v || !['valid', 'expired'].includes(v.status) || !timestamp(v.serverNow) ||
        !deadlineKind(c, v.firstSeen, v.endsAt) || v.serverNow + 2000 < v.firstSeen) return unavailable('server_offer_unavailable_or_invalid');
    return {status: v.status === 'expired' || v.serverNow >= v.endsAt ? 'expired' : 'valid',
      firstSeen: v.firstSeen, endsAt: v.endsAt, serverNow: v.serverNow, lastSeen: v.serverNow,
      authority: 'server', shapeValidated: true};
  }
  function evaluateOffer(config, now, visit) {
    var c = config || {}, server = visit && visit.authority === 'server';
    var clock = typeof now === 'number' ? now : (server && timestamp(visit.serverNow) ? visit.serverNow : Date.now());
    var p = configProblems(c), valid = timestamp(clock);
    if (!valid) p.push('clock_invalid');
    var out = {state: 'draft', currentPrice: null, showLaunchOffer: false, showCountdown: false, remainingMs: null, endsAt: null, canViewPayment: false, canPurchase: false, purchaseUrl: null, firstSeen: null, problems: p, purchaseProblems: purchaseProblems(c), storageReason: visit && visit.reason || null};
    if (p.length) return out;
    var verified = visit && ['valid', 'expired'].includes(visit.status) && deadlineKind(c, visit.firstSeen, visit.endsAt) && clock + 2000 >= visit.firstSeen;
    if (server) verified = verified && visit.shapeValidated === true && timestamp(visit.serverNow) && visit.serverNow + 2000 >= visit.firstSeen;
    var effectiveClock = verified && Number.isSafeInteger(visit.lastSeen) ? Math.max(clock, visit.lastSeen) : clock;
    if (verified && server) effectiveClock = Math.max(effectiveClock, visit.serverNow);
    var active = !!(verified && visit.status === 'valid' && effectiveClock < visit.endsAt);
    out.state = active ? 'active' : (visit && (visit.status === 'expired' || verified) ? 'expired' : 'regular');
    out.currentPrice = active ? c.launch_price : c.regular_price;
    out.showLaunchOffer = out.showCountdown = active;
    out.endsAt = verified ? visit.endsAt : null;
    out.firstSeen = verified ? visit.firstSeen : null;
    out.remainingMs = active ? visit.endsAt - effectiveClock : null;
    out.canViewPayment = bankValid(c);
    out.canPurchase = out.canViewPayment && out.purchaseProblems.length === 0;
    out.purchaseUrl = out.canPurchase ? c.receipt_submission_url : null;
    return out;
  }
  function validateReceipt(file) {
    if (!file) return 'โปรดเลือกไฟล์สลิป';
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || !/\.(jpe?g|png|pdf)$/i.test(file.name || '')) return 'ใช้ไฟล์ JPG, PNG หรือ PDF เท่านั้น';
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > RECEIPT_MAX_BYTES) return 'ไฟล์ต้องมีข้อมูลและมีขนาดไม่เกิน 2 MB';
    return null;
  }
  function canUpload(c, offer, protocol) {
    return !!(c.receipt_upload_url === '/api/ai-source' && c.receipt_upload_enabled === true && c.upload_backend_verified === true && offer && offer.canPurchase === true && protocol === 'https:');
  }
  function countdownParts(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    return {days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60};
  }
  function publicOfferConfig(c) {
    // Keep the production inventory internal; the landing describes outcomes and access.
    var result = JSON.parse(JSON.stringify(c));
    if (result.course) {
      result.course = {name: c.course.name, platform: c.course.platform, community_optional: c.course.community_optional, free_foundations_preserved: c.course.free_foundations_preserved};
    }
    delete result.skool_invite_url;
    return result;
  }
  return {publicOfferConfig: publicOfferConfig, validateReceipt: validateReceipt, canUpload: canUpload, createVisitTracker: createVisitTracker, evaluateOffer: evaluateOffer, normalizeServerVisit: normalizeServerVisit, bangkokCalendarDeadline: bangkokCalendarDeadline, receiptMaxBytes: RECEIPT_MAX_BYTES, purchaseProblems: purchaseProblems, configProblems: configProblems, countdownParts: countdownParts, safeCheckout: safeCheckout};
});
