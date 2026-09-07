import {
  ANALYTICS_VERSION, EVENTS, PRIMARY_EVENTS, ENVIRONMENTS, SOURCES,
  VISITOR_CLASSES, VIEWPORTS, INTENTS, DOORS, environmentForHost,
} from '/assets/front-door/contract.js';

// This page only reads aggregates. It must never emit analytics events.
const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat('en-US');
const format = value => number.format(Number.isFinite(Number(value)) ? Number(value) : 0);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = {
  FRONTDOOR_OPEN: 'OPEN', FRONTDOOR_CHOICE: 'FIRST TOUCH', LUCKY_RETURN: 'LUCKY RETURN',
  REWARD_HORIZON: 'REWARD HORIZON', DOOR_FOUND: 'DOOR FOUND', SAVE: 'SAVE',
  DOOR_OPEN: 'DOOR OPEN', RETURN: 'RETURN', FRONTDOOR_FREE_ROAM: 'FREE ROAM',
  RESUME: 'RESUME', REBUILD: 'REBUILD', ANOMALY_START: 'ANOMALY',
  LEGACY_WARNING: 'LEGACY WARNING', DUNGEON_HANDOFF: 'DUNGEON HANDOFF',
  FRONTDOOR_REACTION_COMPLETE: 'REACTION COMPLETE',
};
const dimensionLabels = { source: 'Source', visitorClass: 'ผู้มาเยือน', viewport: 'หน้าจอ', intentPrimary: 'ความสนใจ', doorId: 'ประตู' };
const values = {
  new: 'ใหม่', legacy: 'มีประวัติเดิม', 'returning-frontdoor': 'กลับสู่ Front Door',
  'returning-room': 'เคยเข้าห้อง', veteran: 'ประวัติลึก', mobile: 'Mobile',
  tablet: 'Tablet', desktop: 'Desktop', build: 'BUILD', curious: 'CURIOUS',
  self: 'SELF', people: 'PEOPLE', income: 'INCOME', dungeon: 'THE DUNGEON',
};
const optionalFilters = ['source', 'visitorClass', 'viewport', 'intentPrimary', 'doorId'];
let controller;
let requestSequence = 0;

function options(id, items, all = true) {
  $(id).replaceChildren(...(all ? [new Option('ทั้งหมด', '')] : []), ...items.map(value => new Option(values[value] || value, value)));
}

function showState(state, title, message, retry = false, protectedLink = false) {
  $('state').hidden = false;
  $('state').dataset.state = state;
  $('state-title').textContent = title;
  $('state-message').textContent = message;
  $('retry').hidden = !retry;
  $('protected-link').hidden = !protectedLink;
}

function metric(data, name) {
  return data.metrics[name] || { installations: 0, journeys: 0, events: 0 };
}

function kpi(data, name) {
  const counts = metric(data, name);
  return `<article class="kpi" data-event="${name}"><h3 class="kpi-label">${labels[name]}</h3>`
    + `<strong class="kpi-value">${format(counts.installations)}</strong><p class="kpi-description">${EVENTS[name].label}</p>`
    + `<p class="kpi-detail">${format(counts.journeys)} journeys · ${format(counts.events)} events</p></article>`;
}

