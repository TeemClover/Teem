/* XIRCLE PLAYABLE — state.js
   Three tiers:
   memory  — health-like simulator choices. Never persisted.
   session — journey position for one visit.
   local   — non-health return state such as remembered XTY invite.
*/
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
    } catch (e) {}
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
    rolePathSeen: null,
    xtyHandoff: null
  };

  var session = safeRead("sessionStorage", SESSION_KEY, SESSION_DEFAULTS);
  var local = safeRead("localStorage", LOCAL_KEY, LOCAL_DEFAULTS);

  var XState = {
    memory: {
      memoryGapChoice: null,
      sleep: null,
      eat: null,
      move: null,
      adjust: null
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
      if (!item || !/^\d{5}$/.test(String(item.partyCode || ""))) return null;
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
      var code = url.searchParams.get("xty");
      if (!/^\d{5}$/.test(String(code || ""))) return;
      local.xtyHandoff = {
        partyCode: code,
        source: "xircle_invite",
        xvisor: url.searchParams.get("xvisor") === "1",
        receivedAt: Date.now()
      };
      safeWrite("localStorage", LOCAL_KEY, local);
      url.searchParams.delete("xty");
      url.searchParams.delete("xvisor");
      history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
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

    var kicker = s12.querySelector(".px-kicker");
    var title = s12.querySelector(".px-title");
    if (kicker) kicker.textContent = "X-VISOR INVITE";
    if (title) title.innerHTML = "ตี้ของคุณ<br>รออยู่";

    var preview = s12.querySelector(".circle-preview");
    if (preview) {
      preview.classList.add("on");
      var badge = preview.querySelector(".px-demo");
      var head = preview.querySelector("h3");
      var body = preview.querySelector("p");
      var pulse = preview.querySelector(".pulse-line");
      var demoLink = preview.querySelector(".invite-demo");
      var why = preview.querySelector('[data-source-id="circle-preview"]');
      if (badge) badge.textContent = "ROOM " + code;
      if (head) head.textContent = "เล่นให้จบ แล้วไปต่อ";
      if (body) body.textContent = "รหัสถูกเก็บไว้แล้ว";
      if (pulse) pulse.innerHTML = '<span class="beat" aria-hidden="true"></span><strong style="font-size:15px">จบแล้วเลือก: เข้าตี้ หรือ ลองเป็น X-VISOR</strong>';
      if (demoLink) demoLink.hidden = true;
      if (why) why.hidden = true;
    }

    s12.querySelector(".circle-dots")?.classList.add("lit");
    var create = s12.querySelector("[data-circle-create]");
    var next = s12.querySelector(".px-cta.reveal-later");
    var solo = s12.querySelector('.px-ghost[data-next="S13"]');
    if (create) create.hidden = true;
    if (next) {
      next.classList.add("is-ready");
      next.textContent = "ไปหน้าสุดท้าย";
    }
    if (solo) solo.hidden = true;

    var endKicker = s13.querySelector(".px-kicker");
    var endTitle = s13.querySelector(".px-title");
    var fork = s13.querySelector(".fork-grid");
    if (endKicker) endKicker.textContent = "NEXT";
    if (endTitle) endTitle.innerHTML = "เลือกทางต่อ";
    if (fork) {
      fork.innerHTML =
        '<a class="fork-card health" href="/xty/join/?c=' + encodeURIComponent(code) + '">' +
          '<b>ROOM ' + code + '</b>' +
          '<h3>เข้าตี้</h3>' +
          '<p>กลับไปหาคนที่ชวนคุณ</p>' +
          '<span class="go">เข้าตี้ →</span>' +
        '</a>' +
        '<a class="fork-card care" href="/xircle/opportunity/?from=invite">' +
          '<b>X-VISOR</b>' +
          '<h3>ลองเป็นคนดูแล</h3>' +
          '<p>รหัสห้องยังเก็บไว้</p>' +
          '<span class="go">ลองก่อน →</span>' +
        '</a>';
    }

    var tail = s13.querySelector(".px-whisper");
    if (tail) tail.innerHTML = '<a href="/xircle/doc/xvisor/" style="color:var(--cream-soft)">อ่านข้อมูล X-VISOR →</a>';
  }

  function installOpportunityCareCta() {
    if (!/^\/xircle\/opportunity\/?$/.test(location.pathname)) return;
    var scene = document.querySelector('[data-scene="O4"]');
    if (!scene || scene.querySelector("[data-xvisor-xty-create]")) return;

    var anchor = scene.querySelector(".px-card.strong");
    if (!anchor) return;

    var handoff = XState.getXtyHandoff();
    var fork = scene.querySelector(".fork-grid");
    if (fork) fork.hidden = true;

    var block = document.createElement("div");
    block.className = "px-card strong";
    block.setAttribute("data-xvisor-xty-create", "");
    block.style.marginTop = "14px";

    if (handoff) {
      var code = handoff.partyCode;
      block.innerHTML =
        '<span class="px-label" style="color:var(--green)">ROOM ' + code + ' ยังอยู่</span>' +
        '<h3 style="margin:10px 0 0;font-size:22px">ตอนนี้เห็นทั้งสองฝั่งแล้ว</h3>' +
        '<p class="px-whisper">เข้าตี้เดิม หรือเปิด Care Party ของคุณ</p>' +
        '<a class="px-cta" href="/xty/join/?c=' + encodeURIComponent(code) + '" style="display:flex;margin-top:16px">เข้าตี้ ' + code + ' →</a>' +
        '<a class="px-ghost" href="/xty/new/?template=xircle_xvisor" style="display:flex;margin-top:8px">สร้าง Care Party ของฉัน →</a>' +
        '<a class="px-ghost" href="/xircle/doc/xvisor/" style="display:flex">อ่านข้อมูล X-VISOR →</a>';
    } else {
      block.innerHTML =
        '<span class="px-label" style="color:var(--gold)">X-VISOR CARE PARTY</span>' +
        '<div style="display:flex;gap:12px;align-items:center;margin-top:12px">' +
          '<img src="/xty/assets/art/avatars/white-cat.webp" alt="" style="width:68px;height:68px;object-fit:cover;border-radius:20px;background:#f3f1ea">' +
          '<div><strong style="display:block;font-size:17px">แมวขาวสีเงิน</strong><span class="px-whisper">เทรนนิ่ง X-VISOR มาแล้ว</span></div>' +
        '</div>' +
        '<p class="px-whisper">Care Script 28 วัน · Pattern → One Action</p>' +
        '<a class="px-cta" href="/xty/new/?template=xircle_xvisor" style="display:flex;margin-top:16px">สร้าง Care Party →</a>' +
        '<a class="px-ghost" href="/xircle/doc/xvisor/" style="display:flex;margin-top:6px">อ่านข้อมูล X-VISOR →</a>';
    }

    anchor.insertAdjacentElement("afterend", block);
  }

  function installBridgeUi() {
    if (exactXircleHome()) {
      var handoff = XState.getXtyHandoff();
      if (handoff) styleInviteEnding(handoff);
    }
    installOpportunityCareCta();
  }

  captureXtyInvite();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installBridgeUi);
  else setTimeout(installBridgeUi, 0);
})();
