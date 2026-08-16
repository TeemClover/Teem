/* XIRCLE PLAYABLE — state.js
   Blueprint §32. Three tiers:

   memory  — health-like simulator choices (sleep/eat/move/adjust).
             NEVER persisted, NEVER sent to analytics. Dies with the tab.
   session — journey position for resume within one visit (sessionStorage).
   local   — non-health return state (localStorage).

   All storage access is wrapped: private mode / blocked storage must
   never throw and never break the journey. */
(function () {
  "use strict";

  var SESSION_KEY = "xircle.session.v1";
  var LOCAL_KEY = "xircle.local.v1";
  var HANDOFF_TTL = 7 * 24 * 60 * 60 * 1000;

  function safeRead(storage, key, fallback) {
    try {
      var raw = window[storage].getItem(key);
      if (!raw) return Object.assign({}, fallback);
      return Object.assign({}, fallback, JSON.parse(raw));
    } catch (e) {
      return Object.assign({}, fallback);
    }
  }

  function safeWrite(storage, key, value) {
    try {
      window[storage].setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable — journey continues in memory */
    }
  }

  var SESSION_DEFAULTS = {
    scene: "S0",
    completedFirstJourney: false,
    hasSeenProducts: false
  };

  var LOCAL_DEFAULTS = {
    journeyCompleted: false,
    journeyCompletedAt: null,
    lastVisitDate: null,
    visitCount: 0,
    circlePreviewStarted: false,
    rolePathSeen: null, /* "health" | "care" — navigation preference, not a health value */
    xtyHandoff: null    /* room code + source only; never health metrics */
  };

  var session = safeRead("sessionStorage", SESSION_KEY, SESSION_DEFAULTS);
  var local = safeRead("localStorage", LOCAL_KEY, LOCAL_DEFAULTS);

  var XState = {
    /* Health-like demo choices live here ONLY (Blueprint §8, §13, §32). */
    memory: {
      memoryGapChoice: null, /* S1 — not tracked anywhere */
      sleep: null,           /* "short" | "mid" | "full"          */
      eat: null,             /* "light" | "balanced" | "heavy"    */
      move: null,            /* "sedentary" | "walk" | "intentional" */
      adjust: null           /* "eat" | "move" | "sleep"          */
    },

    getSession: function (k) { return session[k]; },
    setSession: function (k, v) {
      session[k] = v;
      safeWrite("sessionStorage", SESSION_KEY, session);
    },

    getLocal: function (k) { return local[k]; },
    setLocal: function (k, v) {
      local[k] = v;
      safeWrite("localStorage", LOCAL_KEY, local);
    },

    touchVisit: function () {
      var today = new Date().toISOString().slice(0, 10);
      if (local.lastVisitDate !== today) {
        local.lastVisitDate = today;
        local.visitCount = (local.visitCount || 0) + 1;
        safeWrite("localStorage", LOCAL_KEY, local);
      }
    },

    resetJourney: function () {
      session = Object.assign({}, SESSION_DEFAULTS);
      safeWrite("sessionStorage", SESSION_KEY, session);
      this.memory.memoryGapChoice = null;
      this.memory.sleep = null;
      this.memory.eat = null;
      this.memory.move = null;
      this.memory.adjust = null;
    },

    getXtyHandoff: function () {
      var item = local.xtyHandoff;
      if (!item || !/^\d{5}$/.test(String(item.partyCode || ''))) return null;
      if (!Number.isFinite(Number(item.receivedAt)) || Date.now() - Number(item.receivedAt) > HANDOFF_TTL) {
        local.xtyHandoff = null;
        safeWrite("localStorage", LOCAL_KEY, local);
        return null;
      }
      return item;
    },

    clearXtyHandoff: function () {
      local.xtyHandoff = null;
      safeWrite("localStorage", LOCAL_KEY, local);
    }
  };

  window.XState = XState;

  function captureXtyInvite() {
    try {
      var url = new URL(window.location.href);
      var code = url.searchParams.get('xty');
      if (!/^\d{5}$/.test(String(code || ''))) return;
      local.xtyHandoff = {
        partyCode: code,
        source: 'xircle_invite',
        xvisor: url.searchParams.get('xvisor') === '1',
        receivedAt: Date.now()
      };
      safeWrite("localStorage", LOCAL_KEY, local);
      /* The room remains remembered locally; keep the visible URL clean so
         screenshots and casual sharing do not leak the invite code. */
      url.searchParams.delete('xty');
      url.searchParams.delete('xvisor');
      history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch (e) {}
  }

  function exactXircleHome() {
    return /^\/xircle\/(?:index\.html)?$/.test(location.pathname);
  }

  function styleInviteEnding(handoff) {
    var s12 = document.querySelector('[data-scene="S12"]');
    var s13 = document.querySelector('[data-scene="S13"]');
    if (!s12 || !s13) return;
    var code = handoff.partyCode;

    var kicker = s12.querySelector('.px-kicker');
    var title = s12.querySelector('.px-title');
    if (kicker) kicker.textContent = handoff.xvisor ? 'X-VISOR INVITE · XTY' : 'XTY INVITE';
    if (title) title.innerHTML = 'อีกนิดเดียว<br>แล้วเข้าตี้ต่อ';

    var preview = s12.querySelector('.circle-preview');
    if (preview) {
      preview.classList.add('on');
      var badge = preview.querySelector('.px-demo');
      var head = preview.querySelector('h3');
      var body = preview.querySelector('p');
      var pulse = preview.querySelector('.pulse-line');
      var demoLink = preview.querySelector('.invite-demo');
      var why = preview.querySelector('[data-source-id="circle-preview"]');
      if (badge) badge.textContent = 'QUEST WAITING · ROOM ' + code;
      if (head) head.textContent = 'ตี้ของคุณรออยู่';
      if (body) body.textContent = 'เล่น Xircle ให้จบก่อน แล้วกดเข้าตี้ต่อได้ทันที รหัสห้องถูกเก็บไว้ให้แล้ว ไม่ต้องจำเอง';
      if (pulse) pulse.innerHTML = '<span class="beat" aria-hidden="true"></span><strong style="font-size:15px">เล่นจบ → กลับไปหาคนที่ชวนคุณ</strong>';
      if (demoLink) demoLink.hidden = true;
      if (why) why.hidden = true;
    }
    s12.querySelector('.circle-dots')?.classList.add('lit');
    var create = s12.querySelector('[data-circle-create]');
    var next = s12.querySelector('.px-cta.reveal-later');
    var solo = s12.querySelector('.px-ghost[data-next="S13"]');
    if (create) create.hidden = true;
    if (next) { next.classList.add('is-ready'); next.textContent = 'เล่นให้จบ แล้วเข้าตี้'; }
    if (solo) solo.hidden = true;

    var endKicker = s13.querySelector('.px-kicker');
    var endTitle = s13.querySelector('.px-title');
    var fork = s13.querySelector('.fork-grid');
    if (endKicker) endKicker.textContent = 'ONE DAY — DONE ✓';
    if (endTitle) endTitle.innerHTML = 'พร้อมกลับไปหา<br>คนที่ชวนคุณแล้ว';
    if (fork) {
      fork.innerHTML = '<a class="fork-card health" id="xty-handoff-card" href="/xty/?c=' + encodeURIComponent(code) + '&from=' + (handoff.xvisor ? 'xircle_xvisor' : 'xircle') + '">' +
        '<img src="/xty/assets/art/avatars/white-cat.webp" alt="" style="width:88px;height:88px;object-fit:cover;border-radius:24px;margin-bottom:12px;background:#f3f1ea">' +
        '<b>XTY PARTY · ROOM ' + code + '</b>' +
        '<h3>เข้าตี้ แล้วคุยต่อ</h3>' +
        '<p>สิ่งที่เลือกใน Xircle คือจุดเริ่มต้น ทีนี้เอาไปทำจริงกับคนที่ส่งลิงก์นี้</p>' +
        '<span class="go">เข้าตี้ ' + code + ' →</span></a>';
      var handoffCard = document.getElementById('xty-handoff-card');
      if (handoffCard) handoffCard.addEventListener('click', function () { XState.clearXtyHandoff(); });
    }
    var tail = s13.querySelector('.px-whisper');
    if (tail) tail.innerHTML = 'รหัส <strong>' + code + '</strong> ถูกเก็บไว้แล้ว · กดเข้าตี้ต่อได้เลย';
  }

  function styleNormalXtyEnding() {
    var s12 = document.querySelector('[data-scene="S12"]');
    var s13 = document.querySelector('[data-scene="S13"]');
    if (!s12 || !s13) return;

    var create = s12.querySelector('[data-circle-create]');
    if (create) {
      create.textContent = 'ตั้งตี้ 7 วันใน XTY';
      create.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        location.href = '/xty/new/?template=xircle';
      }, true);
    }

    var health = s13.querySelector('.fork-card.health');
    if (health) {
      health.href = '/xty/new/?template=xircle';
      var b = health.querySelector('b');
      var h = health.querySelector('h3');
      var p = health.querySelector('p');
      var go = health.querySelector('.go');
      if (b) b.textContent = 'DO IT TOGETHER';
      if (h) h.textContent = 'เอาหนึ่งอย่างนี้ไปเล่นต่อ 7 วัน';
      if (p) p.textContent = 'Xircle ช่วยให้เห็นสิ่งที่อยากปรับ ส่วน XTY ช่วยให้ทำมันจริงกับคนอื่น';
      if (go) go.textContent = 'ตั้งตี้ใน XTY →';
    }
  }

  function installOpportunityCareCta() {
    if (!/^\/xircle\/opportunity\/?$/.test(location.pathname)) return;
    var scene = document.querySelector('[data-scene="O4"]');
    if (!scene || scene.querySelector('[data-xvisor-xty-create]')) return;
    var anchor = scene.querySelector('.px-card.strong');
    if (!anchor) return;
    var block = document.createElement('div');
    block.className = 'px-card strong';
    block.setAttribute('data-xvisor-xty-create', '');
    block.style.marginTop = '14px';
    block.innerHTML = '<span class="px-label" style="color:var(--gold)">XIRCLE × XTY · CARE TOOL</span>' +
      '<div style="display:flex;gap:14px;align-items:center;margin-top:12px">' +
      '<img src="/xty/assets/art/avatars/white-cat.webp" alt="" style="width:78px;height:78px;object-fit:cover;border-radius:22px;background:#f3f1ea">' +
      '<div><strong style="display:block;font-size:17px">แมวขาวสีเงิน · ตัวลับ X-VISOR</strong>' +
      '<span class="px-whisper">แมวตัวนี้เทรนนิ่ง X-VISOR มาแล้ว · ช่วยถือจังหวะ Care Script แต่ไม่ทำงานแทนคนดูแล</span></div></div>' +
      '<p class="px-whisper" style="margin-top:12px">เปิด Preset 28 วัน: Private · Trust · Message 3 · Pattern → One Action พร้อมสคริปต์ Day 0 / 1–3 / 7 / 14 / 21 / 28</p>' +
      '<a class="px-cta" href="/xty/new/?template=xircle_xvisor" style="display:flex;margin-top:16px;text-decoration:none">เปิด X-VISOR Care Quest 28 วัน →</a>';
    anchor.insertAdjacentElement('afterend', block);
  }

  function installBridgeUi() {
    if (exactXircleHome()) {
      var handoff = XState.getXtyHandoff();
      if (handoff) styleInviteEnding(handoff);
      else styleNormalXtyEnding();
    }
    installOpportunityCareCta();
  }

  captureXtyInvite();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installBridgeUi);
  else setTimeout(installBridgeUi, 0);
})();
