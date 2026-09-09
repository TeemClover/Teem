import {
  EVENTS, PRIMARY_EVENTS, ENVIRONMENTS, SOURCES,
  VISITOR_CLASSES, VIEWPORTS, INTENTS, DOORS, environmentForHost,
} from '/assets/front-door/contract.js';
import { akoProgress, responseFailure, validResponse } from './data.js';
import { RECIPE_LINKS } from '/ako/kitchen/catalog.js';

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
  ako: 'Ako · สุขภาพ', xircle: 'Xircle', meet: 'Meet · นัดคุย', forge: 'FORGE · การ์ตูน',
  classroom: 'Classroom · เรียนต่อ', home: 'บ้าน myClover', hall: 'Hall',
  red: 'แดง · RED', green: 'เขียว · GREEN',
  blue: 'น้ำเงิน · BLUE', silver: 'เงิน · SILVER',
};
const optionalFilters = ['source', 'visitorClass', 'viewport', 'intentPrimary', 'doorId'];
const recipeNames = Object.fromEntries(RECIPE_LINKS.map(recipe => [recipe.path, recipe.name]));
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
  $('pipeline-status').textContent = state === 'loading' ? 'กำลังอ่านข้อมูล' : state === 'no-data' ? 'API + D1 เชื่อมต่อแล้ว' : 'ยังไม่พร้อมแสดงข้อมูล';
  $('pipeline-status').dataset.ready = String(state === 'no-data');
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

function percent(numerator, denominator) {
  return denominator ? `${number.format(Math.round(numerator / denominator * 1000) / 10)}%` : '—';
}

function renderOutcomes(outcomes) {
  const rows = outcomes?.rows;
  const paths = outcomes?.paths;
  $('outcome-cards').innerHTML = Array.isArray(rows) ? rows.map(row => `<article class="outcome-card" data-door="${escape(row.door)}">`
    + `<h3>${escape(values[row.door] || row.door)}</h3><dl><div><dt>ออกเดินทาง</dt><dd>${format(row.opened)}</dd></div>`
    + `<div><dt>ถึงปลายทางจริง</dt><dd>${format(row.arrived)}</dd></div><div><dt>ส่งคำขอนัดสำเร็จ</dt><dd>${format(row.requested)}</dd></div></dl>`
    + `<p class="outcome-rate">เปิดทาง → ถึง <strong>${percent(row.arrived, row.opened)}</strong><span>เปิดทาง → ขอคุย <strong>${percent(row.requested, row.opened)}</strong></span></p></article>`).join('')
    || '<p class="empty-row">NO DATA · ยังไม่มีการเปิดทางที่เชื่อมกับปลายทางในช่วงนี้</p>'
    : '<p class="empty-row">PIPELINE UNWIRED · API รุ่นนี้ยังไม่ส่งข้อมูลผลลัพธ์ปลายทาง</p>';
  $('outcome-rows').innerHTML = Array.isArray(rows) ? rows.map(row => `<tr><td>${escape(values[row.door] || row.door)}<small>${escape(row.door)}</small></td><td>${format(row.opened)}</td><td>${format(row.arrived)}</td><td>${format(row.requested)}</td><td>${percent(row.requested, row.opened)}</td></tr>`).join('')
    || '<tr><td colspan="5" class="empty-row">ยังไม่มีผลลัพธ์ที่เชื่อมกับการเปิดทาง</td></tr>'
    : '<tr><td colspan="5" class="empty-row">PIPELINE UNWIRED · ยังไม่มีข้อมูลผลลัพธ์จาก API รุ่นนี้</td></tr>';
  const stops = akoProgress(outcomes);
  $('ako-path').innerHTML = stops ? stops.map(stop => `<li data-outcome-path="${escape(stop.path)}"><strong>${format(stop.installations)}</strong><h3>${stop.title}</h3><p>${stop.note}</p><small>${format(stop.journeys)} journeys · ${format(stop.events)} receipts</small></li>`).join('')
    : '<li class="empty-row">PIPELINE UNWIRED · API รุ่นนี้ยังไม่ส่งรายละเอียดแต่ละหน้า</li>';
  $('ako-recipes').innerHTML = Array.isArray(paths) ? paths.filter(row => row.door === 'ako' && /^\/ako\/kitchen\/[^/]+\/$/.test(row.path)).map(row => `<tr><td>${escape(recipeNames[row.path] || row.path.replace('/ako/kitchen/', '').replace(/\/$/, '').replaceAll('-', ' '))}<small>${escape(row.path)}</small></td><td>${format(row.installations)}</td><td>${format(row.journeys)}</td><td>${format(row.events)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="empty-row">NO DATA · ยังไม่มีการเปิดหน้าเมนูที่เชื่อมจาก Front Door ในช่วงนี้</td></tr>'
    : '<tr><td colspan="4" class="empty-row">PIPELINE UNWIRED · ยังไม่มีข้อมูลหน้าเมนู</td></tr>';
  $('outcome-paths').innerHTML = Array.isArray(paths) ? paths.map(row => `<tr><td>${escape(values[row.door] || row.door)}</td><td>${escape(row.path)}</td><td>${format(row.installations)}</td><td>${format(row.journeys)}</td><td>${format(row.events)}</td></tr>`).join('')
    || '<tr><td colspan="5" class="empty-row">ยังไม่มีใบรับการโหลดปลายทางในช่วงนี้</td></tr>'
    : '<tr><td colspan="5" class="empty-row">PIPELINE UNWIRED · API รุ่นนี้ยังไม่ส่งรายละเอียดแต่ละหน้า</td></tr>';
}

function render(data) {
  renderOutcomes(data.outcomes);
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
  $('breakdowns').innerHTML = Object.entries({...dimensionLabels,seedColor:'RGBS · รอยที่เลือก'}).map(([key, title]) => {
    const rows = data.breakdowns[key] || [];
    return `<article class="breakdown"><h3>${title}</h3><div class="table-scroll" tabindex="0" role="region" aria-label="${title}"><table><thead><tr><th scope="col">กลุ่ม</th><th scope="col">Installations</th><th scope="col">Events</th></tr></thead><tbody>`
      + (rows.map(row => { const value = row.value ?? row.key ?? row.label ?? 'unknown'; return `<tr><td>${escape(values[value] || value || 'ไม่ระบุ')}</td><td>${format(row.installations)}</td><td>${format(row.events)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="empty-row">ยังไม่มีข้อมูล</td></tr>')
      + '</tbody></table></div></article>';
  }).join('');
  $('event-rows').innerHTML = Object.keys(EVENTS).map(name => {
    const row = metric(data, name);
    return `<tr><td>${name}<small>${EVENTS[name].label}</small></td><td>${format(row.installations)}</td><td>${format(row.journeys)}</td><td>${format(row.events)}</td></tr>`;
  }).join('');
  $('updated').textContent = `อัปเดต ${new Date(data.generatedAt || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })} น. · V${data.analyticsVersion}`;
  $('pipeline-status').textContent = 'API + D1 เชื่อมต่อแล้ว';
  $('pipeline-status').dataset.ready = 'true';
  $('dashboard').hidden = false;
  if (data.status === 'no-data') {
    showState('no-data', 'NO DATA · ยังไม่มีข้อมูล', 'ต่อสายสำเร็จ แต่ไม่พบเหตุการณ์ในช่วงเวลาและตัวกรองนี้');
  } else $('state').hidden = true;
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
    const isJSON = response.headers.get('content-type')?.includes('application/json') === true;
    const data = isJSON ? await response.json() : null;
    if (sequence !== requestSequence) return;
    const failure = responseFailure(response.status, data, isJSON);
    if (failure) {
      showState(failure.state, failure.title, failure.message, true, failure.protectedLink);
      if (failure.filters) $('filter-panel').open = true;
      return;
    }
    if (!validResponse(data, env)) throw new Error('INVALID_RESPONSE');
    render(data);
  } catch (error) {
    if (sequence !== requestSequence) return;
    showState('failed', 'REQUEST FAILED · อ่านข้อมูลไม่สำเร็จ', error.name === 'AbortError' ? 'รอนานเกินไป กรุณาลองอีกครั้ง' : 'การเชื่อมต่อหรือรูปแบบข้อมูลมีปัญหา ตัวเลขเก่าถูกซ่อนไว้เพื่อป้องกันความเข้าใจผิด', true);
  } finally { clearTimeout(timeout); }
}

