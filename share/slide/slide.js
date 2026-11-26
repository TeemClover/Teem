/* /share/slide/ · เปลี่ยนสไลด์ด้วยปุ่ม ลูกศรคีย์บอร์ด ปัดซ้ายขวา หรือแตะครึ่งจอ
   ลิงก์ตรงไปสไลด์ไหนก็ได้ด้วย #3 · ไม่มี JavaScript ก็ยังกดภาพย่อเพื่อเปิดภาพเต็มได้ */
(function () {
  'use strict';
  var thumbs = Array.prototype.slice.call(document.querySelectorAll('.thumb'));
  var total = thumbs.length;
  var shot = document.getElementById('shot');
  var frame = document.getElementById('frame');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var now = document.getElementById('now');
  var save = document.getElementById('save');
  var full = document.getElementById('full');
  var cur = 0;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var src = function (n) { return '/share/slide/img/slide-' + pad(n) + '.webp'; };
  var cache = {};

  function warm(n) {
    if (n < 1 || n > total || cache[n]) return;
    cache[n] = new Image();
    cache[n].src = src(n);
  }

  function show(n, push) {
    n = Math.max(1, Math.min(total, n | 0));
    if (n === cur && shot.getAttribute('src') === src(n)) return;
    cur = n;
    shot.classList.add('is-swap');
    var img = cache[n] || new Image();
    var done = function () {
      shot.src = src(n);
      shot.alt = thumbs[n - 1].querySelector('img').alt;
      shot.classList.remove('is-swap');
    };
    if (img.complete && img.naturalWidth) done(); else { img.onload = done; img.onerror = done; img.src = src(n); cache[n] = img; }
    now.textContent = n;
    prev.disabled = n === 1;
    next.disabled = n === total;
    save.href = '/share/slide/img/slide-' + pad(n) + '.jpg';
    save.setAttribute('download', 'share-link-slide-' + pad(n) + '.jpg');
    thumbs.forEach(function (t, i) {
      var on = i === n - 1;
      t.classList.toggle('is-on', on);
      if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    var t = thumbs[n - 1];
    var bar = t.parentNode;
    if (t.offsetLeft < bar.scrollLeft || t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth) {
      bar.scrollTo({ left: t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
    }
    if (push !== false) {
      try { history.replaceState(null, '', '#' + n); } catch (e) {}
    }
    warm(n + 1); warm(n - 1);
  }

  prev.addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
  next.addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });
  thumbs.forEach(function (t, i) {
    t.addEventListener('click', function (e) { e.preventDefault(); show(i + 1); });
  });

  /* แตะครึ่งซ้าย = ย้อน แตะครึ่งขวา = ถัดไป */
  frame.addEventListener('click', function (e) {
    var r = frame.getBoundingClientRect();
    show(e.clientX - r.left < r.width / 2 ? cur - 1 : cur + 1);
  });

  /* ปัดซ้ายขวา */
  var x0 = null, y0 = 0, moved = false;
  frame.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; moved = false; }, { passive: true });
  frame.addEventListener('touchmove', function (e) {
    if (x0 === null) return;
    if (Math.abs(e.touches[0].clientX - x0) > 12) moved = true;
  }, { passive: true });
  frame.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (moved && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      show(dx < 0 ? cur + 1 : cur - 1);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(cur - 1); }
    else if (e.key === 'Home') show(1);
    else if (e.key === 'End') show(total);
  });

  /* เต็มจอ (ถ้าเบราว์เซอร์รองรับ) */
  var req = frame.requestFullscreen || frame.webkitRequestFullscreen;
  if (req) {
    full.hidden = false;
    full.addEventListener('click', function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        try { var p = req.call(frame); if (p && p.catch) p.catch(function () {}); } catch (err) {}
      }
    });
  }

  window.addEventListener('hashchange', function () { show(parseInt(location.hash.slice(1), 10) || 1, false); });
  show(parseInt(location.hash.slice(1), 10) || 1, false);
})();
