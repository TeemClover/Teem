/* XIRCLE PLAYABLE — source-drawer.js
   Blueprint §30, §32. Deep-dive transparency layer.

   Any element with [data-source-id] opens a bottom drawer showing that
   entry from /xircle/data/sources.json: name, canon status, disclaimer,
   last reviewed date. The main journey stays clean; trust lives one tap
   away. */
(function () {
  "use strict";

  var sources = null;
  var drawer, backdrop, lastFocus = null;

  function buildDom() {
    backdrop = document.createElement("div");
    backdrop.className = "px-drawer-backdrop";
    drawer = document.createElement("div");
    drawer.className = "px-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "ที่มาของข้อมูล");
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  function statusLabel(status) {
    var map = {
      canon: "CANON",
      public_safe: "PUBLIC SAFE",
      provisional: "PROVISIONAL",
      need_source: "NEED SOURCE",
      demo_only: "DEMO ONLY",
      internal: "INTERNAL"
    };
    return map[status] || String(status || "").toUpperCase();
  }

  function render(entry) {
    var chipClass = (entry.status === "provisional" || entry.status === "need_source" || entry.status === "demo_only")
      ? "provisional" : (entry.status === "canon" ? "canon" : "public_safe");
    drawer.innerHTML =
      '<div class="grab" aria-hidden="true"></div>' +
      '<h3></h3>' +
      '<span class="status-chip ' + chipClass + '"></span>' +
      '<p class="note"></p>' +
      '<p class="disclaimer" style="font-size:12.5px;color:var(--cream-dim)"></p>' +
      '<div class="meta"></div>' +
      '<button type="button" class="px-cta" style="margin-top:20px;min-height:48px">ปิด</button>';
    drawer.querySelector("h3").textContent = entry.name || entry.id;
    drawer.querySelector(".status-chip").textContent = statusLabel(entry.status);
    drawer.querySelector(".note").textContent = entry.note || "";
    drawer.querySelector(".disclaimer").textContent = entry.disclaimer || "";
    drawer.querySelector(".meta").textContent = entry.last_reviewed
      ? "ตรวจทานล่าสุด: " + entry.last_reviewed : "";
    drawer.querySelector("button").addEventListener("click", close);
  }

  function open(id) {
    lastFocus = document.activeElement;
    var show = function (entry) {
      render(entry);
      backdrop.classList.add("on");
      drawer.classList.add("on");
      drawer.querySelector("button").focus();
    };
    if (sources) {
      show(sources[id] || { id: id, status: "need_source", note: "ยังไม่มีรายละเอียดแหล่งข้อมูลสำหรับรายการนี้" });
      return;
    }
    fetch("/xircle/data/sources.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (json) {
        sources = json || {};
        show(sources[id] || { id: id, status: "need_source", note: "ยังไม่มีรายละเอียดแหล่งข้อมูลสำหรับรายการนี้" });
      })
      .catch(function () {
        show({ id: id, status: "need_source", note: "โหลดแหล่งข้อมูลไม่สำเร็จ" });
      });
  }

  function close() {
    if (!drawer) return;
    backdrop.classList.remove("on");
    drawer.classList.remove("on");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildDom();
    document.body.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-source-id]");
      if (btn) open(btn.getAttribute("data-source-id"));
    });
  });

  window.XSourceDrawer = { open: open, close: close };
})();