options('env', ENVIRONMENTS, false);
for (const [key, entries] of Object.entries({ source: SOURCES, visitorClass: VISITOR_CLASSES, viewport: VIEWPORTS, intentPrimary: INTENTS, doorId: DOORS })) options(key, entries);
$('env').value = environmentForHost(location.hostname);
// The collector enforces this boundary as well. Do not offer impossible reads locally.
if ($('env').value !== 'prod') for (const option of $('env').options) {
  if (option.value !== $('env').value) { option.disabled = true; option.textContent += ' · เปิดผ่านโฮสต์นั้น'; }
}
// Backend calendar ranges use Asia/Bangkok (UTC+7, without daylight saving).
const today = new Date(Date.now() + 7 * 3600000);
$('to').value = today.toISOString().slice(0, 10);
$('from').value = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
$('filters').addEventListener('submit', event => { event.preventDefault(); if ($('filters').reportValidity()) load(); });
$('retry').addEventListener('click', load);
document.querySelectorAll('[data-range-days]').forEach(button => button.addEventListener('click', () => {
  const today = new Date(Date.now() + 7 * 3600000);
  $('to').value = today.toISOString().slice(0, 10);
  $('from').value = new Date(today.getTime() - (Number(button.dataset.rangeDays) - 1) * 86400000).toISOString().slice(0, 10);
  load();
}));
// Hide results as soon as filters change; they no longer describe the selection.
$('filters').addEventListener('change', () => { ++requestSequence; controller?.abort(); $('dashboard').hidden = true; showState('loading', 'FILTERS CHANGED · ตัวกรองเปลี่ยนแล้ว', 'กด “ดูข้อมูล” เพื่ออ่านผลตามตัวกรองใหม่'); });
load();
