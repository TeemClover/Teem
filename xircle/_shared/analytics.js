/* XIRCLE PLAYABLE — analytics.js
   Blueprint §35. This is an ADAPTER, not a tracker.

   Contract:
     XAnalytics.track(name, safeProps)

   Rules enforced here, not by convention:
   - Event name must be in the allowlist below. Anything else is dropped.
   - Property values may only be booleans or numbers, and only for
     allowlisted keys. Strings are dropped (no free-text can leak).
   - Health-like values (sleep/eat/move/adjust choices, scores, weight,
     body composition) must never reach this file. state.js keeps them
     in memory; nothing wires them here.

   Transport: pushes to window.dataLayer when present, logs to console
   when flags.debug is true. Swapping in a real collector later means
   changing send() only. */
(function () {
  "use strict";

  var ALLOWED_EVENTS = [
    "xircle_view",
    "journey_start",
    "scene_sleep_view", "scene_sleep_complete",
    "scene_eat_view", "scene_eat_complete",
    "scene_move_view", "scene_move_complete",
    "morning_payoff_view",
    "habit_explain_open",
    "adjust_one_complete",
    "routinex_view",
    "abcd_complete",
    "products_view",
    "hardware_view",
    "circle_preview_start",
    "journey_complete",
    "opportunity_view",
    "xvisor_sim_start", "xvisor_sim_complete",
    "health_path_choose", "care_path_choose",
    "learn_more_open"
  ];

  var ALLOWED_PROP_KEYS = ["replay", "returning", "scene_index", "day"];

  var allow = {};
  ALLOWED_EVENTS.forEach(function (e) { allow[e] = true; });

  var flags = { analytics: "console", debug: false };
  var queue = [];
  var ready = false;

  function sanitize(props) {
    var out = {};
    if (!props) return out;
    ALLOWED_PROP_KEYS.forEach(function (k) {
      var v = props[k];
      if (typeof v === "boolean" || typeof v === "number") out[k] = v;
    });
    return out;
  }

  function send(name, props) {
    var payload = { event: "xircle." + name, props: props, ts: Date.now() };
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(payload);
    if (flags.debug || flags.analytics === "console") {
      try { console.debug("[xircle-analytics]", payload.event, props); } catch (e) {}
    }
  }

  var XAnalytics = {
    track: function (name, props) {
      if (!allow[name]) {
        try { console.warn("[xircle-analytics] dropped non-allowlisted event:", name); } catch (e) {}
        return;
      }
      var clean = sanitize(props);
      if (ready) send(name, clean);
      else queue.push([name, clean]);
    },
    _configure: function (f) {
      if (f && typeof f === "object") flags = Object.assign(flags, f);
      ready = true;
      queue.splice(0).forEach(function (item) { send(item[0], item[1]); });
    }
  };

  window.XAnalytics = XAnalytics;

  /* flags.json is optional; adapter works with defaults if it is missing. */
  fetch("/xircle/data/flags.json", { cache: "no-cache" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (f) { XAnalytics._configure(f || {}); })
    .catch(function () { XAnalytics._configure({}); });
})();
