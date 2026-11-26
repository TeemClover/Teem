/* /share · กติกาของรหัสผู้แนะนำ (ref) ใช้ร่วมกันทั้งหน้า /share/ และ /share/code/
   รหัสมาจาก ?ref= ที่ X-VISOR ส่งให้ลูกค้า แล้วถูกส่งต่อไปที่หน้าสั่งซื้อเท่านั้น */
(function (root) {
  'use strict';
  var BUY = 'https://buy.xircle.health/';
  var MAX = 32;

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
    var code = clean(ref);
    return BUY + '?' + (code ? 'ref=' + encodeURIComponent(code) + '&' : '') + 'openExternalBrowser=1';
  }

  function shareUrl(origin, ref) {
    var code = clean(ref);
    return String(origin || '').replace(/\/+$/, '') + '/share/' + (code ? '?ref=' + encodeURIComponent(code) : '');
  }

  root.MyCloverShare = { clean: clean, fromInput: fromInput, buyUrl: buyUrl, shareUrl: shareUrl };
})(typeof window !== 'undefined' ? window : globalThis);
