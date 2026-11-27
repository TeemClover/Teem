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

  function table(id, rows, cells, cols, emptyText) {
    var body = $(id).tBodies[0];
    body.textContent = '';
    if (!rows.length) {
      var tr = el('tr'); var td = el('td', 'empty', emptyText || 'ยังไม่มีข้อมูลในช่วงนี้');
      td.colSpan = cols; tr.appendChild(td); body.appendChild(tr); return;
    }
    rows.forEach(function (r) {
      var tr = el('tr');
      cells(r).forEach(function (c) {
        if (c[0] && c[0].nodeType) { var cell = el('td', c[1] || ''); cell.appendChild(c[0]); tr.appendChild(cell); }
        else tr.appendChild(el('td', c[1] || '', c[0]));
      });
      body.appendChild(tr);
    });
  }

  /* รหัส + ชื่อเจ้าของรหัสจากหน้าสมัคร buy.xircle.health · หาไม่เจอ = รหัสผิด */
  var ROLES = { X_LEAD: 'X-LEAD', X_VISOR: 'X-VISOR', X_GEN: 'X-GEN', X_PLORER: 'X-PLORER' };
  var names = {};
  function who(code) {
    var box = el('span', 'who');
    var top = el('span', 'who__code', code);
    box.appendChild(top);
    var info = names[code];
    if (!info || info.status === 'pending') box.appendChild(el('span', 'who__name is-wait', 'กำลังตรวจรหัส…'));
    else if (info.status === 'not_found') box.appendChild(el('span', 'who__bad', 'รหัสผิด'));
    else if (info.status === 'error') box.appendChild(el('span', 'who__name is-wait', 'ตรวจรหัสไม่ได้ ลองใหม่ภายหลัง'));
    else {
      if (info.role) top.appendChild(el('small', 'who__role', ROLES[info.role] || info.role.replace(/_/g, '-')));
      box.appendChild(el('span', 'who__name', info.name || (code === 'CLOVERX' ? 'CloverX (รหัสกลาง)' : 'รหัสถูก ไม่มีชื่อ')));
    }
    return box;
  }

  function short(at) { return at ? at.slice(5).replace('-', '/') : ''; }

  /* ---------- ตาราง: แสดงทีละหน้า (10 25 50 100) + ซ่อนรหัสผิด ---------- */
  var SIZES = [10, 25, 50, 100];
  var METRICS = { views: 'เปิดหน้าแชร์', clicks: 'กดเมนู', buy: 'กดสั่งซื้อ', gens: 'สร้างลิงก์' };
  var ui = { size: 10, hideBad: false, metric: 'views', mode: 'day', day: '', page: { refs: 0, gens: 0 } };
  try {
    var kept = JSON.parse(localStorage.getItem('myclover.sharestat.ui') || '{}');
    if (SIZES.indexOf(kept.size) >= 0) ui.size = kept.size;
    ui.hideBad = kept.hideBad === true;
    if (METRICS[kept.metric]) ui.metric = kept.metric;
  } catch (e) {}
  function keep() {
    try { localStorage.setItem('myclover.sharestat.ui', JSON.stringify({ size: ui.size, hideBad: ui.hideBad, metric: ui.metric })); } catch (e) {}
  }
  var last = null;
  function isBad(code) { return !!code && !!names[code] && names[code].status === 'not_found'; }

  function pagedTable(id, rows, codeOf, cells, cols) {
    var bad = rows.filter(function (r) { return isBad(codeOf(r)); }).length;
    var list = ui.hideBad ? rows.filter(function (r) { return !isBad(codeOf(r)); }) : rows;
    var pages = Math.max(1, Math.ceil(list.length / ui.size));
    ui.page[id] = Math.max(0, Math.min(ui.page[id], pages - 1));
    var start = ui.page[id] * ui.size;
    table(id, list.slice(start, start + ui.size), cells, cols, rows.length && !list.length ? 'มีแต่รหัสผิด (ซ่อนอยู่)' : '');
    var tools = document.querySelector('.tools[data-for="' + id + '"]');
    var chip = tools.querySelector('[data-hide-bad]');
    chip.hidden = !bad;
    chip.setAttribute('aria-pressed', String(ui.hideBad));
    chip.querySelector('[data-bad-count]').textContent = n(bad);
    tools.querySelectorAll('[data-size]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.size) === ui.size)); });
    var pager = document.querySelector('[data-pager="' + id + '"]');
    pager.hidden = pages < 2;
    pager.querySelector('[data-page-label]').textContent = list.length ? (start + 1) + '–' + Math.min(start + ui.size, list.length) + ' จาก ' + n(list.length) : '';
    pager.querySelector('[data-step="-1"]').disabled = ui.page[id] === 0;
    pager.querySelector('[data-step="1"]').disabled = ui.page[id] >= pages - 1;
  }

  function renderTables(d) {
    pagedTable('refs', d.refs || [], function (r) { return r.ref; }, function (r) {
      return [
        r.ref ? [who(r.ref)] : ['ไม่มีรหัส (CLOVERX)', 'is-none'], [n(r.views)], [n(r.visitors)],
        [n(r.routinex)], [n(r.xircle)], [n(r.review)], [n(r.buy), 'buy'], [short(r.last_at), 'muted'],
      ];
    }, 8);
    pagedTable('gens', d.gens || [], function (r) { return r.code; }, function (r) {
      return [[who(r.code)], [n(r.gens)], [n(r.devices)], [short(r.first_at), 'muted'], [short(r.last_at), 'muted']];
    }, 5);
  }

  /* ---------- กราฟ: รายวัน แตะวันไหนดูช่วงเวลาของวันนั้น ---------- */
  function today() { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function addDays(day, k) { var t = new Date(day + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + k); return t.toISOString().slice(0, 10); }
  function dm(day) { return Number(day.slice(8)) + '/' + Number(day.slice(5, 7)); }
  function nice(max) {
    if (max <= 4) return Math.max(1, max);
    var p = Math.pow(10, Math.floor(Math.log10(max))), steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * p >= max) return steps[i] * p;
    return 10 * p;
  }
  function zero() { return { views: 0, clicks: 0, buy: 0, gens: 0 }; }
  function addTo(t, r) { t.views += r.views; t.clicks += r.clicks; t.buy += r.buy; t.gens += r.gens; }

  function trendData(d) {
    var hourly = d.hourly || [];
    if (ui.mode === 'hour') {
      var hours = []; for (var h = 0; h < 24; h++) hours.push({ key: String(h), label: (h < 10 ? '0' : '') + h + ':00', t: zero() });
      hourly.forEach(function (r) { if (!ui.day || r.day === ui.day) addTo(hours[r.hour].t, r); });
      return hours;
    }
    var end = today(), start;
    if (days > 0) start = addDays(end, 1 - days);
    else start = hourly.length ? hourly[0].day : end;
    if (addDays(start, 400) < end) start = addDays(end, -400);
    var map = {}, list = [];
    for (var day = start; day <= end; day = addDays(day, 1)) { map[day] = { key: day, label: dm(day), t: zero() }; list.push(map[day]); }
    hourly.forEach(function (r) { if (map[r.day]) addTo(map[r.day].t, r); });
    return list;
  }

  function tipText(item) {
    var t = item.t, head = ui.mode === 'hour' ? item.label + '–' + item.label.slice(0, 2) + ':59' + (ui.day ? ' · ' + dm(ui.day) : '') : 'วันที่ ' + item.label;
    var parts = Object.keys(METRICS).map(function (k) { return METRICS[k] + ' ' + n(t[k]); });
    return head + '\n' + parts.slice(0, 2).join(' · ') + '\n' + parts.slice(2).join(' · ');
  }

  function renderTrend(d) {
    var hourMode = ui.mode === 'hour';
    document.querySelectorAll('#trend-view [data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === ui.mode)); });
    document.querySelectorAll('#trend-metric [data-metric]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.metric === ui.metric)); });
    $('trend-title').textContent = hourMode ? 'ช่วงเวลาไหนคนแชร์เยอะ' : 'การแชร์รายวัน';
    var items = trendData(d), key = ui.metric, label = METRICS[key];
    var total = 0, peak = null;
    items.forEach(function (it) { total += it.t[key]; if (!peak || it.t[key] > peak.t[key]) peak = it; });
    var note = $('trend-note');
    note.textContent = '';
    if (hourMode && ui.day) {
      note.appendChild(document.createTextNode('วันที่ ' + dm(ui.day) + ' · '));
      var back = el('button', 'linkish', 'ดูรวมทุกวัน');
      back.type = 'button';
      back.addEventListener('click', function () { ui.day = ''; renderTrend(last); });
      note.appendChild(back);
      note.appendChild(document.createTextNode(' · '));
    }
    if (!total) note.appendChild(document.createTextNode(label + ' ยังไม่มีในช่วงนี้'));
    else note.appendChild(document.createTextNode(label + ' รวม ' + n(total) + ' ครั้ง · ' + (hourMode ? 'เยอะสุดช่วง ' + peak.label + '–' + peak.label.slice(0, 2) + ':59' : 'เยอะสุดวันที่ ' + peak.label) + ' (' + n(peak.t[key]) + ')'));
    $('trend-hint').textContent = hourMode ? 'แตะแท่งเพื่อดูตัวเลขทุกแบบของช่วงนั้น' : 'แตะแท่งของวันไหน เพื่อดูว่าวันนั้นคนแชร์ช่วงกี่โมง';

    var chart = $('chart');
    chart.textContent = '';
    chart.setAttribute('aria-label', (hourMode ? 'กราฟรายชั่วโมง ' : 'กราฟรายวัน ') + label + ' รวม ' + total);
    var max = nice(peak ? peak.t[key] : 0);
    var plot = el('div', 'chart__plot');
    [1, 0.5, 0].forEach(function (f) {
      var line = el('div', 'chart__grid');
      line.style.bottom = (f * 100) + '%';
      line.appendChild(el('span', '', f ? n(Math.round(max * f * 10) / 10) : '0'));
      plot.appendChild(line);
    });
    var cols = el('div', 'chart__cols');
    var axis = el('div', 'chart__axis');
    var every = hourMode ? 3 : Math.max(1, Math.ceil(items.length / 7));
    var tip = el('div', 'chart__tip');
    tip.hidden = true;
    items.forEach(function (it, i) {
      var v = it.t[key];
      var col = el('button', 'col' + (v && it === peak ? ' is-peak' : ''));
      col.type = 'button';
      col.setAttribute('aria-label', tipText(it).replace(/\n/g, ' · '));
      var bar = el('span', 'col__bar');
      bar.style.height = v ? Math.max(2, v / max * 100) + '%' : '0';
      col.appendChild(bar);
      if (v && it === peak) bar.appendChild(el('span', 'col__val', n(v)));
      var show = function () {
        tip.textContent = tipText(it);
        tip.hidden = false;
        var box = chart.getBoundingClientRect(), mid = col.getBoundingClientRect();
        var half = tip.offsetWidth / 2, x = mid.left + mid.width / 2 - box.left;
        tip.style.left = Math.max(half, Math.min(box.width - half, x)) + 'px';
      };
      col.addEventListener('pointerenter', show);
      col.addEventListener('focus', show);
      col.addEventListener('pointerleave', function () { tip.hidden = true; });
      col.addEventListener('blur', function () { tip.hidden = true; });
      col.addEventListener('click', function () {
        if (hourMode) { show(); return; }
        ui.mode = 'hour'; ui.day = it.key; renderTrend(last);
        $('chart').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      cols.appendChild(col);
      axis.appendChild(el('span', '', i % every === 0 ? (hourMode ? it.label.slice(0, 2) : it.label) : ''));
    });
    plot.appendChild(cols);
    chart.appendChild(plot);
    chart.appendChild(axis);
    chart.appendChild(tip);
  }

  function render(d) {
    var s = d.summary || {};
    names = d.names || {};
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

    last = d;
    renderTables(d);
    renderTrend(d);
    table('daily', d.daily || [], function (r) {
      return [[r.day.slice(8) + '/' + r.day.slice(5, 7) + '/' + r.day.slice(2, 4)], [n(r.views)], [n(r.clicks)], [n(r.buy), 'buy'], [n(r.gens)]];
    }, 5);
    bars($('devices'), (d.devices || []).map(function (r) { return { label: DEVICES[r.device] || r.device || 'ไม่ทราบ', value: r.views }; }));
    bars($('pages'), (d.pages || []).map(function (r) { return { label: PAGES[r.page] || r.page, value: r.views }; }));

    var first = d.coverage && d.coverage.first_at;
    $('foot').textContent = 'เวลาไทย · เริ่มเก็บ ' + (first || '-') + ' · อัปเดต ' + new Date(d.generatedAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }

  var retry = 0, tries = 0;
  function load() {
    status('กำลังโหลด…');
    return request('/api/share-stat?days=' + days).then(function (data) {
      $('login').hidden = true;
      $('range').hidden = false;
      $('dash').hidden = false;
      status('');
      render(data);
      /* รหัสใหม่หลายตัวถามชื่อไม่ทันในรอบเดียว โหลดซ้ำให้เองอีกครั้ง */
      var waiting = Object.keys(data.names || {}).some(function (k) { return data.names[k].status === 'pending'; });
      clearTimeout(retry);
      if (waiting && tries < 5) { tries++; retry = setTimeout(load, 1500); } else if (!waiting) tries = 0;
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
      ui.page = { refs: 0, gens: 0 }; ui.day = ''; ui.mode = days === 1 ? 'hour' : 'day';
      try { localStorage.setItem('myclover.sharestat.days', String(days)); } catch (e) {}
      mark();
      load();
    });
  });
  mark();
  if (days === 1) ui.mode = 'hour';

  document.querySelectorAll('.tools').forEach(function (tools) {
    tools.querySelector('[data-hide-bad]').addEventListener('click', function () {
      ui.hideBad = !ui.hideBad; ui.page = { refs: 0, gens: 0 }; keep(); if (last) renderTables(last);
    });
    tools.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () { ui.size = Number(b.dataset.size); ui.page = { refs: 0, gens: 0 }; keep(); if (last) renderTables(last); });
    });
  });
  document.querySelectorAll('[data-pager]').forEach(function (pager) {
    pager.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        ui.page[pager.dataset.pager] += Number(b.dataset.step);
        if (last) renderTables(last);
        var card = pager.closest('section');
        if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    });
  });
  document.querySelectorAll('#trend-view [data-view]').forEach(function (b) {
    b.addEventListener('click', function () { ui.mode = b.dataset.view; ui.day = ''; if (last) renderTrend(last); });
  });
  document.querySelectorAll('#trend-metric [data-metric]').forEach(function (b) {
    b.addEventListener('click', function () { ui.metric = b.dataset.metric; keep(); if (last) renderTrend(last); });
  });

  $('logout').addEventListener('click', function () {
    request('/api/backoffice-auth', { action: 'logout' }).then(showLogin, showLogin);
  });

  /* กลับมาที่แท็บนี้ อัปเดตตัวเลขให้เอง */
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !$('dash').hidden) load(); });
  load();
})();
