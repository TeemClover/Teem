/* /share · หน้าเดียวที่ X-VISOR ส่งให้ลูกค้า
   อ่าน ?ref= แล้วใส่ให้ปุ่มสั่งซื้อ จำรหัสล่าสุดไว้ในเครื่อง เผื่อลูกค้ากลับมาเปิดลิงก์ที่ไม่มีรหัส */
(function () {
  'use strict';
  var S = window.MyCloverShare;
  if (!S) return;
  var KEY = 'myclover.share.ref';
  var root = document.documentElement;
  root.classList.add('js');

  var ref = '';
  try { ref = S.clean(new URLSearchParams(location.search).get('ref')); } catch (e) {}
  try {
    if (ref) localStorage.setItem(KEY, ref);
    else ref = S.clean(localStorage.getItem(KEY));
  } catch (e) {}

  var buy = document.getElementById('buy');
  if (buy) buy.href = S.buyUrl(ref);
  S.track('view', 'share', '', ref);

  /* 4 ปุ่มเปิดแท็บใหม่เสมอ หน้านี้จึงยังอยู่ให้ลูกค้ากลับมากดปุ่มอื่น
     ปุ่ม รูทีน เซอเคิล รีวิว พกรหัสไปด้วย ทุกทางจึงจบที่หน้าสั่งซื้อใต้รหัสของคนส่ง */
  document.querySelectorAll('.tile[data-go]').forEach(function (tile) {
    var go = tile.getAttribute('data-go');
    if (go !== 'buy') tile.href = S.withRef(tile.getAttribute('href'), ref);
    tile.addEventListener('click', function () { S.track('click', 'share', go, ref); });
  });

  var tag = document.getElementById('buy-tag');
  if (tag && ref) {
    tag.textContent = 'รหัส ' + ref;
    tag.lang = 'th';
    tag.classList.add('tile__tag--code');
  }

  /* ปุ่มส่งต่อ: ลิงก์ที่ส่งออกไปมีรหัสเดิมติดไปด้วยเสมอ */
  var fwd = document.getElementById('fwd');
  var fwdText = document.getElementById('fwd-text');
  var canShare = typeof navigator.share === 'function';
  var canCopy = !!(navigator.clipboard && navigator.clipboard.writeText);
  if (fwd && (canShare || canCopy)) {
    fwd.hidden = false;
    var label = fwdText.textContent;
    var timer = 0;
    fwd.addEventListener('click', function () {
      S.track('click', 'share', 'forward', ref);
      var url = S.shareUrl(location.origin, ref);
      function copied() {
        fwdText.textContent = 'คัดลอกลิงก์แล้ว';
        clearTimeout(timer);
        timer = setTimeout(function () { fwdText.textContent = label; }, 1800);
      }
      if (canShare) {
        navigator.share({ title: document.title, url: url }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (canCopy) navigator.clipboard.writeText(url).then(copied, function () {});
        });
      } else {
        navigator.clipboard.writeText(url).then(copied, function () {});
      }
    });
  }

  /* กดแล้วปุ่มยุบลงเล็กน้อย ให้รู้ว่ากดติด แล้วคืนรูปเมื่อกลับมาที่แท็บนี้ */
  function settle() {
    document.querySelectorAll('.tile.is-going').forEach(function (t) { t.classList.remove('is-going'); });
  }
  document.querySelectorAll('.tile').forEach(function (tile) {
    tile.addEventListener('click', function () {
      tile.classList.add('is-going');
      setTimeout(settle, 900);
    });
  });
  window.addEventListener('pageshow', settle);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) settle(); });
})();
