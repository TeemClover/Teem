import { dispatchForDebug } from './game.js?v=8';
import {
  CUSTOMER_STATES,
  EVENTS,
  PEOPLE_RENDER_LIMIT,
  SAVE_KEY,
  calculateEconomy,
  parseSavedState,
} from './game-data-v8.js';
import {
  SKILL_DEFINITIONS,
  SKILL_IDS,
  getSkillBenefit,
  getSkillSnapshot,
  getXleadProgress,
} from './game-progression-v8.js';

const PROFILE_KEY = 'mc_xvisor_certified';
const $ = (selector, root = document) => root.querySelector(selector);
const dialog = $('#gameDialog');
const dialogContent = $('#dialogContent');
let peopleTab = 'priority';
let peopleQuery = '';
let peoplePage = 0;
let cloudSyncAttempted = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
function fmt(value) { return Math.round(Number(value || 0)).toLocaleString('th-TH'); }
function baht(value) { return `฿${fmt(value)}`; }

function stateNow() {
  try { return parseSavedState(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function profileCertified() {
  try { return localStorage.getItem(PROFILE_KEY) === '1'; } catch { return false; }
}

function closeV8Dialog() {
  if (dialog?.open) dialog.close();
  if (dialogContent) dialogContent.innerHTML = '';
  if (dialog) delete dialog.dataset.peopleTab;
  document.body.style.removeProperty('overflow');
  requestAnimationFrame(() => $('#peopleButton')?.focus?.());
}

function showV8Dialog(html, kind = 'wide') {
  if (!dialog || !dialogContent) return;
  dialogContent.innerHTML = html;
  dialog.dataset.kind = kind;
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector('button, input')?.focus?.());
}

async function syncCertifiedToCloud() {
  if (cloudSyncAttempted || !profileCertified()) return;
  cloudSyncAttempted = true;
  try {
    const response = await fetch('/api/progress', { credentials: 'same-origin' });
    if (!response.ok) return;
    const payload = await response.json();
    const progress = { ...(payload.progress || {}), [PROFILE_KEY]: '1' };
    await fetch('/api/progress', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });
  } catch { /* guest/local play remains supported */ }
}

async function hydrateCertifiedFromCloud() {
  if (profileCertified()) return;
  try {
    const response = await fetch('/api/progress', { credentials: 'same-origin' });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload.progress?.[PROFILE_KEY] === '1') localStorage.setItem(PROFILE_KEY, '1');
  } catch { /* guest */ }
}

function persistCertification() {
  const state = stateNow();
  if (!state?.milestones?.certified) return;
  try { localStorage.setItem(PROFILE_KEY, '1'); } catch { /* ignore */ }
  syncCertifiedToCloud();
}

function originLabel(person) {
  const origin = person.origin || {};
  if (origin.sourceName) return origin.sourceName;
  const source = origin.sourceType || person.source;
  return ({ known: 'คนที่คุณรู้จัก', referral: 'Referral', content: 'Content', ads: 'Ads', event: 'Event', team: 'ทีมพามา' })[source] || 'Journey ในเกม';
}

function peopleRows(state) {
  const rows = [
    ...(state.prospects || []).map((person) => ({ person, kind: 'prospect' })),
    ...(state.customers || []).map((person) => ({ person, kind: 'customer' })),
    ...(state.team || []).map((person) => ({ person, kind: 'team' })),
  ];
  const priority = { prospect: 1, customer: 2, team: 3 };
  const unique = new Map();
  for (const row of rows) {
    const key = row.person.personId || row.person.id;
    if (!unique.has(key) || priority[row.kind] > priority[unique.get(key).kind]) unique.set(key, row);
  }
  return [...unique.values()];
}

function categoryFor(row) {
  const { person, kind } = row;
  if (kind === 'team') {
    if (person.rank === 'xlead' || Number(person.leaderReadiness || 0) >= 65) return 'grow';
    if (Number(person.autonomy || 0) < 55) return 'priority';
    return 'stable';
  }
  if (kind === 'customer') {
    const sat = Number(person.satisfaction || 0);
    if (sat < 55 || person.customerState === CUSTOMER_STATES.NEEDS_HELP) return 'priority';
    if (person.xvisorInterest || person.xvisorStage || person.referralReady) return 'opportunity';
    if (sat >= 75 || person.selfDirected) return 'stable';
    return 'priority';
  }
  if (['recommendation', 'waiting', 'discovery', 'baseline'].includes(person.journey)) return 'opportunity';
  return person.journey === 'new' || person.journey === 'scheduled' ? 'grow' : 'stable';
}

