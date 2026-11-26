/* /welcome · ภาพเคลื่อนไหวตอนเลื่อน + รหัสคนชวน + ปุ่มติดต่อ
   ตั้งค่าได้ใน index.html โดยไม่ต้องแก้ไฟล์นี้:
   - คลิปพี่ทอม: ใส่ id ของ YouTube ที่ #film data-youtube="..."
   - LINE ของทีม: ใส่ลิงก์ที่ #cta-line data-line="https://lin.ee/..." */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ปรากฏตอนเลื่อนถึง ---------- */
  var targets = document.querySelectorAll('.reveal, .rule, .luck__word');
  if (!('IntersectionObserver' in window) || reduce) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Reach · Read · Result ติดไฟทีละคำ ---------- */
  var rrr = document.querySelector('[data-rrr]');
  if (rrr) {
    var words = rrr.querySelectorAll('li');
    var lightAll = function () { words.forEach(function (w) { w.classList.add('on'); }); };
    if (reduce || !('IntersectionObserver' in window)) lightAll();
    else {
      var rio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        rio.disconnect();
        words.forEach(function (w, i) { setTimeout(function () { w.classList.add('on'); }, 250 + i * 650); });
      }, { threshold: 0.4 });
      rio.observe(rrr);
    }
  }

  /* ---------- บันได: เส้นไฟไต่ตามการเลื่อน ขั้นไหนถึงก็ติดไฟ ---------- */
  var ladder = document.querySelector('[data-ladder]');
  var steps = ladder ? ladder.querySelectorAll('.step') : [];
  var counted = false;
  function countUp(el) {
    var to = Number(el.getAttribute('data-count')) || 0;
    if (reduce) { el.textContent = to; return; }
    var t0 = null;
    function tick(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  function onScroll() {
    if (!ladder) return;
    var box = ladder.getBoundingClientRect();
    var mark = window.innerHeight * 0.62;
    var p = Math.max(0, Math.min(1, (mark - box.top) / box.height));
    ladder.style.setProperty('--p', p.toFixed(3));
    steps.forEach(function (s) {
      var dot = s.querySelector('.step__dot').getBoundingClientRect();
      if (dot.top < mark) {
        if (!s.classList.contains('lit')) {
          s.classList.add('lit');
          var num = s.querySelector('[data-count]');
          if (num && !counted) { counted = true; countUp(num); }
        }
      }
    });
  }
  if (ladder) {
    if (reduce) {
      ladder.style.setProperty('--p', '1');
      steps.forEach(function (s) { s.classList.add('lit'); });
    } else {
      var queued = false;
      window.addEventListener('scroll', function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; onScroll(); });
      }, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  }

  /* ---------- รหัสคนชวน: /welcome/?ref=CODE ---------- */
  var S = window.MyCloverShare;
  var KEY = 'myclover.welcome.ref';
  var ref = '';
  if (S) {
    try { ref = S.clean(new URLSearchParams(location.search).get('ref')); } catch (e) {}
    try {
      if (ref) localStorage.setItem(KEY, ref);
      else ref = S.clean(localStorage.getItem(KEY));
    } catch (e) {}
  }
  if (ref) {
    var box = document.getElementById('ref');
    document.getElementById('ref-code').textContent = ref;
    box.hidden = false;
  }

  /* ---------- ปุ่ม LINE: ขึ้นเมื่อใส่ลิงก์ของทีมแล้ว (https เท่านั้น) ---------- */
  var line = document.getElementById('cta-line');
  var lineUrl = line && line.getAttribute('data-line');
  if (lineUrl && /^https:\/\/(lin\.ee|line\.me)\//.test(lineUrl)) {
    line.href = lineUrl;
    line.target = '_blank';
    line.rel = 'noopener';
    line.hidden = false;
  }

  /* ---------- คลิปพี่ทอม: ขึ้นเมื่อใส่ id ของ YouTube แล้ว ---------- */
  var film = document.getElementById('film');
  var yt = film && film.getAttribute('data-youtube');
  if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + yt + '?rel=0&playsinline=1';
    f.title = 'คลิปต้อนรับจากพี่ทอม';
    f.loading = 'lazy';
    f.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    film.querySelector('.film__frame').appendChild(f);
    film.hidden = false;
  }
})();
