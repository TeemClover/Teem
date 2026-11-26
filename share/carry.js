/* ปุ่มสั่งซื้อเล็ก ๆ สำหรับหน้า รูทีน เซอเคิล รีวิว
   ใส่ไว้ท้ายหน้าแบบนี้ (ต้องโหลด /share/ref.js ก่อน):
     <script defer src="/share/ref.js"></script>
     <script defer src="/share/carry.js" data-page="xircle"></script>
   รหัสผู้แนะนำมาจาก ?ref= ในลิงก์ หรือรหัสล่าสุดที่จำไว้จากหน้า /share ถ้าไม่มีเลยใช้ CLOVERX
   ปุ่มเปิดหน้าสั่งซื้อในแท็บใหม่ และบันทึกสถิติไปที่ /share/stat */
(function () {
  'use strict';
  var S = window.MyCloverShare;
  var me = document.currentScript;
  if (!S || !document.body || document.getElementById('mc-buy')) return;
  var KEY = 'myclover.share.ref';
  var page = (me && me.getAttribute('data-page')) || '';

  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }
  var urlRef = S.clean(params.get('ref'));
  var ref = urlRef;
  try {
    if (urlRef && urlRef.toUpperCase() !== S.DEFAULT_REF) localStorage.setItem(KEY, urlRef);
    if (!ref) ref = S.clean(localStorage.getItem(KEY));
  } catch (e) {}

  /* นับว่าเข้ามาจากลิงก์แชร์ (มีรหัส หรือกดมาจากหน้า /share) */
  if (urlRef || params.get('from') === 'share') S.track('view', page, '', urlRef);

  var host = document.createElement('div');
  host.id = 'mc-buy';
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  shadow.innerHTML =
    '<style>' +
    'a{position:fixed;z-index:60;right:max(14px,env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom));' +
    'display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 16px 0 13px;border-radius:999px;box-sizing:border-box;' +
    'background:rgba(255,255,255,.9);color:#1c46b0;font:600 14px/1 "IBM Plex Sans Thai","Noto Sans Thai",system-ui,sans-serif;letter-spacing:0;' +
    'text-decoration:none;-webkit-tap-highlight-color:transparent;' +
    'box-shadow:0 8px 22px -8px rgba(14,27,61,.45),0 0 0 1px rgba(67,136,253,.25);' +
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
    'opacity:0;transform:translateY(12px);transition:opacity .45s ease,transform .45s cubic-bezier(.2,.8,.2,1),background .2s}' +
    'a.on{opacity:1;transform:none}a:hover{background:#fff}a:active{transform:scale(.95)}' +
    'a:focus-visible{outline:3px solid #4388fd;outline-offset:3px}' +
    'svg{width:17px;height:17px;flex:none}' +
    '@media print{a{display:none}}' +
    '@media (prefers-reduced-motion:reduce){a{transition:none}}' +
    '</style>' +
    '<a part="button" target="_blank" rel="noopener">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.4" fill="currentColor"/><circle cx="17" cy="19.5" r="1.4" fill="currentColor"/></svg>' +
    '<span></span></a>';

  var link = shadow.querySelector('a');
  var label = shadow.querySelector('span');
  link.href = S.buyUrl(ref);
  function text() {
    var en = /^en/i.test(document.documentElement.lang || '');
    label.textContent = en ? 'Order' : 'สั่งซื้อ';
    link.setAttribute('aria-label', en ? 'Order Xircle and RoutineX' : 'สั่งซื้อ Xircle และ RoutineX');
  }
  text();
  if (window.MutationObserver) new MutationObserver(text).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  link.addEventListener('click', function () {
    /* ถ้ามีคนเปิดลิงก์แชร์อื่นในแท็บอื่นระหว่างนี้ ใช้รหัสล่าสุด */
    var now = urlRef;
    if (!now) { try { now = S.clean(localStorage.getItem(KEY)); } catch (e) {} }
    link.href = S.buyUrl(now);
    S.track('click', page, 'buy', now);
  });

  document.body.appendChild(host);
  setTimeout(function () { link.classList.add('on'); }, 900);
})();