function actionFor(row, state) {
  const { person, kind } = row;
  if (kind === 'team') {
    if (person.active && Number(person.autonomy || 0) < 85) return [`🌱 Review Case กับ ${person.name}`, EVENTS.MENTOR_TEAM_MEMBER, 1];
    return null;
  }
  if (kind === 'prospect') {
    const map = {
      new: [`💬 ทัก ${person.name}`, EVENTS.CONTACT_PROSPECT, 1],
      scheduled: [`🤝 พบ ${person.name}`, EVENTS.MEET_PROSPECT, 2],
      conversation: [`💬 คุยกับ ${person.name}`, EVENTS.CONSULT_PROSPECT, 1],
      discovery: [`⚖️ ดู Baseline กับ ${person.name}`, EVENTS.BASELINE_PROSPECT, 2],
      baseline: [`🧩 วาง Routine ให้ ${person.name}`, EVENTS.OPEN_MANAGEMENT_ROUTINE, 0],
      recommendation: [`💰 คุยแผนกับ ${person.name}`, EVENTS.OFFER_PROSPECT, 1],
    };
    if (person.journey === 'waiting' && Number(person.nextOfferMonth || 0) <= Number(state.month || 0) && Number(person.decisionAttempts || 0) < 2) {
      return [`🔥 คุยให้รู้ผลกับ ${person.name}`, EVENTS.FOLLOW_UP_DECISION, 1];
    }
    return map[person.journey] || null;
  }
  if (person.xvisorStage === 'ready') return [`🎓 ชวน ${person.name} เข้า Xcademy`, EVENTS.START_CANDIDATE_XCADEMY, 1];
  if (person.xvisorStage === 'xcademy') return [`🌱 Review Case กับ ${person.name}`, EVENTS.REVIEW_CANDIDATE, 1];
  if (person.xvisorStage === 'case') return [`🏅 Certification · ${person.name}`, EVENTS.CERTIFY_CANDIDATE, 1];
  if (person.xvisorInterest && !person.xvisorStage) return [`✨ ${person.name} พร้อมรู้จัก X-VISOR`, EVENTS.INVITE_XVISOR, 1];
  if (person.referralReady && !person.referralAsked) return [`👥 ขอ Referral จาก ${person.name}`, EVENTS.ASK_REFERRAL, 1];
  if (person.selfDirected || [CUSTOMER_STATES.SELF_DIRECTED, CUSTOMER_STATES.AUTO_REORDER].includes(person.customerState)) return null;
  if (person.customerState === CUSTOMER_STATES.READY_TO_BUY) return [`📦 ต่อ RoutineX เดือนใหม่ · ${person.name}`, EVENTS.REORDER_CUSTOMER, 1];
  if (Number(person.satisfaction || 0) < 55 || Number(person.day || 0) < 28) return [`❤️ ดูแล ${person.name}`, EVENTS.CARE_CUSTOMER, 1];
  if (!person.measuredAgain) return [`📊 วัดซ้ำกับ ${person.name}`, EVENTS.REMEASURE_CUSTOMER, 2];
  return null;
}

