/* /share/stat · อ่านสรุปจาก /api/share-stat (ต้องล็อกอินหลังบ้าน) แล้ววาดเป็นตัวเลข แท่ง และตาราง */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var days = 7;
  try { var saved = Number(localStorage.getItem('myclover.sharestat.days')); if ([1, 7, 30, 90, 0].indexOf(saved) >= 0 && localStorage.getItem('myclover.sharestat.days') !== null) days = saved; } catch (e) {}

  var MENU = [
    ['share', 'routinex', 'รูทีน'],
    ['share', 'xircle', 'เซอเคิล'],
    ['share', 'review', 'รวมรีวิว'],
    ['share', 'buy', 'สั่งซื้อ (หน้าแชร์)'],
    ['routinex', 'buy', 'สั่งซื้อ จากหน้ารูทีน'],
    ['xircle', 'buy', 'สั่งซื้อ จากหน้าเซอเคิล'],
    ['review', 'buy', 'สั่งซื้อ จากหน้ารีวิว'],
    ['share', 'forward', 'ส่งต่อหน้าแชร์'],
    ['code', 'copy', 'คัดลอกลิงก์ (หน้าสร้าง)'],
    ['code', 'send', 'ส่งต่อลิงก์ (หน้าสร้าง)'],
    ['code', 'open', 'เปิดดูลิงก์ (หน้าสร้าง)'],
  ];
  var DEVICES = { line: 'LINE', facebook: 'Facebook / Messenger', instagram: 'Instagram', tiktok: 'TikTok', mobile: 'มือถือ (เบราว์เซอร์)', tablet: 'แท็บเล็ต', desktop: 'คอมพิวเตอร์' };
  var PAGES = { share: 'หน้าแชร์', code: 'หน้าสร้างลิงก์', slide: 'สไลด์', routinex: 'รูทีน (มาจากลิงก์แชร์)', xircle: 'เซอเคิล (มาจากลิงก์แชร์)', review: 'รีวิว (มาจากลิงก์แชร์)' };

  function n(v) { return Number(v || 0).toLocaleString('th-TH'); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function status(text, error) {
    var s = $('status');
    s.textContent = text || '';
    s.hidden = !text;
    s.classList.toggle('is-error', !!error);
  }

  function request(url, body) {
    return fetch(url, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var err = new Error(data.error || 'HTTP_' + res.status); err.code = data.error || 'HTTP_' + res.status; err.status = res.status; throw err; }
        return data;
      });
    });
  }

  function bars(box, rows, buyKey) {
    box.textContent = '';
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0);
    if (!max) { box.appendChild(el('p', 'empty', 'ยังไม่มีข้อมูลในช่วงนี้')); return; }
    rows.forEach(function (r) {
      var row = el('div', 'bar' + (buyKey && buyKey(r) ? ' bar--buy' : ''));
      row.appendChild(el('span', 'bar__name', r.label));
      var track = el('span', 'bar__track');
      var fill = el('span', 'bar__fill');
      fill.style.width = (r.value ? Math.max(3, r.value / max * 100) : 0) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('span', 'bar__num', n(r.value)));
      box.appendChild(row);
    });
  }

  function table(id, rows, cells, cols) {
    var body = $(id).tBodies[0];
    body.textContent = '';
    if (!rows.length) {
      var tr = el('tr'); var td = el('td', 'empty', 'ยังไม่มีข้อมูลในช่วงนี้');
      td.colSpan = cols; tr.appendChild(td); body.appendChild(tr); return;
    }
    rows.forEach(function (r) {
      var tr = el('tr');
      cells(r).forEach(function (c) { tr.appendChild(el('td', c[1] || '', c[0])); });
      body.appendChild(tr);
    });
  }

  function short(at) { return at ? at.slice(5).replace('-', '/') : ''; }

  function render(d) {
    var s = d.summary || {};
    $('k-views').textContent = n(s.share_views);
    $('k-visitors').textContent = n(s.share_visitors) + ' คน';
    $('k-buy').textContent = n(s.buy_clicks);
    $('k-buyrate').textContent = s.share_views ? Math.round(s.buy_clicks / s.share_views * 100) + '% ของการเปิด' : 'ทุกหน้า';
    $('k-gens').textContent = n(s.gens);
    $('k-codes').textContent = n(s.gen_codes) + ' รหัส';
    $('k-refs').textContent = n(s.share_refs);
    $('k-dest').textContent = n(s.dest_views) + ' เปิดหน้าปลายทาง';

    var clicks = {};
    (d.clicks || []).forEach(function (c) { clicks[c.page + '/' + c.target] = c.clicks; });
    bars($('menu'), MENU.map(function (m) { return { label: m[2], value: clicks[m[0] + '/' + m[1]] || 0, target: m[1] }; })
      .filter(function (r, i) { return i < 4 || r.value; }), function (r) { return r.target === 'buy'; });

    table('refs', d.refs || [], function (r) {
      return [
        [r.ref || 'ไม่มีรหัส (CLOVERX)', r.ref ? '' : 'is-none'], [n(r.views)], [n(r.visitors)],
        [n(r.routinex)], [n(r.xircle)], [n(r.review)], [n(r.buy), 'buy'], [short(r.last_at), 'muted'],
      ];
    }, 8);
    table('gens', d.gens || [], function (r) {
      return [[r.code], [n(r.gens)], [n(r.devices)], [short(r.first_at), 'muted'], [short(r.last_at), 'muted']];
    }, 5);
    table('daily', d.daily || [], function (r) {
      return [[r.day.slice(8) + '/' + r.day.slice(5, 7) + '/' + r.day.slice(2, 4)], [n(r.views)], [n(r.clicks)], [n(r.buy), 'buy'], [n(r.gens)]];
    }, 5);
    bars($('devices'), (d.devices || []).map(function (r) { return { label: DEVICES[r.device] || r.device || 'ไม่ทราบ', value: r.views }; }));
    bars($('pages'), (d.pages || []).map(function (r) { return { label: PAGES[r.page] || r.page, value: r.views }; }));

    var first = d.coverage && d.coverage.first_at;
    $('foot').textContent = 'เวลาไทย · เริ่มเก็บ ' + (first || '-') + ' · อัปเดต ' + new Date(d.generatedAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  function load() {
    status('กำลังโหลด…');
    return request('/api/share-stat?days=' + days).then(function (data) {
      $('login').hidden = true;
      $('range').hidden = false;
      $('dash').hidden = false;
      status('');
      render(data);
    }, function (err) {
      if (err.status === 401) { showLogin(); return; }
      status('โหลดไม่สำเร็จ (' + err.code + ') ลองใหม่อีกครั้ง', true);
    });
  }

  function showLogin() {
    $('dash').hidden = true;
    $('range').hidden = true;
    $('login').hidden = false;
    status('');
    $('password').focus();
  }

  $('login').addEventListener('submit', function (event) {
    event.preventDefault();
    var pw = $('password').value;
    var msg = $('login-msg');
    msg.hidden = true;
    if (!pw) { $('password').focus(); return; }
    request('/api/backoffice-auth', { action: 'login', password: pw }).then(function () {
      $('password').value = '';
      return load();
    }, function (err) {
      msg.textContent = err.code === 'TOO_MANY_ATTEMPTS' ? 'ลองผิดหลายครั้ง รอสักครู่แล้วลองใหม่' : err.code === 'BAD_PASSWORD' ? 'รหัสไม่ถูก' : 'เข้าไม่ได้ (' + err.code + ')';
      msg.hidden = false;
    });
  });

  var buttons = document.querySelectorAll('#range button');
  function mark() { buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.days) === days)); }); }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      days = Number(b.dataset.days);
      try { localStorage.setItem('myclover.sharestat.days', String(days)); } catch (e) {}
      mark();
      load();
    });
  });
  mark();

  $('logout').addEventListener('click', function () {
    request('/api/backoffice-auth', { action: 'logout' }).then(showLogin, showLogin);
  });

  /* กลับมาที่แท็บนี้ อัปเดตตัวเลขให้เอง */
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('dash').hidden) load(); });
  load();
})();
