/* /share/code/ · X-VISOR ใส่ Code แล้วกดสร้าง Link ได้ลิงก์ /share/?ref=CODE ไว้ส่งให้ลูกค้า
   จำ Code ล่าสุดไว้ในเครื่อง ครั้งหน้าเปิดมาก็ได้ลิงก์เลย */
(function () {
  'use strict';
  var S = window.MyCloverShare;
  if (!S) return;
  var KEY = 'myclover.share.mycode';
  var form = document.getElementById('form');
  var input = document.getElementById('code');
  var msg = document.getElementById('msg');
  var out = document.getElementById('out');
  var link = document.getElementById('link');
  var open = document.getElementById('open');
  var copy = document.getElementById('copy');
  var send = document.getElementById('send');
  var url = '';

  function show(code, scroll) {
    url = S.shareUrl(location.origin, code);
    link.textContent = url;
    link.href = url;
    open.href = url;
    out.hidden = false;
    msg.hidden = true;
    try { localStorage.setItem(KEY, code); } catch (e) {}
    if (scroll && out.scrollIntoView) out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function flash(button, text) {
    var label = button.dataset.label || (button.dataset.label = button.textContent);
    button.textContent = text;
    button.classList.add('is-done');
    clearTimeout(button._t);
    button._t = setTimeout(function () { button.textContent = label; button.classList.remove('is-done'); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(box);
      box.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      box.remove();
      ok ? resolve() : reject(new Error('copy'));
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var code = S.fromInput(input.value);
    if (!code) {
      out.hidden = true;
      msg.hidden = false;
      input.focus();
      return;
    }
    input.value = code;
    input.blur();
    show(code, true);
    S.track('gen', 'code', '', code);
  });
  input.addEventListener('input', function () { msg.hidden = true; });

  var mine = function () { try { return S.fromInput(localStorage.getItem(KEY)); } catch (e) { return ''; } };
  open.addEventListener('click', function () { S.track('click', 'code', 'open', mine()); });
  copy.addEventListener('click', function () {
    S.track('click', 'code', 'copy', mine());
    copyText(url).then(function () { flash(copy, 'คัดลอกแล้ว'); }, function () { flash(copy, 'กดค้างที่ลิงก์'); });
  });

  if (typeof navigator.share === 'function') {
    send.hidden = false;
    send.addEventListener('click', function () {
      S.track('click', 'code', 'send', mine());
      navigator.share({ url: url }).catch(function () {});
    });
  }

  /* เปิดมาพร้อม ?ref= หรือเคยสร้างไว้แล้ว: เติมให้และแสดงลิงก์ทันที */
  var start = '';
  try { start = S.fromInput(new URLSearchParams(location.search).get('ref')); } catch (e) {}
  if (!start) { try { start = S.fromInput(localStorage.getItem(KEY)); } catch (e) {} }
  if (start) { input.value = start; show(start, false); }
  S.track('view', 'code', '', start);
})();