function rowCard(row, state) {
  const { person, kind } = row;
  const action = actionFor(row, state);
  const disabled = action && Number(action[2] || 0) > Number(state.energy || 0);
  const actionHtml = action ? `<button class="work-button" type="button" data-work-event="${escapeHtml(action[1])}" data-id="${escapeHtml(person.id)}"${disabled ? ' disabled' : ''}><strong>${escapeHtml(action[0])}</strong><span>${escapeHtml(person.status || '')}</span>${action[2] ? `<b>⚡ ${action[2]}</b>` : ''}</button>` : '';
  if (kind === 'team') {
    return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(person.rank === 'xlead' ? 'XLEAD' : 'Certified X-VISOR')} · ${escapeHtml(person.specialtyLabel || '⚖️ สมดุล')}</span></div><b>${person.active ? 'กำลังทำงาน' : 'พักอยู่'}</b></div><dl><div><dt>Personal XV</dt><dd>${fmt(person.personalXV)}</dd></div><div><dt>ลูกค้า</dt><dd>${fmt(person.customers)}</dd></div><div><dt>ทีมย่อย</dt><dd>${fmt(person.downstreamXvisors)}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml(originLabel(person))}</dd></div></dl>${actionHtml}</article>`;
  }
  if (kind === 'customer') {
    return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>ลูกค้า · ❤️ ${fmt(person.satisfaction)}%</span></div><b>${escapeHtml(person.status || '')}</b></div><dl><div><dt>ความพอใจ</dt><dd>${fmt(person.satisfaction)}%</dd></div><div><dt>Routine</dt><dd>${person.selfDirected ? 'เดินเองได้' : 'กำลังดูแล'}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml(originLabel(person))}</dd></div></dl>${actionHtml || '<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>'}</article>`;
  }
  return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(person.journey || 'Prospect')}</span></div><b>${escapeHtml(person.status || '')}</b></div><dl><div><dt>เปิดใจ</dt><dd>${fmt(person.readiness)}%</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml(originLabel(person))}</dd></div></dl>${actionHtml}</article>`;
}

function renderPeople() {
  const state = stateNow();
  if (!state) return;
  if (state.organizationMode) return renderOrganization();
  const rows = peopleRows(state);
  const query = peopleQuery.trim().toLocaleLowerCase('th');
  const filtered = rows.filter((row) => {
    if (query && !String(row.person.name || '').toLocaleLowerCase('th').includes(query)) return false;
    return peopleTab === 'all' || categoryFor(row) === peopleTab;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PEOPLE_RENDER_LIMIT));
  peoplePage = Math.max(0, Math.min(peoplePage, pages - 1));
  const visible = filtered.slice(peoplePage * PEOPLE_RENDER_LIMIT, (peoplePage + 1) * PEOPLE_RENDER_LIMIT);
  const aggregate = state.organization?.aggregate;
  showV8Dialog(`<div class="dialog-kicker">👥 คนของคุณ · ${fmt(rows.length)}${aggregate?.overflowPeople ? ` + ${fmt(aggregate.overflowPeople)} ใน Organization` : ''}</div><h2>ดูเฉพาะคนที่มีเหตุผลให้ดูตอนนี้</h2><p class="dialog-note">หน้าจอนี้ render สูงสุด ${PEOPLE_RENDER_LIMIT} คนต่อครั้ง ไม่ว่าทีมจะใหญ่แค่ไหน</p>
    <div class="people-tabs" role="tablist">${[['priority','🔴 ต้องช่วย'],['opportunity','💰 โอกาสดี'],['grow','✨ มีแววโต'],['stable','✅ เดินเองได้'],['all','ทั้งหมด']].map(([id,label]) => `<button type="button" data-v8-people-tab="${id}" aria-selected="${peopleTab === id}">${label}</button>`).join('')}</div>
    <label class="people-search">ค้นหาชื่อ <input type="search" data-v8-people-search value="${escapeHtml(peopleQuery)}" placeholder="เช่น เมย์"></label>
    <div class="people-grid">${visible.map((row) => rowCard(row, state)).join('') || '<p class="work-empty">ไม่มีคนในกลุ่มนี้</p>'}</div>
    <div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v8-page="prev" ${peoplePage <= 0 ? 'disabled' : ''}>← ก่อนหน้า</button><span>${peoplePage + 1} / ${pages}</span><button class="dialog-button dialog-button--secondary" type="button" data-v8-page="next" ${peoplePage >= pages - 1 ? 'disabled' : ''}>ถัดไป →</button><button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button></div>`, 'wide');
}

function renderOrganization() {
  const state = stateNow();
  if (!state) return;
  const economy = calculateEconomy(state);
  const agg = state.organization?.aggregate || {};
  const leaders = (state.team || []).filter((member) => member.parentId === 'player' || member.rank === 'xlead').slice(0, 12);
  showV8Dialog(`<div class="dialog-kicker">🏙️ ORGANIZATION MODE · MONTH ${state.month}</div><h2>${fmt(economy.tgv)} XV · ${baht(economy.projectedIncome)}</h2><p class="dialog-note">หลัง Month 12 ระบบไม่สร้าง DOM/งานรายคนทั้งองค์กรอีกแล้ว เก็บรายชื่อเฉพาะ Direct G1 / XLEAD / คนสำคัญ</p>
    <div class="income-sections"><section><div class="income-heading"><span>❤️ Active Customers</span><b>${fmt(agg.activeCustomers)}</b></div></section><section><div class="income-heading"><span>🌱 X-VISOR</span><b>${fmt(agg.xvisorCount)}</b></div></section><section><div class="income-heading"><span>👑 XLEAD</span><b>${fmt(agg.xleadCount)}</b></div></section><section><div class="income-heading"><span>ทีมทำงานเอง</span><b>${fmt(state.monthStats?.teamActions)}</b></div><p>เป็น aggregate stat ไม่ใช่ task objects</p></section></div>
    <section class="work-section"><h3>ผู้นำที่ยังเก็บเป็นรายคน</h3><div class="people-grid">${leaders.map((member) => rowCard({ person: member, kind: 'team' }, state)).join('') || '<p>ยังไม่มีผู้นำที่ต้อง drill-down</p>'}</div></section>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button>`, 'wide');
}

function renderIncome() {
  const state = stateNow();
  if (!state) return;
  const economy = calculateEconomy(state);
  const top = economy.mentoringBreakdown.slice().sort((a, b) => b.mentorIncome - a.mentorIncome).slice(0, 5);
  const history = [...economy.incomeHistory].reverse().slice(0, 12);
  showV8Dialog(`<div class="dialog-kicker">REVENUE STACK · V8</div><h2>เดือนนี้ ${baht(economy.projectedIncome)} · รวม ${baht(economy.lifetimeIncome)}</h2>
    <div class="income-sections">
      <section><div class="income-heading"><span>① ขายและดูแลลูกค้า</span><b>${baht(economy.channel1)}</b></div><p>${fmt(economy.personalXV)} XV × ${escapeHtml(economy.tier.label)} · คำนวณจาก XV ไม่ใช่ยอดบาท</p></section>
      <section><div class="income-heading"><span>② พัฒนา Direct G1 ${economy.mentoringUnlocked ? '' : '· รอ Certified XLEAD'}</span><b>${economy.mentoringUnlocked ? baht(economy.channel2) : '🔒'}</b></div><p>20% ของ commission G1 แต่ละคน โดยคำนวณ commission จาก Personal XV ของคนนั้น</p>${economy.mentoringUnlocked ? `<ul class="income-breakdown">${top.map((item) => `<li><span>${escapeHtml(item.name)} · ${fmt(item.personalXV)} XV · คอม ${baht(item.commission)}</span><b>${baht(item.mentorIncome)}</b></li>`).join('') || '<li><span>G1 ยังไม่มียอดเดือนนี้</span><b>฿0</b></li>'}</ul>` : ''}</section>
      <section><div class="income-heading"><span>③ บริหาร Organization ${state.career?.xgenCertified ? '' : '· รอ Certified XGEN'}</span><b>${state.career?.xgenCertified ? baht(economy.channel3) : '🔒'}</b></div><p>5% ของ TGV หลังผ่าน XGEN Exam</p></section>
    </div>
    <section class="income-history"><h3>ย้อนหลัง</h3><div class="table-scroll"><table><thead><tr><th>เดือน</th><th>①</th><th>②</th><th>③</th><th>รวม</th></tr></thead><tbody>${history.map((item) => `<tr><th>${item.month}</th><td>${baht(item.channel1)}</td><td>${baht(item.channel2)}</td><td>${baht(item.channel3)}</td><td><b>${baht(item.total)}</b></td></tr>`).join('')}</tbody></table></div></section>
    <button class="dialog-button" type="button" data-dialog-action="close">กลับเกม</button>`, 'wide');
}

function renderSkills() {
  const state = stateNow();
  if (!state) return;
  const snapshot = getSkillSnapshot(state);
  const progress = getXleadProgress(state);
  const cards = SKILL_IDS.map((id) => {
    const skill = snapshot.skills[id];
    const max = skill.level >= 10;
    return `<article class="skill-card"><div><span>${skill.definition.icon}</span><h3>${skill.definition.name} ${max ? 'Lv.MAX' : `Lv.${skill.level}`}</h3></div><p>${escapeHtml(getSkillBenefit(id, skill.level))}</p>${max ? '<small>MAX · งานเดิมควรหายหรือถูกระบบรับไปเอง</small>' : `<button class="work-button" type="button" data-work-event="${EVENTS.TRAIN_SKILL}" data-skill="${id}"><strong>${escapeHtml(skill.definition.practice)}</strong><span>+2 XP</span><b>⚡ 1</b></button>`}</article>`;
  }).join('');
  showV8Dialog(`<div class="dialog-kicker">⭐ ${state.rank.toUpperCase()} · Lv.${snapshot.playerLevel}</div><h2>Skill ที่สูงขึ้นต้องลดงาน ไม่ใช่เพิ่มงาน</h2><div class="skill-grid">${cards}</div><section class="xlead-progress"><h3>เส้นทาง XLEAD</h3><ul>${progress.criteria.map((item) => `<li class="${item.current >= item.target ? 'is-done' : ''}"><span>${escapeHtml(item.label)}</span><b>${item.current} / ${item.target}</b></li>`).join('')}</ul>${state.career?.xleadQualified && !state.career?.xleadCertified ? `<button class="work-button" data-work-event="${EVENTS.XLEAD_EXAM}"><strong>🎓 เข้าสอบ XLEAD</strong><span>ผ่านแล้วจึงปลดล็อก ②</span></button>` : ''}</section><button class="dialog-button" type="button" data-dialog-action="close">กลับกระดาน</button>`, 'wide');
}

function installNgPlusButton() {
  const state = stateNow();
  if (!state || state.stage !== 'opening' || !profileCertified()) return;
  const bar = $('#actionBar');
  if (!bar || $('[data-v8-ngplus]', bar)) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'action-button action-button--primary';
  button.dataset.v8Ngplus = '1';
  button.innerHTML = '<span class="action-icon">⚡</span><strong>NEW GAME+ · เริ่ม Month 1 เลย</strong><small>เคยผ่าน Certification แล้ว · ข้าม PRE-SEASON</small>';
  bar.prepend(button);
}

function patchHud() {
  const state = stateNow();
  if (!state) return;
  if (state.organizationMode) {
    const energy = $('#hudEnergyButton');
    if (energy) energy.hidden = true;
    const people = $('#peopleButton');
    if (people) {
      people.hidden = false;
      const agg = state.organization?.aggregate || {};
      const wanted = `Organization ${fmt(agg.xvisorCount || state.team?.length || 0)}`;
      if (people.textContent.trim() !== wanted) people.innerHTML = `Organization <b>${fmt(agg.xvisorCount || state.team?.length || 0)}</b>`;
    }
    const monthButton = $('#monthButton');
    if (monthButton && monthButton.textContent !== 'ผ่านไปอีก 1 เดือน') monthButton.textContent = 'ผ่านไปอีก 1 เดือน';
  }
  const dialogState = stateNow();
  if (dialog?.open && dialogState) {
    for (const button of dialog.querySelectorAll(`[data-work-event="${EVENTS.TRAIN_SKILL}"][data-skill]`)) {
      const skill = button.dataset.skill;
      if (getSkillSnapshot(dialogState).skills?.[skill]?.level >= 10) button.remove();
    }
  }
}

document.addEventListener('click', (event) => {
  const close = event.target.closest('[data-dialog-action="close"]');
  if (close) {
    event.preventDefault(); event.stopImmediatePropagation(); closeV8Dialog(); return;
  }
  const ng = event.target.closest('[data-v8-ngplus]');
  if (ng) {
    event.preventDefault(); event.stopImmediatePropagation(); dispatchForDebug(EVENTS.NEW_GAME_PLUS); return;
  }
  const peopleTrigger = event.target.closest('#peopleButton, [data-ui="people"], [data-open-people], [data-dialog-action="people"]');
  if (peopleTrigger) {
    event.preventDefault(); event.stopImmediatePropagation(); peoplePage = 0; renderPeople(); return;
  }
  const skillTrigger = event.target.closest('#skillButton, [data-ui="skills"], [data-open-skills]');
  if (skillTrigger) {
    const state = stateNow();
    if (state?.rank !== 'candidate') {
      event.preventDefault(); event.stopImmediatePropagation(); renderSkills(); return;
    }
  }
  const incomeTrigger = event.target.closest('#incomeButton');
  if (incomeTrigger) {
    event.preventDefault(); event.stopImmediatePropagation(); renderIncome(); return;
  }
  const tab = event.target.closest('[data-v8-people-tab]');
  if (tab) {
    event.preventDefault(); event.stopImmediatePropagation(); peopleTab = tab.dataset.v8PeopleTab; peoplePage = 0; renderPeople(); return;
  }
  const page = event.target.closest('[data-v8-page]');
  if (page && !page.disabled) {
    event.preventDefault(); event.stopImmediatePropagation(); peoplePage += page.dataset.v8Page === 'next' ? 1 : -1; renderPeople(); return;
  }
}, true);

document.addEventListener('input', (event) => {
  const input = event.target.closest('[data-v8-people-search]');
  if (!input) return;
  event.stopImmediatePropagation();
  peopleQuery = input.value;
  peoplePage = 0;
  const position = input.selectionStart;
  renderPeople();
  requestAnimationFrame(() => {
    const next = $('[data-v8-people-search]');
    if (next) { next.focus(); next.setSelectionRange(position, position); }
  });
}, true);

dialog?.addEventListener('cancel', (event) => {
  event.preventDefault(); closeV8Dialog();
}, true);

const observer = new MutationObserver(() => {
  persistCertification();
  installNgPlusButton();
  patchHud();
});
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-stage'] });

await hydrateCertifiedFromCloud();
persistCertification();
installNgPlusButton();
patchHud();
