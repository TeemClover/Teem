/* XIRCLE × XTY PARTNER EXPERIENCE — state.js
   v8 navigation model:
   first run = one straight journey
   Xircle → Human Care → X-VISOR → RoutineX → White Cat · XTY
   full shortcuts unlock only after all five milestones have been seen.

   State only. UI belongs to each route.
   memory  = health-like simulator choices; never persisted
   session = current journey state for this visit
   local   = non-sensitive continuity / invite state
*/
(function () {
  "use strict";

  var SESSION_KEY = "xircle.session.v1";
  var LOCAL_KEY = "xircle.local.v1";
  var HANDOFF_TTL = 35 * 24 * 60 * 60 * 1000;

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

  function isXircleRoute(path) {
    return path === "/xircle" || path.indexOf("/xircle/") === 0;
  }

  function normalizedHrefPath(href) {
    try {
      return String(new URL(href, location.origin).pathname || "/").replace(/\/+$/, "") || "/";
    } catch (e) {
      return String(href || "").split("?")[0].replace(/\/+$/, "") || "/";
    }
  }

  function addShortcut(nav, href, label, className) {
    var a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (className) a.className = className;
    nav.appendChild(a);
    return a;
  }

  function currentHandoff() {
    return validHandoff(local.xtyHandoff) ? local.xtyHandoff : null;
  }

  function whiteCatActionUrl() {
    var h = currentHandoff();
    return h
      ? "/xty/join/?c=" + encodeURIComponent(h.partyCode)
      : "/xty/new/?template=xircle_xvisor";
  }

  function whiteCatBridgeUrl() {
    return currentHandoff()
      ? "/xircle/care/party/?mode=join"
      : "/xircle/care/party/?mode=create";
  }

  function journeyFullyUnlocked() {
    return !!(
      local.journeyCompleted &&
      local.careIntroSeen &&
      local.xvisorSimCompleted &&
      local.routineCompleted &&
      local.whiteCatIntroSeen
    );
  }

  function linearNext() {
    if (!local.journeyCompleted) {
      return { href: "/xircle/", label: "เริ่ม · Xircle", step: 1, total: 5 };
    }
    if (!local.careIntroSeen) {
      return { href: "/xircle/care/", label: "ต่อ · Human Care", step: 2, total: 5 };
    }
    if (!local.xvisorSimCompleted) {
      return { href: "/xircle/opportunity/", label: "ต่อ · X-VISOR", step: 3, total: 5 };
    }
    if (!local.routineCompleted) {
      return { href: "/xircle/routinex/", label: "ต่อ · RoutineX", step: 4, total: 5 };
    }
    if (!local.whiteCatIntroSeen) {
      var h = currentHandoff();
      return {
        href: whiteCatBridgeUrl(),
        label: h ? "ต่อ · แมวขาว · ตี้ " + h.partyCode : "ต่อ · แมวขาว · XTY",
        step: 5,
        total: 5,
        cat: true
      };
    }
    return null;
  }

  function renderUnlockVisibility() {
    var open = journeyFullyUnlocked();
    var nodes = document.querySelectorAll("[data-after-unlock]");
    Array.prototype.forEach.call(nodes, function (el) {
      el.hidden = !open;
    });
    try {
      document.documentElement.classList.toggle("xircle-journey-unlocked", open);
      document.documentElement.classList.toggle("xircle-journey-linear", !open);
    } catch (e) {}
  }

  function renderProgressNav() {
    var path = normalizedPath();
    if (!isXircleRoute(path)) return;
    var nav = document.querySelector(".xp-nav");
    if (!nav) return;

    nav.innerHTML = "";

    if (!journeyFullyUnlocked()) {
      nav.setAttribute("aria-label", "ทางไปต่อ");
      var next = linearNext();
      if (next && normalizedHrefPath(next.href) !== path) {
        var a = addShortcut(nav, next.href, next.label, next.cat ? "cat" : "");
        a.setAttribute("data-journey-next", String(next.step));
      }
      nav.hidden = nav.children.length === 0;
      renderUnlockVisibility();
      return;
    }

    nav.setAttribute("aria-label", "ทางลัด");

    if (path !== "/xircle") addShortcut(nav, "/xircle/", "Xircle");
    if (path !== "/xircle/opportunity") addShortcut(nav, "/xircle/opportunity/", "X-VISOR");
    if (path !== "/xircle/routinex") addShortcut(nav, "/xircle/routinex/", "RoutineX");
    if (path !== "/xircle/learn" && path.indexOf("/xircle/doc") !== 0) {
      addShortcut(nav, "/xircle/learn/", "Library");
    }

    var h = currentHandoff();
    var cat = addShortcut(
      nav,
      whiteCatActionUrl(),
      h ? "เข้าตี้ " + h.partyCode : "แมวขาว · XTY",
      "cat"
    );
    cat.setAttribute("data-whitecat-link", "1");
    cat.setAttribute("data-nav-cat", "1");

    nav.hidden = nav.children.length === 0;
    renderUnlockVisibility();
  }

  function markCurrentRouteSeen() {
    var path = normalizedPath();
    var changed = false;

    if (path === "/xircle/care" && !local.careIntroSeen) {
      local.careIntroSeen = true;
      changed = true;
    }
    if (path === "/xircle/care/party" && !local.whiteCatIntroSeen) {
      local.whiteCatIntroSeen = true;
      changed = true;
    }

    // Migration for people who finished the old route before Human Care
    // became an explicit milestone in the straight-line journey.
    if (
      !local.careIntroSeen &&
      local.journeyCompleted &&
      local.xvisorSimCompleted &&
      local.routineCompleted &&
      local.whiteCatIntroSeen
    ) {
      local.careIntroSeen = true;
      changed = true;
    }

    if (changed) safeWrite("localStorage", LOCAL_KEY, local);
  }

  function upgradeWhiteCatVisuals() {
    var legacy = document.querySelectorAll(".xp-cat-stage");
    Array.prototype.forEach.call(legacy, function (stage) {
      if (!stage.querySelector(".xp-cat")) return;
      stage.classList.add("xp-cat-cutout-stage");
      stage.setAttribute("data-whitecat-cutout", "1");
      stage.innerHTML = '<img src="/xircle/assets/v5/whitecat-guide-cutout.webp?v=20260817-final" alt="แมวขาว · XTY">';
    });
  }

  function wireWhiteCatActions() {
    upgradeWhiteCatVisuals();

    var h = currentHandoff();
    var url = whiteCatActionUrl();

    var links = document.querySelectorAll("[data-whitecat-link]");
    Array.prototype.forEach.call(links, function (a) {
      if (a.tagName === "A") a.href = url;
      a.setAttribute("data-whitecat-resolved", h ? "join" : "create");
      if (a.hasAttribute("data-nav-cat")) {
        a.textContent = h ? "เข้าตี้ " + h.partyCode : "แมวขาว · XTY";
      } else if (a.classList.contains("xp-btn")) {
        a.textContent = h ? "เข้าตี้ " + h.partyCode + " →" : "เปิดตี้แมวขาว →";
      }
    });

    var cutouts = document.querySelectorAll(
      ".xp-cat-cutout-stage, .xp-whitecat-visual, [data-whitecat-cutout]"
    );
    Array.prototype.forEach.call(cutouts, function (el) {
      el.setAttribute("role", "link");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", h ? "เข้าตี้แมวขาว " + h.partyCode : "เปิดตี้แมวขาว");
      el.setAttribute("data-whitecat-cutout", "1");
      el.style.cursor = "pointer";
    });
  }

  function enhancePartyPage() {
    if (normalizedPath() !== "/xircle/care/party") return;

    var h = currentHandoff();
    var actions = document.getElementById("partyActions");
    var kicker = document.getElementById("partyKicker");
    var title = document.getElementById("partyTitle");
    var lede = document.getElementById("partyLede");
    var art = document.getElementById("partyArt");
    var bottom = document.getElementById("bottomAction");

    if (h) {
      if (kicker) kicker.textContent = "X-VISOR INVITE · ตี้ " + h.partyCode;
      if (title) title.innerHTML = "มีคนชวนคุณ<br>ทำ 1 อย่างไปด้วยกัน";
      if (lede) lede.innerHTML = "28 วัน · ไม่ต้องทำคนเดียว<br><strong>จะเข้าตี้นี้ หรือเปิดตี้ของตัวเองก็ได้</strong>";
      if (actions) {
        actions.innerHTML =
          '<a class="xp-btn gold" href="/xty/join/?c=' + encodeURIComponent(h.partyCode) + '">เข้าตี้ ' + h.partyCode + ' →</a>' +
          '<a class="xp-btn ghost" href="/xty/new/?template=xircle_xvisor">เปิดตี้ของฉันเอง</a>';
      }
      if (art) {
        art.setAttribute("data-art-src", "/xircle/assets/v5/xircle-party-join-hero.webp");
        art.src = "/xircle/assets/v5/xircle-party-join-hero.webp?v=20260817-final";
      }
      if (bottom) {
        bottom.href = "/xty/join/?c=" + encodeURIComponent(h.partyCode);
        bottom.textContent = "เข้าตี้ " + h.partyCode + " →";
      }
    } else {
      if (kicker) kicker.textContent = "XIRCLE × myClover XTY";
      if (title) title.innerHTML = "28 วัน<br>1 Action<br>ทำด้วยกัน";
      if (lede) lede.innerHTML = "เปิดตี้ของตัวเองได้เลย<br><strong>หรือถ้ามีรหัสตี้อยู่แล้ว ก็เลือกเข้าตี้ได้</strong>";
      if (actions) {
        actions.innerHTML =
          '<a class="xp-btn gold" href="/xty/new/?template=xircle_xvisor">ตั้ง Action แล้วเปิดตี้ →</a>' +
          '<a class="xp-btn ghost" href="/xty/join/">มีรหัสตี้ · เข้าตี้</a>';
      }
      if (art) {
        art.setAttribute("data-art-src", "/xircle/assets/v5/xircle-party-create-hero.webp");
        art.src = "/xircle/assets/v5/xircle-party-create-hero.webp?v=20260817-final";
      }
      if (bottom) {
        bottom.href = "/xty/new/?template=xircle_xvisor";
        bottom.textContent = "เปิดตี้แมวขาว →";
      }
    }
  }

  function activateWhiteCat(target, event) {
    if (!target || !target.closest) return false;
    var hit = target.closest(
      "[data-whitecat-link], .xp-cat-cutout-stage, .xp-whitecat-visual, [data-whitecat-cutout]"
    );
    if (!hit) return false;
    if (event) event.preventDefault();
    location.href = whiteCatActionUrl();
    return true;
  }

  function guardLinearJourney(target, event) {
    if (journeyFullyUnlocked() || !target || !target.closest) return false;
    var a = target.closest("a[href]");
    if (!a || a.hasAttribute("data-whitecat-link")) return false;

    var url;
    try { url = new URL(a.href, location.origin); } catch (e) { return false; }
    if (url.origin !== location.origin || !isXircleRoute(normalizedHrefPath(url.pathname))) return false;

    var next = linearNext();
    if (!next) return false;
    var intended = normalizedHrefPath(url.pathname);
    var required = normalizedHrefPath(next.href);
    if (intended === required) return false;

    if (event) event.preventDefault();
    location.href = next.href;
    return true;
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
        wireWhiteCatActions();
      }
    },

    getLocal: function (key) { return local[key]; },
    setLocal: function (key, value) {
      local[key] = value;
      safeWrite("localStorage", LOCAL_KEY, local);
      renderProgressNav();
      wireWhiteCatActions();
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
          wireWhiteCatActions();
        }
        return null;
      }
      return item;
    },

    clearXtyHandoff: function () {
      local.xtyHandoff = null;
      safeWrite("localStorage", LOCAL_KEY, local);
      renderProgressNav();
      wireWhiteCatActions();
    },

    partyJoinUrl: function () {
      var h = this.getXtyHandoff();
      return h ? "/xty/join/?c=" + encodeURIComponent(h.partyCode) : null;
    },

    partyCreateUrl: function () {
      return "/xty/new/?template=xircle_xvisor";
    },

    whiteCatActionUrl: whiteCatActionUrl,
    whiteCatBridgeUrl: whiteCatBridgeUrl,
    journeyFullyUnlocked: journeyFullyUnlocked,
    linearNext: linearNext,

    partyBridgeUrl: function (mode) {
      var h = this.getXtyHandoff();
      if (mode === "join" && h) return "/xircle/care/party/?mode=join";
      return "/xircle/care/party/?mode=create";
    },

    renderProgressNav: renderProgressNav,
    wireWhiteCatActions: wireWhiteCatActions
  };

  window.XState = XState;

  function captureXtyInvite() {
    try {
      var url = new URL(window.location.href);
      var path = String(url.pathname || "");
      var mode = url.searchParams.get("mode");
      var code = url.searchParams.get("xty") || url.searchParams.get("invite") || "";

      if (!/^\d{5}$/.test(String(code || "")) && path.indexOf("/xircle") === 0 && mode === "join") {
        code = url.searchParams.get("c") || "";
      }

      if (!/^\d{5}$/.test(String(code || ""))) return;

      local.xtyHandoff = {
        partyCode: String(code),
        source: "xircle_invite",
        xvisor: url.searchParams.get("xvisor") === "1",
        receivedAt: Date.now()
      };
      safeWrite("localStorage", LOCAL_KEY, local);

      url.searchParams.delete("xty");
      url.searchParams.delete("invite");
      url.searchParams.delete("c");
      url.searchParams.delete("xvisor");
      history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
    } catch (e) {}
  }

  document.addEventListener("click", function (event) {
    if (activateWhiteCat(event.target, event)) return;
    guardLinearJourney(event.target, event);
  }, true);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var target = event.target;
    if (!target || !target.matches || !target.matches("[data-whitecat-cutout]")) return;
    event.preventDefault();
    location.href = whiteCatActionUrl();
  });

  captureXtyInvite();
  markCurrentRouteSeen();
  renderProgressNav();
  wireWhiteCatActions();
  enhancePartyPage();
  setTimeout(function () {
    renderProgressNav();
    wireWhiteCatActions();
    enhancePartyPage();
  }, 0);
  setTimeout(function () {
    wireWhiteCatActions();
    enhancePartyPage();
  }, 250);
})();