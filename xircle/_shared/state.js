/* XIRCLE × XTY PARTNER EXPERIENCE — state.js
   State only. UI belongs to each route.
   memory  = health-like simulator choices; never persisted
   session = current journey state for this visit
   local   = non-sensitive continuity / invite state
*/
(function () {
  "use strict";

  var SESSION_KEY = "xircle.session.v1";
  var LOCAL_KEY = "xircle.local.v1";
  var HANDOFF_TTL = 7 * 24 * 60 * 60 * 1000;

  function clone(obj) { return Object.assign({}, obj); }
  function safeRead(storage, key, fallback) {
    try {
      var raw = window[storage].getItem(key);
      return raw ? Object.assign({}, fallback, JSON.parse(raw)) : clone(fallback);
    } catch (e) { return clone(fallback); }
  }
  function safeWrite(storage, key, value) {
    try { window[storage].setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  var SESSION_DEFAULTS = {
    scene: "S0",
    completedFirstJourney: false
  };

  var LOCAL_DEFAULTS = {
    journeyCompleted: false,
    journeyCompletedAt: null,
    lastVisitDate: null,
    visitCount: 0,
    careIntroSeen: false,
    xvisorSimCompleted: false,
    routineCompleted: false,
    whiteCatIntroSeen: false,
    rolePathSeen: null,
    xtyHandoff: null
  };

  var session = safeRead("sessionStorage", SESSION_KEY, SESSION_DEFAULTS);
  var local = safeRead("localStorage", LOCAL_KEY, LOCAL_DEFAULTS);

  function validHandoff(item) {
    if (!item || !/^\d{5}$/.test(String(item.partyCode || ""))) return false;
    if (!Number.isFinite(Number(item.receivedAt))) return false;
    return Date.now() - Number(item.receivedAt) <= HANDOFF_TTL;
  }

  function normalizedPath() {
    var p = String(location.pathname || "/").replace(/\/+$/, "");
    return p || "/";
  }

  function isProgressRoute(path) {
    return [
      "/xircle",
      "/xircle/start",
      "/xircle/care",
      "/xircle/opportunity",
      "/xircle/routinex",
      "/xircle/care/party"
    ].indexOf(path) !== -1;
  }

  function addShortcut(nav, href, label, className) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (className) a.className = className;
    nav.appendChild(a);
  }

  function renderProgressNav() {
    var path = normalizedPath();
    if (!isProgressRoute(path)) return;
    var nav = document.querySelector(".xp-nav");
    if (!nav) return;

    nav.innerHTML = "";
    nav.setAttribute("aria-label", "ทางลัดที่ปลดล็อกแล้ว");

    var h = validHandoff(local.xtyHandoff) ? local.xtyHandoff : null;

    // First visit is intentionally linear. Shortcuts appear only after milestones.
    if (local.journeyCompleted && path !== "/xircle/opportunity") {
      addShortcut(nav, "/xircle/opportunity/", "X-VISOR");
    }
    if (local.xvisorSimCompleted && path !== "/xircle/routinex") {
      addShortcut(nav, "/xircle/routinex/", "RoutineX");
    }

    if (h) {
      if (path !== "/xircle/care/party") {
        addShortcut(nav, "/xircle/care/party/?mode=join", "เข้าตี้ " + h.partyCode, "cat");
      }
    } else if ((local.routineCompleted || local.whiteCatIntroSeen) && path !== "/xircle/care/party") {
      addShortcut(nav, "/xircle/care/party/?mode=create", "แมวขาว · XTY", "cat");
    }

    nav.hidden = nav.children.length === 0;
  }

  var XState = {
    memory: {
      memoryGapChoice: null,
      sleep: null,
      eat: null,
      move: null,
      adjust: null,
      xvisorCase: null
    },

    getSession: function (key) { return session[key]; },
    setSession: function (key, value) {
      session[key] = value;
      safeWrite("sessionStorage", SESSION_KEY, session);
      if (key === "scene" && value === "R6" && normalizedPath() === "/xircle/routinex") {
        local.routineCompleted = true;
        safeWrite("localStorage", LOCAL_KEY, local);
        renderProgressNav();
      }
    },

    getLocal: function (key) { return local[key]; },
    setLocal: function (key, value) {
      local[key] = value;
      safeWrite("localStorage", LOCAL_KEY, local);
      renderProgressNav();
    },

    touchVisit: function () {
      var today = new Date().toISOString().slice(0, 10);
      if (local.lastVisitDate !== today) {
        local.lastVisitDate = today;
        local.visitCount = (local.visitCount || 0) + 1;
        safeWrite("localStorage", LOCAL_KEY, local);
      }
    },

    completeJourney: function () {
      local.journeyCompleted = true;
      local.journeyCompletedAt = Date.now();
      session.completedFirstJourney = true;
      safeWrite("localStorage", LOCAL_KEY, local);
      safeWrite("sessionStorage", SESSION_KEY, session);
      renderProgressNav();
    },

    resetJourney: function () {
      session = clone(SESSION_DEFAULTS);
      safeWrite("sessionStorage", SESSION_KEY, session);
      Object.keys(this.memory).forEach(function (key) { XState.memory[key] = null; });
    },

    getXtyHandoff: function () {
      var item = local.xtyHandoff;
      if (!validHandoff(item)) {
        if (item) {
          local.xtyHandoff = null;
          safeWrite("localStorage", LOCAL_KEY, local);
          renderProgressNav();
        }
        return null;
      }
      return item;
    },

    clearXtyHandoff: function () {
      local.xtyHandoff = null;
      safeWrite("localStorage", LOCAL_KEY, local);
      renderProgressNav();
    },

    partyJoinUrl: function () {
      var h = this.getXtyHandoff();
      return h ? "/xty/join/?c=" + encodeURIComponent(h.partyCode) : null;
    },

    partyBridgeUrl: function (mode) {
      var h = this.getXtyHandoff();
      if (mode === "join" && h) return "/xircle/care/party/?mode=join";
      return "/xircle/care/party/?mode=create";
    },

    renderProgressNav: renderProgressNav
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

  captureXtyInvite();
  renderProgressNav();
})();