function duration(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${format(Math.round(ms))} <small>มิลลิวินาที</small>`;
  if (ms < 60000) return `${number.format(Math.round(ms / 100) / 10)} <small>วินาที</small>`;
  return `${number.format(Math.round(ms / 6000) / 10)} <small>นาที</small>`;
}

function render(data) {
  $('primary-kpis').innerHTML = PRIMARY_EVENTS.map(name => kpi(data, name)).join('');
  $('continuation-kpis').innerHTML = ['FRONTDOOR_FREE_ROAM', 'RESUME', 'REBUILD'].map(name => kpi(data, name)).join('');
  $('branch-kpis').innerHTML = ['ANOMALY_START', 'LEGACY_WARNING', 'DUNGEON_HANDOFF'].map(name => kpi(data, name)).join('');
  $('timings').innerHTML = [['activeMsToFirstChoice', 'ถึง First Touch'], ['activeMsToLuckyReturn', 'ถึง Lucky Return'], ['activeMsToDoorFound', 'ถึง Door Found']]
    .map(([key, label]) => `<article class="timing"><p>${label}</p><strong>${duration(data.timings[key])}</strong></article>`).join('');
  $('rates').innerHTML = data.rates.map(rate => {
    const value = rate.rate == null || !Number.isFinite(rate.rate) ? null : rate.rate;
    const percent = value == null ? '—' : `${number.format(Math.round(value * 1000) / 10)}%`;
    return `<article class="rate"><p class="rate-label">${escape(labels[rate.from] || rate.from)} → ${escape(labels[rate.to] || rate.to)}</p>`
      + `<strong>${percent}</strong><small>${format(rate.numerator)} / ${format(rate.denominator)} ${escape(rate.unit || 'installations')}</small>`
      + (rate.from === 'SAVE' && rate.to === 'RETURN' ? '<p class="rate-cohort">ฐาน: บันทึกไว้ถึงวันสิ้นสุด รวมก่อนช่วงที่เลือก · กลับมาในช่วงนี้</p>' : '')
      + `<div class="rate-meter" aria-hidden="true"><i style="width:${value == null ? 0 : Math.min(100, Math.max(0, value * 100))}%"></i></div></article>`;
  }).join('') || '<p class="empty-row">ยังไม่มี journey สำหรับคำนวณสัดส่วน</p>';
  $('transitions').innerHTML = data.transitions.map(row => `<tr><td>${escape(values[row.from] || labels[row.from] || row.from)} → ${escape(values[row.to] || labels[row.to] || row.to)}</td><td>${format(row.installations)}</td><td>${format(row.journeys)}</td><td>${format(row.events)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="empty-row">ยังไม่มีข้อมูลการเชื่อมต่อ</td></tr>';
  $('breakdowns').innerHTML = Object.entries(dimensionLabels).map(([key, title]) => {
    const rows = data.breakdowns[key] || [];
    return `<article class="breakdown"><h3>${title}</h3><div class="table-scroll" tabindex="0" role="region" aria-label="${title}"><table><thead><tr><th scope="col">กลุ่ม</th><th scope="col">Installations</th><th scope="col">Events</th></tr></thead><tbody>`
      + (rows.map(row => { const value = row.value ?? row.key ?? row.label ?? 'unknown'; return `<tr><td>${escape(values[value] || value || 'ไม่ระบุ')}</td><td>${format(row.installations)}</td><td>${format(row.events)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="empty-row">ยังไม่มีข้อมูล</td></tr>')
      + '</tbody></table></div></article>';
  }).join('');
  $('event-rows').innerHTML = Object.keys(EVENTS).map(name => {
    const row = metric(data, name);
    return `<tr><td>${name}<small>${EVENTS[name].label}</small></td><td>${format(row.installations)}</td><td>${format(row.journeys)}</td><td>${format(row.events)}</td></tr>`;
  }).join('');
  $('updated').textContent = `อ่านข้อมูล ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} · V${data.analyticsVersion}`;
  $('dashboard').hidden = false;
  if (data.status === 'no-data') {
    showState('no-data', 'NO DATA · ยังไม่มีข้อมูล', 'ต่อสายสำเร็จ แต่ไม่พบเหตุการณ์ในช่วงเวลาและตัวกรองนี้');
  } else $('state').hidden = true;
}

function validResponse(data) {
  return data?.ok === true && ['ready', 'no-data'].includes(data.status)
    && data.analyticsVersion === ANALYTICS_VERSION && ENVIRONMENTS.includes(data.env)
    && data.metrics && typeof data.metrics === 'object' && !Array.isArray(data.metrics)
    && data.timings && typeof data.timings === 'object' && data.breakdowns && typeof data.breakdowns === 'object'
    && Array.isArray(data.rates) && Array.isArray(data.transitions)
    && Object.keys(dimensionLabels).every(key => Array.isArray(data.breakdowns[key]));
}

async function load() {
  const sequence = ++requestSequence;
  controller?.abort();
  const requestController = new AbortController();
  controller = requestController;
  $('dashboard').hidden = true;
  const env = $('env').value;
  $('environment').textContent = env.toUpperCase();
  $('environment').dataset.env = env;
  if ($('from').value > $('to').value) {
    showState('failed', 'CHECK DATES · ตรวจสอบวันที่', 'วันที่เริ่มต้องไม่อยู่หลังวันที่สิ้นสุด');
    $('filter-panel').open = true;
    return;
  }
  const filterCount = optionalFilters.filter(key => $(key).value).length;
  $('filter-summary').textContent = `${$('from').value} — ${$('to').value} · ${env}${filterCount ? ` · ${filterCount} ตัวกรอง` : ''}`;
  if (['myclover.com', 'www.myclover.com'].includes(location.hostname)) {
    showState('unwired', 'PIPELINE UNWIRED · เปิด Stat ผ่านช่องทางที่ป้องกันไว้', 'โฮสต์นี้ยังไม่มี API สำหรับ Front Door Stat กรุณาเปิด dashboard ที่ teem.pages.dev', false, true);
    return;
  }
  showState('loading', 'LOADING · กำลังอ่านข้อมูล', 'กำลังอ่านเหตุการณ์ตามช่วงเวลาและตัวกรองที่เลือก…');
  const params = new URLSearchParams({ env, from: $('from').value, to: $('to').value });
  for (const key of optionalFilters) if ($(key).value) params.set(key, $(key).value);
  const timeout = setTimeout(() => requestController.abort(), 15000);
  try {
    const response = await fetch(`/api/core7/frontdoor-stats?${params}`, { credentials: 'same-origin', cache: 'no-store', signal: requestController.signal, headers: { Accept: 'application/json' } });
    if (sequence !== requestSequence) return;
    if (response.status === 401 || response.status === 403) {
      showState('failed', 'REQUEST FAILED · ต้องมีสิทธิ์เข้าถึง', 'เซิร์ฟเวอร์ปฏิเสธการเข้าถึงข้อมูล กรุณาเข้าสู่ Stat ผ่านช่องทางที่ป้องกันไว้', true, true);
      return;
    }
    if (response.status === 404 || response.status === 503 || (response.ok && !response.headers.get('content-type')?.includes('application/json'))) {
      showState('unwired', 'PIPELINE UNWIRED · ยังไม่ต่อสาย', 'ยังไม่พบ API หรือฐานข้อมูล Front Door V2 ที่พร้อมใช้งานบนโฮสต์นี้', true);
      return;
    }
    if (response.status === 400) {
      showState('failed', 'REQUEST FAILED · ตรวจสอบตัวกรอง', 'เซิร์ฟเวอร์ไม่รับตัวกรองนี้ กรุณาเลือกช่วงเวลาไม่เกิน 93 วัน และตรวจสอบตัวกรองอีกครั้ง', true);
      $('filter-panel').open = true;
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (sequence !== requestSequence) return;
    if (!validResponse(data) || data.env !== env) throw new Error('INVALID_RESPONSE');
    render(data);
  } catch (error) {
    if (sequence !== requestSequence) return;
    showState('failed', 'REQUEST FAILED · อ่านข้อมูลไม่สำเร็จ', error.name === 'AbortError' ? 'รอนานเกินไป กรุณาลองอีกครั้ง' : 'การเชื่อมต่อหรือรูปแบบข้อมูลมีปัญหา ตัวเลขเก่าถูกซ่อนไว้เพื่อป้องกันความเข้าใจผิด', true);
  } finally { clearTimeout(timeout); }
}

options('env', ENVIRONMENTS, false);
for (const [key, entries] of Object.entries({ source: SOURCES, visitorClass: VISITOR_CLASSES, viewport: VIEWPORTS, intentPrimary: INTENTS, doorId: DOORS })) options(key, entries);
$('env').value = environmentForHost(location.hostname);
// Backend calendar ranges use Asia/Bangkok (UTC+7, without daylight saving).
const today = new Date(Date.now() + 7 * 3600000);
$('to').value = today.toISOString().slice(0, 10);
$('from').value = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
$('filters').addEventListener('submit', event => { event.preventDefault(); if ($('filters').reportValidity()) load(); });
$('retry').addEventListener('click', load);
// Hide results as soon as filters change; they no longer describe the selection.
$('filters').addEventListener('change', () => { ++requestSequence; controller?.abort(); $('dashboard').hidden = true; showState('loading', 'FILTERS CHANGED · ตัวกรองเปลี่ยนแล้ว', 'กด “ดูข้อมูล” เพื่ออ่านผลตามตัวกรองใหม่'); });
load();
