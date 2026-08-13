/* XIRCLE PLAYABLE — playable.js
   Scene engine + interactions for the first-time journey (Blueprint §5–§18).

   Responsibilities (Blueprint §32):
   - scene transitions            - simulator choices (memory-only)
   - Habit Score demo expand      - 28-day fast forward
   - ABCD interaction             - circle preview
   - role fork

   Depends on: state.js (XState), analytics.js (XAnalytics).
   All demo values come from /xircle/data/sim.json with an embedded
   fallback so a failed fetch never breaks the journey. */
(function () {
  "use strict";

  /* ---------------------------------------------------------- config */

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SIM_FALLBACK = {
    sleep: { short: { visual: 0.35 }, mid: { visual: 0.62 }, full: { visual: 0.82 } },
    move: { sedentary: { visual: 0.25 }, walk: { visual: 0.55 }, intentional: { visual: 0.8 } },
    eat: {
      light: { macros: { protein: 0.55, carb: 0.35, fat: 0.3, pattern: 0.7 } },
      balanced: { macros: { protein: 0.65, carb: 0.55, fat: 0.45, pattern: 0.8 } },
      heavy: { macros: { protein: 0.4, carb: 0.75, fat: 0.8, pattern: 0.45 } }
    },
    circle_preview: { size: 5, showed_up: 4 }
  };
  var SIM = SIM_FALLBACK;

  fetch("/xircle/data/sim.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (json) { if (json && json.sleep) SIM = json; })
    .catch(function () { /* fallback stays */ });

  /* scene id → view analytics event (allowlisted names only, §35) */
  var VIEW_EVENTS = {
    S2: "scene_sleep_view",
    S3: "scene_eat_view",
    S4: "scene_move_view",
    S6: "morning_payoff_view",
    S9: "routinex_view",
    S10: "products_view",
    S11: "hardware_view"
  };

  var tracked = {};
  function trackOnce(name, props) {
    if (tracked[name]) return;
    tracked[name] = true;
    window.XAnalytics && window.XAnalytics.track(name, props);
  }
  function track(name, props) {
    window.XAnalytics && window.XAnalytics.track(name, props);
  }

  /* ---------------------------------------------------------- engine */

  var stage, scenes, order, progressBar, current = null;
  var enterHooks = {}, leaveHooks = {};

  function sceneEl(id) {
    return stage.querySelector('[data-scene="' + id + '"]');
  }

  function go(id, instant) {
    var next = sceneEl(id);
    if (!next || (current && current.dataset.scene === id)) return;
    var prev = current;
    current = next;

    if (prev) {
      var prevId = prev.dataset.scene;
      prev.classList.remove("active");
      if (leaveHooks[prevId]) leaveHooks[prevId]();
      if (!instant && !REDUCED) {
        prev.classList.add("leaving");
        setTimeout(function () { prev.classList.remove("leaving"); }, 380);
      }
    }

    next.classList.add("active");
    window.scrollTo(0, 0);

    /* progress + a11y */
    var pct = next.dataset.progress || "0";
    progressBar.style.width = pct + "%";
    progressBar.parentElement.setAttribute("aria-valuenow", pct);

    var heading = next.querySelector(".px-title");
    if (heading) { heading.setAttribute("tabindex", "-1"); heading.focus({ preventScroll: true }); }

    window.XState.setSession("scene", id);
    if (VIEW_EVENTS[id]) trackOnce(VIEW_EVENTS[id]);
    if (enterHooks[id]) enterHooks[id]();
  }

  function onEnter(id, fn) { enterHooks[id] = fn; }
  function onLeave(id, fn) { leaveHooks[id] = fn; }

  /* generic wiring: [data-next] buttons advance scenes */
  function wireNextButtons() {
    stage.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-next]");
      if (btn) go(btn.getAttribute("data-next"));
    });
  }

  /* generic wiring: choice groups (≤3 options, memory-only storage) */
  function wireChoiceGroups() {
    stage.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-choice-group]");
      if (!btn) return;
      var group = btn.getAttribute("data-choice-group");
      var value = btn.getAttribute("data-value");
      var container = btn.closest(".scene");

      container.querySelectorAll('[data-choice-group="' + group + '"]').forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });

      /* Health-like choices: memory only. Never persisted, never tracked. */
      window.XState.memory[group] = value;

      var response = container.querySelector("[data-response]");
      if (response) response.hidden = false;

      /* [data-hold-cta] scenes reveal their own CTA once the copy that
         justifies the scene has actually landed */
      var cta = container.querySelector(".px-cta.reveal-later");
      if (cta && !cta.hasAttribute("data-hold-cta")) cta.classList.add("is-ready");

      var handler = choiceHandlers[group];
      if (handler) handler(value, container);
    });
  }

  /* ------------------------------------------------- scene specifics */

  var choiceHandlers = {

    /* S1 — memory vs measurement: the choice itself is intentionally
       never stored beyond memory and never tracked (§7) */

    /* S2 — sleep arc */
    sleep: function (value, scene) {
      var visual = (SIM.sleep[value] || {}).visual || 0.5;
      var arc = scene.querySelector(".arc-fill");
      if (arc) {
        var len = arc.getTotalLength ? arc.getTotalLength() : 260;
        arc.style.strokeDasharray = len;
        arc.style.strokeDashoffset = len * (1 - visual);
      }
      trackOnce("scene_sleep_complete");
    },

    /* S3 — handled by plate flow below (snap animation) */

    /* S4 — move ring */
    move: function (value, scene) {
      var visual = (SIM.move[value] || {}).visual || 0.5;
      var ring = scene.querySelector(".ring-fill");
      if (ring) {
        var r = parseFloat(ring.getAttribute("r"));
        var c = 2 * Math.PI * r;
        ring.style.strokeDasharray = c;
        ring.style.strokeDashoffset = c * (1 - visual);
      }
      var ticks = scene.querySelectorAll(".move-glowline i");
      var lit = Math.round(visual * ticks.length);
      ticks.forEach(function (t, i) {
        setTimeout(function () { t.classList.toggle("on", i < lit); }, REDUCED ? 0 : i * 70);
      });
      trackOnce("scene_move_complete");
    },

    /* S7 — adjust one thing: track completion only, never the value (§13) */
    adjust: function () {
      trackOnce("adjust_one_complete");
    }
  };

  /* S1 memory gap — staged response lines. The CTA is held back until
     the last line has landed, so the point of the scene cannot be
     clicked past before it is read. */
  function setupS1() {
    var scene = sceneEl("S1");
    if (!scene) return;
    var lines = Array.prototype.slice.call(scene.querySelectorAll("[data-response] .stagger"));
    var cta = scene.querySelector("[data-hold-cta]");
    var staged = false;

    scene.addEventListener("click", function (e) {
      if (!e.target.closest("[data-choice-group='memoryGapChoice']")) return;
      if (staged) return;
      staged = true;

      var step = REDUCED ? 0 : 0.9;
      var lead = REDUCED ? 0 : 0.25;
      lines.forEach(function (l, i) {
        l.style.opacity = "0";
        l.style.transition = "opacity .6s ease " + (lead + i * step) + "s";
        requestAnimationFrame(function () { l.style.opacity = "1"; });
      });

      var settleMs = (lead + Math.max(0, lines.length - 1) * step + 0.6) * 1000;
      setTimeout(function () {
        if (cta) cta.classList.add("is-ready");
      }, REDUCED ? 150 : settleMs);
    });
  }

  /* S3 eat — plate tap → scan sweep → demo macro cards (§9) */
  function setupS3() {
    var scene = sceneEl("S3");
    if (!scene) return;
    var frame = scene.querySelector(".snap-frame");
    var macroWrap = scene.querySelector(".macro-cards");
    var busy = false;

    scene.addEventListener("click", function (e) {
      var plate = e.target.closest(".plate");
      if (!plate || busy) return;
      busy = true;

      scene.querySelectorAll(".plate").forEach(function (p) {
        p.setAttribute("aria-pressed", p === plate ? "true" : "false");
      });
      window.XState.memory.eat = plate.getAttribute("data-value");

      frame.hidden = false;
      var scanMs = REDUCED ? 50 : 1450;
      if (!REDUCED) {
        frame.classList.remove("scanning");
        void frame.offsetWidth; /* restart animation */
        frame.classList.add("scanning");
      }

      setTimeout(function () {
        var macros = (SIM.eat[window.XState.memory.eat] || SIM.eat.balanced).macros;
        macroWrap.hidden = false;
        macroWrap.classList.add("on");
        macroWrap.querySelectorAll(".macro").forEach(function (card) {
          var key = card.getAttribute("data-macro");
          var bar = card.querySelector(".bar i");
          if (bar && macros[key] != null) bar.style.width = Math.round(macros[key] * 100) + "%";
        });
        var response = scene.querySelector("[data-response]");
        if (response) response.hidden = false;
        var cta = scene.querySelector(".px-cta.reveal-later");
        if (cta) cta.classList.add("is-ready");
        trackOnce("scene_eat_complete");
        busy = false;
      }, scanMs);
    });
  }

  /* S5 night — passive cinematic moment, auto-advance (§11) */
  function setupS5() {
    var scene = sceneEl("S5");
    if (!scene) return;
    var timer = null;
    onEnter("S5", function () {
      document.body.classList.add("night");
      timer = setTimeout(function () { go("S6"); }, REDUCED ? 700 : 2400);
    });
    onLeave("S5", function () {
      document.body.classList.remove("night");
      if (timer) clearTimeout(timer);
    });
    scene.addEventListener("click", function () { go("S6"); });
  }

  /* S6 morning payoff — habit ring from the day's memory choices (§12) */
  function setupS6() {
    var scene = sceneEl("S6");
    if (!scene) return;

    onEnter("S6", function () {
      var mem = window.XState.memory;
      var vals = {
        eat: ((SIM.eat[mem.eat] || SIM.eat.balanced).macros || {}).pattern || 0.6,
        move: (SIM.move[mem.move] || { visual: 0.55 }).visual,
        sleep: (SIM.sleep[mem.sleep] || { visual: 0.6 }).visual
      };
      ["eat", "move", "sleep"].forEach(function (k, i) {
        var seg = scene.querySelector(".seg." + k);
        if (!seg) return;
        var r = parseFloat(seg.getAttribute("r"));
        var c = 2 * Math.PI * r;
        var slice = c / 3 - 14; /* three segments with breathing gaps */
        seg.style.strokeDasharray = (slice * vals[k]) + " " + c;
        seg.setAttribute("transform", "rotate(" + (-90 + i * 120) + " 110 110)");
      });

      /* mirror into the explain rows */
      scene.querySelectorAll(".habit-explain .row").forEach(function (row) {
        var k = row.getAttribute("data-k");
        var bar = row.querySelector(".bar i");
        if (bar && vals[k] != null) bar.style.width = Math.round(vals[k] * 100) + "%";
      });
    });

    var toggle = scene.querySelector("[data-explain-toggle]");
    var panel = scene.querySelector(".habit-explain");
    if (toggle && panel) {
      toggle.addEventListener("click", function () {
        var open = panel.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) trackOnce("habit_explain_open");
      });
    }
  }

  /* S8 — 28-day fast forward: behavior fast, outcome slow (§14) */
  function setupS8() {
    var scene = sceneEl("S8");
    if (!scene) return;
    onEnter("S8", function () {
      var wrap = scene.querySelector(".ff-wrap");
      if (wrap) requestAnimationFrame(function () { wrap.classList.add("play"); });
    });
  }

  /* S9 — RoutineX ABCD assembly (§15).
     C is the moment worth earning, not one checkbox among five: tapping
     it lands the trust copy and then snaps the remaining layers into
     place, so assembling a day never turns into a chore list. */
  function setupS9() {
    var scene = sceneEl("S9");
    if (!scene) return;
    var slots = Array.prototype.slice.call(scene.querySelectorAll(".abcd-slot"));
    var trust = scene.querySelector(".trust-c");
    var revealLine = scene.querySelector("[data-routinex-reveal]");
    var cta = scene.querySelector(".px-cta.reveal-later");
    var done = false;

    function fill(slot) {
      if (slot.classList.contains("filled")) return;
      slot.classList.add("filled");
      slot.setAttribute("aria-pressed", "true");
    }

    function complete() {
      if (done) return;
      done = true;
      if (revealLine) revealLine.hidden = false;
      if (cta) cta.classList.add("is-ready");
      trackOnce("abcd_complete");
    }

    scene.addEventListener("click", function (e) {
      var slot = e.target.closest(".abcd-slot");
      if (!slot || done) return;
      fill(slot);

      if (slot.getAttribute("data-slot") === "C") {
        if (trust) trust.classList.add("on");
        var rest = slots.filter(function (s) { return !s.classList.contains("filled"); });
        rest.forEach(function (s, i) {
          setTimeout(function () { fill(s); }, REDUCED ? 0 : 950 + i * 220);
        });
        setTimeout(complete, REDUCED ? 150 : 950 + rest.length * 220 + 350);
        return;
      }

      if (slots.every(function (s) { return s.classList.contains("filled"); })) complete();
    });
  }

  /* S10 — product reveal cards, 3 layers (§16) */
  function setupS10() {
    var scene = sceneEl("S10");
    if (!scene) return;
    scene.addEventListener("click", function (e) {
      var head = e.target.closest(".product-card > button");
      if (!head) return;
      var card = head.parentElement;
      var open = card.classList.toggle("open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
      window.XState.setSession("hasSeenProducts", true);
    });
  }

  /* S12 — circle preview: honest mock, no fake live members (§18, §19) */
  function setupS12() {
    var scene = sceneEl("S12");
    if (!scene) return;
    var createBtn = scene.querySelector("[data-circle-create]");
    var preview = scene.querySelector(".circle-preview");
    var dots = scene.querySelector(".circle-dots");
    var cta = scene.querySelector(".px-cta.reveal-later");

    if (createBtn) {
      createBtn.addEventListener("click", function () {
        preview.classList.add("on");
        if (dots) dots.classList.add("lit");
        createBtn.hidden = true;
        if (cta) cta.classList.add("is-ready");
        window.XState.setLocal("circlePreviewStarted", true);
        trackOnce("circle_preview_start");
        preview.querySelector("h3") && preview.querySelector("h3").focus && void 0;
      });
    }
    var copyBtn = scene.querySelector("[data-invite-copy]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        toast("นี่คือตัวอย่าง UI — ลิงก์เชิญจริงจะเปิดใช้ในเฟส Live Circle");
      });
    }
  }

  /* S13 — role fork + journey completion (§26) */
  function setupS13() {
    var scene = sceneEl("S13");
    if (!scene) return;
    onEnter("S13", function () {
      trackOnce("journey_complete");
      window.XState.setLocal("journeyCompleted", true);
      window.XState.setLocal("journeyCompletedAt", new Date().toISOString().slice(0, 10));
      window.XState.setSession("completedFirstJourney", true);
    });
    var health = scene.querySelector(".fork-card.health");
    var care = scene.querySelector(".fork-card.care");
    if (health) health.addEventListener("click", function () {
      track("health_path_choose");
      window.XState.setLocal("rolePathSeen", "health");
    });
    if (care) care.addEventListener("click", function () {
      track("care_path_choose");
      window.XState.setLocal("rolePathSeen", "care");
    });
    var replay = scene.querySelector("[data-replay]");
    if (replay) replay.addEventListener("click", function () {
      window.XState.resetJourney();
      tracked = {};
      track("journey_start", { replay: true });
      go("S0", true);
    });
  }

  /* ------------------------------------------------------- utilities */

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "px-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add("on"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("on"); }, 3200);
  }

  /* ------------------------------------------------------------ boot */

  document.addEventListener("DOMContentLoaded", function () {
    stage = document.querySelector(".px-stage");
    if (!stage) return;
    progressBar = document.querySelector(".px-progress i");
    scenes = Array.prototype.slice.call(stage.querySelectorAll(".scene"));
    order = scenes.map(function (s) { return s.dataset.scene; });

    window.XState.touchVisit();
    track("xircle_view", { returning: !!window.XState.getLocal("journeyCompleted") });

    wireNextButtons();
    wireChoiceGroups();
    setupS1(); setupS3(); setupS5(); setupS6(); setupS8();
    setupS9(); setupS10(); setupS12(); setupS13();

    /* journey_start on the hook CTA (S0 → S1) */
    var startBtn = document.querySelector("[data-journey-start]");
    if (startBtn) startBtn.addEventListener("click", function () {
      track("journey_start", { replay: false });
    });

    /* quiet exit → Codex/Learn (§4) */
    var exit = document.querySelector(".px-exit");
    if (exit) exit.addEventListener("click", function () { track("learn_more_open"); });

    /* returning visitor shortcut on the hook screen (§20) */
    if (window.XState.getLocal("journeyCompleted")) {
      var returning = document.querySelector("[data-returning-link]");
      if (returning) returning.hidden = false;
    }

    /* resume mid-journey within the same session (§32) */
    var saved = window.XState.getSession("scene");
    if (saved && saved !== "S0" && order.indexOf(saved) > 0) {
      go(saved, true);
      toast("ทำต่อจากจุดที่ค้างไว้");
    } else {
      go("S0", true);
    }
  });

  window.XJourney = { go: go, toast: toast };
})();
