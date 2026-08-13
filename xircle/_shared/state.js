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
    rolePathSeen: null /* "health" | "care" — navigation preference, not a health value */
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
    }
  };

  window.XState = XState;
})();
