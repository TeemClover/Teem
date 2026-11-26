/* /share · กติกาของรหัสผู้แนะนำ (ref) ใช้ร่วมกันทั้งหน้า /share/ และ /share/code/
   รหัสมาจาก ?ref= ที่ X-VISOR ส่งให้ลูกค้า แล้วถูกส่งต่อไปที่หน้าสั่งซื้อเท่านั้น */
(function (root) {
  'use strict';
  var BUY = 'https://buy.xircle.health/';
  var MAX = 32;
  /* ลูกค้าที่เปิดมาโดยไม่มีรหัสผู้แนะนำ สั่งซื้อใต้รหัสของบริษัท */
  var DEFAULT_REF = 'CLOVERX';

  /* เก็บเฉพาะตัวอักษรอังกฤษ ตัวเลข ขีดกลาง ขีดล่าง ไม่แก้ตัวพิมพ์ */
  function clean(value) {
    return String(value == null ? '' : value).trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, MAX);
  }

  /* ช่องกรอกในหน้าสร้างลิงก์: รับได้ทั้งรหัสล้วน และลิงก์ที่มี ?ref= ติดมา แล้วทำเป็นตัวพิมพ์ใหญ่ */
  function fromInput(value) {
    var text = String(value == null ? '' : value).trim();
    var found = text.match(/[?&]ref=([^&#\s]*)/i);
    if (found) {
      try { text = decodeURIComponent(found[1]); } catch (e) { text = found[1]; }
    }
    return clean(text).toUpperCase();
  }

  function buyUrl(ref) {
    var code = clean(ref) || DEFAULT_REF;
    return BUY + '?ref=' + encodeURIComponent(code) + '&openExternalBrowser=1';
  }

  function shareUrl(origin, ref) {
    var code = clean(ref);
    return String(origin || '').replace(/\/+$/, '') + '/share/' + (code ? '?ref=' + encodeURIComponent(code) : '');
  }

  /* ลิงก์ไปหน้า รูทีน เซอเคิล รีวิว พกรหัสไปด้วย หน้าเหล่านั้นจะได้ทำปุ่มสั่งซื้อใต้รหัสเดิม
     ไม่มีรหัสก็บอกแค่ว่ามาจากหน้าแชร์ ปลายทางใช้รหัสที่จำไว้ หรือ CLOVERX */
  function withRef(path, ref) {
    var code = clean(ref);
    var parts = String(path).split('#');
    var param = code ? 'ref=' + encodeURIComponent(code) : 'from=share';
    return parts[0] + (parts[0].indexOf('?') < 0 ? '?' : '&') + param + (parts.length > 1 ? '#' + parts.slice(1).join('#') : '');
  }

  /* รหัสเครื่องแบบสุ่ม ใช้นับคนไม่ซ้ำในหน้าสถิติเท่านั้น */
  function visitor() {
    try {
      var id = localStorage.getItem('myclover.share.vid') || '';
      if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
        id = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID()
          : 'v' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
        localStorage.setItem('myclover.share.vid', id);
      }
      return id;
    } catch (e) { return ''; }
  }

  /* ส่งเหตุการณ์ไปเก็บที่ /api/share-stat ไม่รอผล ไม่ทำให้หน้าเว็บช้า */
  function track(kind, page, target, ref) {
    try {
      if (!root.fetch || !root.location || !/^https?:$/.test(root.location.protocol)) return;
      root.fetch('/api/share-stat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: kind, page: page, target: target || '', ref: clean(ref).toUpperCase(), vid: visitor() }),
        keepalive: true,
        credentials: 'omit',
      }).catch(function () {});
    } catch (e) {}
  }

  root.MyCloverShare = {
    DEFAULT_REF: DEFAULT_REF, clean: clean, fromInput: fromInput, buyUrl: buyUrl, shareUrl: shareUrl,
    withRef: withRef, track: track,
  };
})(typeof window !== 'undefined' ? window : globalThis);
