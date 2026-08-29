/* Meet Teem & Ako — Genesis V2 (vanilla, self-contained) */
(function () {
  "use strict";

  /* ---------- analytics ---------- */
  function track(event, payload) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: event }, payload || {}));
  }

  /* ---------- config ---------- */
  var BOOKING_ENDPOINT = "/api/meet";

  var INTENTS = [
    {
      id: "health",
      label: "สุขภาพ",
      short: "อยากรู้จักร่างกายตัวเอง",
      accent: "var(--clover)",
      head: "เริ่มจากร่างกายของคุณ",
      lead: "วัดองค์ประกอบร่างกายฟรี",
      tags: ["ช่วยอ่านค่าให้เข้าใจง่าย", "เก็บผลไว้ในแอพ", "กลับมาเทียบครั้งหน้าได้", "ไม่ต้องซื้อของ"],
      cta: "ลงนัด Body Check-in"
    },
    {
      id: "opportunity",
      label: "โอกาสใหม่",
      short: "อยากมองทางเลือกใหม่",
      accent: "var(--electric)",
      head: "ลองมองทางเลือกใหม่ด้วยกัน",
      lead: "เริ่มจากตัวคุณ ไม่ใช่จาก Pitch",
      tags: ["คุยกับคนจริง", "ดูจากชีวิตจริงของคุณ", "ไม่มีแรงกดดัน", "ยังไม่ต้องตัดสินใจ"],
      cta: "ลงนัดคุยเรื่องโอกาส"
    },
    {
      id: "curious",
      label: "ยังไม่แน่ใจ",
      short: "แค่อยากรู้จักกันก่อน",
      accent: "var(--gold)",
      head: "เริ่มจากการรู้จักกันก่อน",
      lead: "ยังไม่ต้องรู้ว่ากำลังหาอะไร",
      tags: ["คุยสบาย ๆ", "ออนไลน์หรือเจอจริง", "เอาเรื่องที่กำลังคิดมาคุยได้", "ได้มุมมองใหม่กลับไป"],
      cta: "ลงนัดคุยกันก่อน"
    }
  ];

  var MODES = ["ออนไลน์", "เจอกันจริง"];
  var DAYS = ["วันนี้", "พรุ่งนี้", "สุดสัปดาห์", "สัปดาห์หน้า"];
  var TIMES = ["เช้า", "บ่าย", "เย็น", "ค่ำ"];

  var root = document.getElementById("meet-root");
  var state = { intent: null };

  function byId(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function intentById(id) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i];
    return null;
  }
  function chips(container, list) {
    var wrap = el("div", "chip-wrap");
    list.forEach(function (t) { wrap.appendChild(el("span", "meet-chip", t)); });
    container.appendChild(wrap);
    return wrap;
  }

  /* ---------- CHOOSE rows ---------- */
  function renderRows() {
    var host = byId("intent-rows");
    host.innerHTML = "";
    INTENTS.forEach(function (i) {
      var b = el("button", "meet-row");
      b.type = "button";
      b.style.setProperty("--row-accent", i.accent);
      b.setAttribute("data-active", String(state.intent === i.id));
      b.setAttribute("aria-pressed", String(state.intent === i.id));

      var copy = el("span", "row-copy");
      var t = el("span", "meet-display t", i.label);
      var s = el("span", "s", i.short);
      copy.appendChild(t); copy.appendChild(s);

      var mark = el("span", "row-mark", state.intent === i.id ? "✓" : "→");
      mark.setAttribute("aria-hidden", "true");
      mark.style.borderColor = "color-mix(in oklab, " + i.accent + " 45%, transparent)";
      mark.style.color = "color-mix(in oklab, " + i.accent + " 75%, var(--charcoal))";
      mark.style.background = state.intent === i.id ? "color-mix(in oklab, " + i.accent + " 16%, transparent)" : "transparent";

      b.appendChild(copy); b.appendChild(mark);
      b.addEventListener("click", function () { chooseIntent(i.id); });
      host.appendChild(b);
    });
  }

  function chooseIntent(id) {
    state.intent = id;
    root.setAttribute("data-intent", id);
    track("meet_intent", { intent: id });
    renderRows();
    renderValue();
    renderStickyLabel();
    setTimeout(function () {
      byId("value").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  /* ---------- SEE VALUE ---------- */
  function baselineGraphic() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 320 60");
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = "100%";
    svg.style.height = "3.5rem";
    var base = document.createElementNS(ns, "line");
    base.setAttribute("x1", "6"); base.setAttribute("y1", "46");
    base.setAttribute("x2", "314"); base.setAttribute("y2", "46");
    base.setAttribute("stroke", "var(--line)"); base.setAttribute("stroke-width", "1");
    svg.appendChild(base);
    [40, 110, 180, 250, 300].forEach(function (x, idx) {
      var y = 44 - idx * 6;
      var l = document.createElementNS(ns, "line");
      l.setAttribute("x1", x); l.setAttribute("y1", "46");
      l.setAttribute("x2", x); l.setAttribute("y2", y);
      l.setAttribute("stroke", "var(--accent)"); l.setAttribute("stroke-width", "2");
      l.setAttribute("stroke-linecap", "round");
      var c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", "3");
      c.setAttribute("fill", "var(--accent)");
      c.setAttribute("opacity", String(0.35 + idx * 0.16));
      svg.appendChild(l); svg.appendChild(c);
    });
    var tx = document.createElementNS(ns, "text");
    tx.setAttribute("x", "6"); tx.setAttribute("y", "14");
    tx.setAttribute("font-size", "9"); tx.setAttribute("fill", "var(--charcoal-soft)");
    tx.setAttribute("letter-spacing", "2");
    tx.textContent = "BASELINE → COMPARE";
    svg.appendChild(tx);
    return svg;
  }

  function renderValue() {
    var host = byId("value");
    host.innerHTML = "";
    var active = intentById(state.intent);
    if (!active) {
      host.appendChild(el("p", "empty", "เลือกหนึ่งเรื่องด้านบน แล้วเราจะเตรียมให้ตรงกับคุณ"));
      return;
    }
    var panel = el("div", "meet-panel meet-rise");
    panel.appendChild(el("p", "meet-eyebrow", active.id));
    panel.appendChild(el("h3", "meet-display", active.head));
    panel.appendChild(el("p", "lead", active.lead));
    chips(panel, active.tags);

    if (active.id === "health") {
      var box = el("div", "body-box");
      var head = el("div", "head");
      head.appendChild(el("p", "meet-display", "มีเครื่องวัดไปให้ลอง"));
      head.appendChild(el("span", "meet-chip meet-chip-accent", "Free"));
      box.appendChild(head);
      box.appendChild(baselineGraphic());
      chips(box, ["Body Composition", "Baseline", "Track", "Compare Later"]);
      box.appendChild(el("p", "note", "จำตัวเลขแทนคุณ · เก็บค่าร่างกายไว้ในแอพ"));
      panel.appendChild(box);
    }

    var cta = el("button", "meet-cta", active.cta);
    cta.type = "button";
    cta.addEventListener("click", function () { openBooking("value"); });
    panel.appendChild(cta);
    host.appendChild(panel);
  }

  function renderStickyLabel() {
    var active = intentById(state.intent);
    byId("sticky-cta").textContent = active ? active.cta : "ลงนัดเจอเรา";
  }

  /* ---------- portraits: tap to reveal profile link ---------- */
  function initPortraits() {
    var figs = document.querySelectorAll(".portrait");
    Array.prototype.forEach.call(figs, function (fig) {
      var link = fig.querySelector(".profile-link");
      fig.addEventListener("click", function () {
        if (fig.getAttribute("data-revealed") === "true") return;
        fig.setAttribute("data-revealed", "true");
        link.removeAttribute("aria-hidden");
        link.setAttribute("tabindex", "0");
      });
      link.addEventListener("click", function (e) { e.stopPropagation(); });
    });
  }

  /* ---------- BOOKING flow ---------- */
  var sheet = {
    open: false, step: 0, intent: null, mode: null, day: null,
    time: null, name: "", contact: "", note: "", done: false,
    sending: false, error: "", reference: ""
  };

  function openBooking(source) {
    sheet.open = true;
    sheet.done = false;
    sheet.sending = false;
    sheet.error = "";
    sheet.reference = "";
    sheet.intent = state.intent;
    sheet.step = state.intent ? 1 : 0;
    byId("sheet-root").hidden = false;
    document.body.style.overflow = "hidden";
    track("meet_booking_open", { source: source, intent: state.intent || "none" });
    renderSheet();
  }

  function closeBooking() {
    sheet.open = false;
    byId("sheet-root").hidden = true;
    document.body.style.overflow = "";
  }

  function modesFor(intent) {
    return intent === "health"
      ? ["เจอกัน + Body Check-in"].concat(MODES)
      : MODES.concat(["Coffee / Buffet"]);
  }

  function canNext() {
    if (sheet.step === 0) return !!sheet.intent;
    if (sheet.step === 1) return !!sheet.mode;
    if (sheet.step === 2) return !!(sheet.day && sheet.time);
    return !!(sheet.name.trim() && sheet.contact.trim());
  }

  function chipPicker(options, current, onChange) {
    var wrap = el("div", "chip-wrap");
    options.forEach(function (o) {
      var b = el("button", "meet-chip" + (current() === o ? " meet-chip-accent" : ""), o);
      b.type = "button";
      b.setAttribute("aria-pressed", String(current() === o));
      b.addEventListener("click", function () { onChange(o); renderSheet(); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function stepBlock(title) {
    var d = el("div", "meet-rise");
    d.appendChild(el("h4", "meet-display", title));
    return d;
  }

  function labelledField(id, labelText, node) {
    var l = el("label", "field-label", labelText);
    l.setAttribute("for", id);
    return [l, node];
  }

  function input(id, value, placeholder, onInput, multiline) {
    var n = document.createElement(multiline ? "textarea" : "input");
    n.className = "meet-field";
    n.id = id;
    n.value = value;
    n.placeholder = placeholder;
    n.addEventListener("input", function (e) { onInput(e.target.value); });
    return n;
  }

  function renderSheet() {
    var body = byId("sheet-body");
    var foot = byId("sheet-foot");
    var prog = byId("sheet-progress");
    body.innerHTML = "";

    byId("sheet-title").textContent = sheet.done ? "นัดกันแล้ว 🍀" : "มาเจอกัน";
    byId("sheet-sub").textContent = sheet.done ? "ไว้เจอกัน" : "เลือกแบบที่สบายกับคุณ";
    prog.hidden = sheet.done;
    foot.hidden = false;
    byId("sheet-back").hidden = sheet.done;

    Array.prototype.forEach.call(prog.children, function (s, i) {
      s.setAttribute("data-on", String(i <= sheet.step));
    });

    if (sheet.done) {
      var d = el("div");
      d.style.padding = "1.5rem 0";
      d.appendChild(el("p", null, "เราจะเตรียมให้ตรงกับเรื่องที่คุณเลือก"));
      var picked = [];
      var ai = intentById(sheet.intent);
      var w = el("div", "chip-wrap");
      w.appendChild(el("span", "meet-chip meet-chip-accent", ai ? ai.label : "คุยกันก่อน"));
      [sheet.mode, sheet.day, sheet.time].forEach(function (v) {
        if (v) w.appendChild(el("span", "meet-chip", v));
      });
      d.appendChild(w);
      d.appendChild(el("p", "preview-note", sheet.reference
        ? "เราจะทักกลับไปที่ " + sheet.contact.trim() + " เพื่อเคาะเวลาให้ลงตัว · อ้างอิง " + sheet.reference
        : "เราจะทักกลับไปที่ " + sheet.contact.trim() + " เพื่อเคาะเวลาให้ลงตัว"));
      body.appendChild(d);
      byId("sheet-next").textContent = "ส่งเสร็จแล้ว ✓";
      byId("sheet-next").disabled = true;
      return;
    }

    var block;
    if (sheet.step === 0) {
      block = stepBlock("อยากคุยเรื่องอะไร?");
      var rows = el("div", "rows");
      INTENTS.forEach(function (i) {
        var b = el("button", "meet-row");
        b.type = "button";
        b.style.setProperty("--row-accent", i.accent);
        b.setAttribute("data-active", String(sheet.intent === i.id));
        var copy = el("span", "row-copy");
        copy.appendChild(el("span", "meet-display t", i.label));
        copy.appendChild(el("span", "s", i.short));
        b.appendChild(copy);
        b.appendChild(el("span", "row-mark", sheet.intent === i.id ? "✓" : ""));
        b.addEventListener("click", function () {
          sheet.intent = i.id;
          sheet.mode = null;
          state.intent = i.id;
          root.setAttribute("data-intent", i.id);
          track("meet_intent", { intent: i.id, source: "booking" });
          renderRows(); renderValue(); renderStickyLabel(); renderSheet();
        });
        rows.appendChild(b);
      });
      block.appendChild(rows);
    } else if (sheet.step === 1) {
      block = stepBlock("อยากเจอแบบไหน?");
      block.appendChild(chipPicker(modesFor(sheet.intent),
        function () { return sheet.mode; },
        function (v) { sheet.mode = v; track("meet_mode", { mode: v }); }));
    } else if (sheet.step === 2) {
      block = stepBlock("วันไหนสะดวก?");
      block.appendChild(chipPicker(DAYS, function () { return sheet.day; }, function (v) { sheet.day = v; }));
      var lt = el("p", null, "ช่วงเวลา");
      lt.style.cssText = "margin-top:1.5rem;font-size:0.875rem;color:var(--charcoal-soft)";
      block.appendChild(lt);
      block.appendChild(chipPicker(TIMES, function () { return sheet.time; }, function (v) { sheet.time = v; }));
    } else {
      block = stepBlock("ให้เราติดต่อทางไหน?");
      labelledField("meet-name", "อยากให้เราเรียกคุณว่าอะไร?",
        input("meet-name", sheet.name, "ชื่อเล่นก็ได้", function (v) { sheet.name = v; syncNext(); })
      ).forEach(function (n) { block.appendChild(n); });
      labelledField("meet-contact", "LINE หรือเบอร์ที่ติดต่อได้",
        input("meet-contact", sheet.contact, "@line / 08x-xxx-xxxx", function (v) { sheet.contact = v; syncNext(); })
      ).forEach(function (n) { block.appendChild(n); });
      labelledField("meet-note", "มีอะไรอยากบอกเราก่อนเจอไหม?",
        input("meet-note", sheet.note, "ไม่จำเป็นต้องกรอก", function (v) { sheet.note = v; }, true)
      ).forEach(function (n) { block.appendChild(n); });
    }
    body.appendChild(block);

    if (sheet.error) {
      var err = el("p", "sheet-error", sheet.error + " · ข้อมูลที่กรอกยังอยู่ กดยืนยันอีกครั้งได้เลย");
      err.setAttribute("role", "alert");
      body.appendChild(err);
    }

    byId("sheet-next").textContent = sheet.sending
      ? "กำลังส่ง…"
      : (sheet.step === 3 ? (sheet.error ? "ลองอีกครั้ง" : "ยืนยันลงนัด") : "ต่อไป");
    syncNext();
  }

  function syncNext() { byId("sheet-next").disabled = sheet.sending || !canNext(); }

  function submit() {
    if (sheet.sending) return;
    track("meet_submit", { intent: sheet.intent || "none", mode: sheet.mode || "none" });
    sheet.sending = true;
    sheet.error = "";
    renderSheet();

    var payload = {
      intent: sheet.intent, mode: sheet.mode, day: sheet.day, time: sheet.time,
      name: sheet.name.trim(), contact: sheet.contact.trim(), note: sheet.note.trim()
    };

    fetch(BOOKING_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (result) {
        if (!response.ok || !result.ok) throw new Error(result.message || "ส่งข้อมูลไม่สำเร็จ");
        return result;
      });
    }).then(function (result) {
      sheet.sending = false;
      sheet.done = true;
      sheet.reference = result.reference || "";
      track("meet_complete", { intent: sheet.intent || "none" });
      renderSheet();
    }).catch(function (error) {
      // Keep every answer on screen so retrying costs one tap, not a refill.
      sheet.sending = false;
      sheet.error = error.message || "ส่งข้อมูลไม่สำเร็จ";
      track("meet_submit_failed", { intent: sheet.intent || "none" });
      renderSheet();
    });
  }

  /* ---------- wiring ---------- */
  function init() {
    renderRows();
    renderValue();
    renderStickyLabel();
    initPortraits();

    Array.prototype.forEach.call(document.querySelectorAll("[data-book]"), function (b) {
      b.addEventListener("click", function () { openBooking(b.getAttribute("data-book")); });
    });
    byId("to-choose").addEventListener("click", function () {
      byId("choose").scrollIntoView({ behavior: "smooth" });
    });
    byId("sheet-close").addEventListener("click", closeBooking);
    byId("sheet-scrim").addEventListener("click", closeBooking);
    byId("sheet-back").addEventListener("click", function () {
      if (sheet.step === 0) closeBooking();
      else { sheet.step -= 1; renderSheet(); }
    });
    byId("sheet-next").addEventListener("click", function () {
      if (!canNext()) return;
      if (sheet.step === 3) submit();
      else { sheet.step += 1; renderSheet(); }
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.open) closeBooking();
    });

    track("meet_view");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
