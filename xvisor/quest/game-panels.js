import { CUSTOMER_STATES, EVENTS, PEOPLE_RENDER_LIMIT, SAVE_KEY, V1_SCORE_VERSION, buildPersonAction, canDispatch, findPerson, getBestNextActions, getPersonContextAction, getCustomerRenewalView } from "./game-data.js";
import { getSkillSnapshot } from "./game-progression.js";
import { getEconomyView, getMonthlyHistory, getMonthComparison } from "./game-presentation.js";
import { isActionAvailable } from "./game-actions.js";

const growthNumber = value => value === null || value === undefined ? "ไม่เคยบันทึก" : Math.round(value).toLocaleString("th-TH");
const growthValue = (value, unit = "") => value === null || value === undefined ? "ไม่เคยบันทึก" : `${unit === "baht" ? "฿" : ""}${growthNumber(value)}${unit && unit !== "baht" ? ` ${unit}` : ""}`;
function growthChange(metric, compareMonth) {
  if (metric.scopeChanged) return "ขอบเขตเปลี่ยน · เทียบตรง ๆ ไม่ได้";
  if (metric.delta === null) return compareMonth < 1 ? "เดือนแรกของเส้นทาง" : "ไม่มีข้อมูลให้เทียบ";
  if (metric.delta === 0) return "เท่าเดิม";
  const change = `${metric.delta > 0 ? "↑ +" : "↓ −"}${growthValue(Math.abs(metric.delta), metric.unit)}`;
  return `${change}${metric.percent === null ? " · เริ่มจาก 0" : ` (${Math.abs(metric.percent).toLocaleString("th-TH", { maximumFractionDigits: 1 })}%)`}`;
}
function incomeContributionHtml(entry) {
  const channels = [["channel1", "① ลูกค้า"], ["channel2", "② Direct G1"], ["channel3", "③ Organization"]];
  return `<div class="income-contribution" aria-label="รายได้ 3 ช่องทางของเดือน ${entry.month}">${channels.map(([key, label]) => {
    const value = entry[key];
    const percent = value !== null && entry.total > 0 ? Math.max(0, Math.min(100, value / entry.total * 100)) : 0;
    return `<div class="income-contribution__channel" data-channel="${key}" style="--channel-share:${percent.toFixed(2)}%"><span>${label}</span><strong>${growthValue(value, "baht")}</strong><i aria-hidden="true"></i><small>${value === null ? "ไม่มีรายละเอียดในบันทึกนี้" : entry.total === null ? "ไม่มีบันทึกยอดรวมให้เทียบสัดส่วน" : entry.total > 0 ? `${percent.toLocaleString("th-TH", { maximumFractionDigits: 1 })}% ของรายได้เดือนนี้` : "เดือนนี้ยังไม่มีรายได้ช่องทางนี้"}</small></div>`;
  }).join("")}</div>`;
}

/** Shared by the close-month board and historical comparisons; never projects a closed month. */
export function monthGrowthHtml(state, month, compareMonth = Number(month) - 1, { historyLink = true } = {}) {
  const comparison = getMonthComparison(state, month, compareMonth);
  if (!comparison.current) return "";
  const entry = comparison.current;
  const metricCards = comparison.metrics.slice(0, 5).map(metric => `<div class="growth-metric" data-metric="${metric.key}" data-trend="${metric.trend}"><span>${metric.label}</span><strong>${growthValue(metric.value, metric.unit)}</strong>${!historyLink && comparison.previous ? `<span class="growth-baseline">เดือน ${comparison.previous.month}: ${growthValue(metric.baseline, metric.unit)}</span>` : ""}<small>${growthChange(metric, comparison.compareMonth)}</small></div>`).join("");
  return `<section class="growth-summary" aria-label="สรุปการเปลี่ยนแปลงเดือน ${entry.month}"><div class="growth-summary__heading"><div><span>MONTH ${entry.month} · ${entry.posted ? "ปิดยอดแล้ว" : "บันทึกเดิม"}</span><h3>${comparison.previous ? `เทียบเดือน ${comparison.previous.month}` : "สิ่งที่เกิดขึ้นในเดือนนี้"}</h3></div>${historyLink ? `<button class="dialog-button dialog-button--secondary" type="button" data-history-month="${entry.month}">ดูประวัติและเทียบเดือน</button>` : ""}</div><div class="growth-grid">${metricCards}</div>${incomeContributionHtml(entry)}<p class="growth-summary__note">${entry.customerScope === "organization" ? "ปี 2 นับลูกค้าและทีมทั้งองค์กร" : entry.teamScope === "legacy-team" ? "ปีแรกแสดงขนาดทีมตามบันทึกเดิม" : "ปีแรกนับลูกค้าของคุณและทีมโดยตรง"} · ลูกค้าใช้ต่อหมายถึงคนที่ซื้อรอบใหม่ในเดือนนั้น ${entry.reorders !== null && entry.repeatCustomers === null ? `· บันทึกเดิมมี ${growthNumber(entry.reorders)} รายการซื้อซ้ำ แต่ไม่ระบุจำนวนคน` : ""} · ผลลัพธ์มีทั้งเพิ่ม ลด และคงเดิมตามสิ่งที่เกิดขึ้นในแต่ละเดือน</p></section>`;
}

export function focusDialogStart(dialog) {
  requestAnimationFrame(() => {
    if (!dialog?.open) return;
    const start = dialog.querySelector("h2") || dialog.querySelector("input, button");
    if (start?.tagName === "H2") start.setAttribute("tabindex", "-1");
    start?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
  });
}

export function mountPanels({ getState, dispatch, requestSync }) {
var PROFILE_KEY = "mc_xvisor_certified";
var $2 = (selector, root = document) => root.querySelector(selector);
var dialog = $2("#gameDialog");
var dialogContent = $2("#dialogContent");
var peopleTab = "priority";
var peopleQuery = "";
var peoplePage = 0;
var peopleFocusId = null;
var cloudSyncAttempted = false;
var PERSON_EVENTS = /* @__PURE__ */ new Set([
  EVENTS.CONTACT_PROSPECT,
  EVENTS.MEET_PROSPECT,
  EVENTS.CONSULT_PROSPECT,
  EVENTS.BASELINE_PROSPECT,
  EVENTS.OPEN_MANAGEMENT_ROUTINE,
  EVENTS.OFFER_PROSPECT,
  EVENTS.FOLLOW_UP_DECISION,
  EVENTS.CARE_CUSTOMER,
  EVENTS.REMEASURE_CUSTOMER,
  EVENTS.REORDER_CUSTOMER,
  EVENTS.ASK_REFERRAL,
  EVENTS.INVITE_XVISOR,
  EVENTS.START_CANDIDATE_XCADEMY,
  EVENTS.REVIEW_CANDIDATE,
  EVENTS.CERTIFY_CANDIDATE,
  EVENTS.MENTOR_TEAM_MEMBER
]);
function escapeHtml2(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function fmt(value) {
  return Math.round(Number(value || 0)).toLocaleString("th-TH");
}
function baht(value) {
  return `฿${fmt(value)}`;
}
function stateNow() { return getState(); }
function profileCertified() {
  try {
    return localStorage.getItem(PROFILE_KEY) === "1";
  } catch {
    return false;
  }
}
function hardClose() {
  if (dialog?.open) dialog.close();
  if (dialogContent) dialogContent.innerHTML = "";
  if (dialog) {
    delete dialog.dataset.peopleTab;
    delete dialog.dataset.v9Dialog;
  }
  peopleFocusId = null;
  document.body.style.removeProperty("overflow");
  requestAnimationFrame(() => $2("#actionBar button, #peopleButton, #monthButton")?.focus?.());
}
function showDialog2(html, kind = "wide", key = "v9") {
  if (!dialog || !dialogContent) return;
  dialogContent.innerHTML = html;
  dialog.dataset.kind = kind;
  dialog.dataset.v9Dialog = key;
  delete dialog.dataset.v1OrganizationKey;
  delete dialog.dataset.v1bCampaignGate;
  delete dialog.dataset.v1bFinale;
  document.body.style.overflow = "hidden";
  if (!dialog.open) dialog.showModal();
  requestSync();
  focusDialogStart(dialog);
}
function originLabel(person) {
  const origin = person.origin || {};
  if (origin.sourceName) return origin.sourceName;
  const source = origin.sourceType || person.source;
  return { known: "คนที่คุณรู้จัก", referral: "Referral", content: "Content", ads: "Ads", event: "Open House / Event", team: "ทีมพามา", tutorial: "Month 1" }[source] || "เส้นทางของเรา";
}
function peopleRows(state2) {
  const rows = [
    ...(state2.prospects || []).map((person) => ({ person, kind: "prospect" })),
    ...(state2.customers || []).map((person) => ({ person, kind: "customer" })),
    ...(state2.team || []).map((person) => ({ person, kind: "team" }))
  ];
  const priority = { prospect: 1, customer: 2, team: 3 };
  const unique = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = row.person.personId || row.person.id;
    if (!unique.has(key) || priority[row.kind] > priority[unique.get(key).kind]) unique.set(key, row);
  }
  return [...unique.values()];
}
function categoryFor(row, state2) {
  const { person, kind } = row;
  if (kind === "team") {
    if (person.rank === "xlead" || Number(person.leaderReadiness || 0) >= 65) return "grow";
    if (Number(person.autonomy || 0) < 55) return "priority";
    return "stable";
  }
  if (kind === "customer") {
    const renewal = getCustomerRenewalView(state2, person);
    if (renewal && ["pending", "paused"].includes(renewal.status) && !renewal.followedUp) return "priority";
    const sat = Number(person.satisfaction || 0);
    if (sat < 55 || person.customerState === CUSTOMER_STATES.NEEDS_HELP) return "priority";
    if (person.xvisorInterest || person.xvisorStage || person.referralReady) return "opportunity";
    if (sat >= 75 || person.selfDirected) return "stable";
    return "priority";
  }
  if (["recommendation", "waiting", "discovery", "baseline"].includes(person.journey)) return "opportunity";
  return ["new", "scheduled", "conversation"].includes(person.journey) ? "grow" : "stable";
}
function actionButton(action, person, compact = false) {
  if (!action) return "";
  const state2 = stateNow();
  const disabled = !canDispatch(state2, action.event) || !isActionAvailable(state2, { ...action, id: person.id });
  if (compact) return `<button class="dialog-button dialog-button--secondary" type="button" data-work-event="${escapeHtml2(action.event)}" data-id="${escapeHtml2(person.id)}" data-renewal-care title="${escapeHtml2(action.reason || "")}"${disabled ? " disabled" : ""}><strong>${escapeHtml2(action.label)}</strong>${action.cost ? ` · ⚡ ${action.cost}` : ""}</button>`;
  return `<button class="work-button" type="button" data-work-event="${escapeHtml2(action.event)}" data-id="${escapeHtml2(person.id)}"${disabled ? " disabled" : ""}><strong>${escapeHtml2(action.label)}</strong><span>${escapeHtml2(action.reason || person.status || "")}</span>${action.cost ? `<b>⚡ ${action.cost}</b>` : ""}</button>`;
}
function rowCard(row, state2) {
  const { person, kind } = row;
  const action = getPersonContextAction(state2, person, kind);
  const actionHtml = actionButton(action, person);
  if (kind === "team") {
    return `<article class="people-card people-card--team"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>${escapeHtml2(person.rank === "xlead" ? "XLEAD" : "Certified X-VISOR")} · ${escapeHtml2(person.specialtyLabel || "⚖️ สมดุล")}</span></div><b>${person.active ? "กำลังทำงาน" : "พักอยู่"}</b></div><dl><div><dt>Personal XV</dt><dd>${fmt(person.personalXV)}</dd></div><div><dt>ลูกค้า</dt><dd>${fmt(person.customers)}</dd></div><div><dt>ทีมย่อย</dt><dd>${fmt(person.downstreamXvisors)}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml || "<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>"}</article>`;
  }
  if (kind === "customer") {
    const renewal = getCustomerRenewalView(state2, person);
    const careHtml = renewal?.available ? actionButton(buildPersonAction({ event: EVENTS.CARE_CUSTOMER, target: person, state: state2 }), person, true) : "";
    return `<article class="people-card"${renewal ? ` data-renewal-status="${renewal.status}"` : ""}><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>ลูกค้า · ❤️ ${fmt(person.satisfaction)}%</span></div><b>${escapeHtml2(renewal?.label || person.status || "")}</b></div><dl><div><dt>ความพอใจ</dt><dd>${fmt(person.satisfaction)}%</dd></div><div><dt>Routine</dt><dd>${person.selfDirected ? "เดินเองได้" : "กำลังดูแล"}</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${renewal ? `<p data-renewal-note>${escapeHtml2(renewal.detail)}</p>` : ""}${actionHtml || (renewal ? "" : "<p><b>✅ เดินเองได้</b> · ไม่ต้องสร้างงานเพิ่ม</p>")}${careHtml}</article>`;
  }
  return `<article class="people-card"><div class="people-card__top"><div><h3>${escapeHtml2(person.name)}</h3><span>${escapeHtml2(person.journey || "Prospect")}</span></div><b>${escapeHtml2(person.status || "")}</b></div><dl><div><dt>เปิดใจ</dt><dd>${fmt(person.readiness)}%</dd></div><div><dt>ที่มา</dt><dd>${escapeHtml2(originLabel(person))}</dd></div></dl>${actionHtml}</article>`;
}
function renderPeople(focusId = peopleFocusId) {
  const state2 = stateNow();
  if (!state2) return;
  if (state2.organizationMode) return renderOrganization();
  peopleFocusId = focusId || null;
  const rows = peopleRows(state2);
  const query = peopleQuery.trim().toLocaleLowerCase("th");
  const filtered = rows.filter((row) => {
    if (peopleFocusId && row.person.id !== peopleFocusId && row.person.personId !== peopleFocusId) return false;
    if (query && !String(row.person.name || "").toLocaleLowerCase("th").includes(query)) return false;
    if (peopleFocusId || peopleTab === "all") return true;
    if (peopleTab === "renewal") return row.kind === "customer" && ["pending", "paused"].includes(getCustomerRenewalView(state2, row.person)?.status);
    return categoryFor(row, state2) === peopleTab;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PEOPLE_RENDER_LIMIT));
  peoplePage = Math.max(0, Math.min(peoplePage, pages - 1));
  const visible = filtered.slice(peoplePage * PEOPLE_RENDER_LIMIT, (peoplePage + 1) * PEOPLE_RENDER_LIMIT);
  const aggregate = state2.organization?.aggregate;
  showDialog2(`<div class="dialog-kicker">👥 คนของคุณ · ${fmt(rows.length)}${aggregate?.overflowPeople ? ` + ${fmt(aggregate.overflowPeople)} ใน Organization` : ""}</div><h2>${peopleFocusId ? "รายละเอียดและ Next Action" : "ดูเฉพาะคนที่มีเหตุผลให้ดูตอนนี้"}</h2><p class="dialog-note">เลือกกลุ่มหรือค้นหาชื่อ เพื่อดูสิ่งที่แต่ละคนต้องการตอนนี้</p>
    ${peopleFocusId ? `<button class="people-back" type="button" data-v9-clear-focus>← กลับไปรายชื่อ</button>` : `<div class="people-tabs" role="tablist">${[["priority", "🔴 ต้องช่วย"], ["renewal", "📁 ซื้อซ้ำ / พัก"], ["opportunity", "💰 โอกาสดี"], ["grow", "✨ มีแววโต"], ["stable", "✅ เดินเองได้"], ["all", "ทั้งหมด"]].map(([id, label]) => `<button type="button" data-v9-people-tab="${id}" aria-selected="${peopleTab === id}">${label}</button>`).join("")}</div><label class="people-search">ค้นหาชื่อ <input type="search" data-v9-people-search value="${escapeHtml2(peopleQuery)}" placeholder="เช่น เมย์"></label>`}
    <div class="people-grid">${visible.map((row) => rowCard(row, state2)).join("") || '<p class="work-empty">ไม่มีคนในกลุ่มนี้</p>'}</div>
    <div class="dialog-actions">${peopleFocusId ? "" : `<button class="dialog-button dialog-button--secondary" type="button" data-v9-page="prev" ${peoplePage <= 0 ? "disabled" : ""}>← ก่อนหน้า</button><span>${peoplePage + 1} / ${pages}</span><button class="dialog-button dialog-button--secondary" type="button" data-v9-page="next" ${peoplePage >= pages - 1 ? "disabled" : ""}>ถัดไป →</button>`}<button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button></div>`, "wide", "people");
}
function renderOrganization() {
  const current = stateNow();
  if (current) showDialog2(organizationDialogHtml(current), "wide", "organization");
}

var incomeMonth = null;
var incomeCompareMonth = null;
function renderIncome(selectedMonth = null, compareMonth = null, { live = false } = {}) {
  const current = stateNow();
  if (!current) return;
  const history = getMonthlyHistory(current);
  const entry = history.find(item => item.month === Number(selectedMonth)) || history.at(-1);
  incomeMonth = entry?.month ?? null;
  incomeCompareMonth = compareMonth === null ? (incomeMonth || 1) - 1 : Number(compareMonth);
  const economy = getEconomyView(current);
  const liveMonth = live && !current.settlements?.[String(current.month)] && !current.organizationMode;
  const shown = liveMonth ? { month: current.month, total: economy.projectedIncome, channel1: economy.channel1, channel2: economy.channel2, channel3: economy.channel3 } : entry;
  const comparison = entry && !liveMonth ? getMonthComparison(current, entry.month, incomeCompareMonth) : null;
  const received = history.every(item => item.total !== null) ? history.reduce((sum, item) => sum + item.total, 0) : null;
  const options = history.map(item => `<option value="${item.month}"${item.month === incomeMonth ? " selected" : ""}>เดือน ${item.month} · ปี ${item.year}</option>`).join("");
  const compareOptions = history.map(item => `<option value="${item.month}"${item.month === incomeCompareMonth ? " selected" : ""}>เดือน ${item.month}</option>`).join("");
  const missingComparison = !history.some(item => item.month === incomeCompareMonth);
  const controls = entry ? `<div class="history-controls"><label>ดูเดือน<select data-history-select="month" aria-label="ดูประวัติเดือน">${options}</select></label><label>เทียบกับ<select data-history-select="compare" aria-label="เลือกเดือนเปรียบเทียบ">${missingComparison ? `<option value="${incomeCompareMonth}" selected>${incomeCompareMonth < 1 ? "ยังไม่มีเดือนก่อน" : `เดือน ${incomeCompareMonth} ไม่มีบันทึก`}</option>` : ""}${compareOptions}</select></label></div>` : "";
  const channels = [
    { key: "channel1", number: "①", title: "ขายและดูแลลูกค้า", rule: "20–25% × XV ส่วนตัว", detail: "ฐานรายได้จากการดูแลลูกค้า · อัตราขึ้นกับยอดขายในเดือนนั้น" },
    { key: "channel2", number: "②", title: "พัฒนา Direct G1", rule: "20% ของค่าคอมมิชชัน Direct G1", detail: "เพิ่มรายได้จากทีม เมื่อปลดสิทธิ์ XLEAD/ดูแลทีม และทีมสร้างผลงาน" },
    { key: "channel3", number: "③", title: "บริหาร Organization", rule: "5% × TGV ของเดือนนั้น", detail: "เพิ่มช่องทาง Organization หลังสอบผ่าน XGEN ตามเกณฑ์เกม" },
  ];
  const channelCards = shown ? `<section class="income-comparison" aria-label="รายได้ครบ 3 ช่องทาง"><div class="income-comparison__heading"><h3>รายได้ 3 ช่องทาง · เดือน ${shown.month}</h3><span>${liveMonth ? "ประมาณการ ยังไม่ปิดยอด" : "ยอดที่บันทึกจริง"}</span></div><div class="growth-grid">${channels.map(channel => {
    const value = shown[channel.key];
    const metric = comparison?.metrics.find(item => item.key === channel.key);
    return `<article class="growth-metric income-channel-card" data-channel-summary="${channel.key}" data-trend="${metric?.trend || "unknown"}"><span class="income-channel-card__number">ช่องทาง ${channel.number}</span><h4>${channel.title}</h4><strong>${growthValue(value, "baht")}</strong><span class="income-channel-card__rule">${channel.rule}</span>${metric ? `<div class="income-channel-card__comparison"><span class="growth-baseline">${incomeCompareMonth < 1 ? "ยังไม่มีเดือนเปรียบเทียบ" : `เดือน ${incomeCompareMonth}: ${growthValue(metric.baseline, "baht")}`}</span><small>${growthChange(metric, incomeCompareMonth)}</small></div>` : ""}<p>${channel.detail}</p></article>`;
  }).join("")}</div></section>` : "";
  const extraIncome = shown && shown.channel2 !== null && shown.channel3 !== null ? shown.channel2 + shown.channel3 : null;
  const firstTeam = history.find(item => item.channel2 > 0);
  const firstOrganization = history.find(item => item.channel3 > 0);
  const insight = shown ? `<div class="income-role-insight"><span>${liveMonth ? "ประมาณการ" : "รายได้"}จากทีมและ Organization · เดือน ${shown.month} <b>② + ③</b></span><strong>${growthValue(extraIncome, "baht")}</strong><p>เป็นรายได้ที่เพิ่มจากช่องทางดูแลลูกค้า ① · ผลต่างระหว่างเดือนขึ้นกับทั้งสิทธิ์ ยอดขาย และผลงานทีม</p></div>` : "";
  const highestIncome = Math.max(1, ...history.map(item => item.total ?? 0));
  const timeline = Array.from({ length: 24 }, (_, index) => {
    const month = index + 1;
    const item = history.find(row => row.month === month);
    const label = item ? `เดือน ${month}: ${growthValue(item.total, "baht")}` : month <= current.month ? `เดือน ${month}: ไม่มีบันทึกปิดเดือน` : `เดือน ${month}: ยังไม่ถึง`;
    return `<button class="history-month" type="button" data-history-month="${month}"${item ? "" : " disabled"} aria-label="${label}" aria-pressed="${month === incomeMonth && !liveMonth}" style="--income-height:${item?.total === null || !item ? 0 : Math.max(3, item.total / highestIncome * 100).toFixed(2)}%"><i aria-hidden="true"></i><span>${month}</span></button>`;
  }).join("");
  const historyCards = history.map(item => {
    const earningChannels = channels.filter(channel => item[channel.key] > 0).map(channel => channel.number).join(" ");
    return `<details class="income-history-card" data-month="${item.month}"${item.month === incomeMonth && !liveMonth ? ' data-selected="true"' : ""}><summary class="income-history-row"><span class="income-history-row__month">เดือน ${item.month} · ปี ${item.year}<small>${earningChannels ? `มีรายได้ ${earningChannels}` : "ยังไม่มีช่องทางที่บันทึกรายได้"}</small></span>${channels.map(channel => `<span class="income-history-row__channel" data-history-channel="${channel.key}"><small>${channel.number}</small><b>${growthValue(item[channel.key], "baht")}</b></span>`).join("")}<strong class="income-history-row__total"><small>รวม</small><b>${growthValue(item.total, "baht")}</b></strong></summary><div class="income-history-card__detail"><p>TGV ${growthValue(item.tgv, "XV")} · ลูกค้าใช้ต่อ ${growthValue(item.repeatCustomers, "คน")} · X-VISOR ${growthValue(item.teamCount, "คน")}</p>${incomeContributionHtml(item)}<button class="dialog-button dialog-button--secondary" type="button" data-history-month="${item.month}">เทียบผลเดือน ${item.month}</button></div></details>`;
  }).join("");
  const closeLabel = current.campaignScore?.locked && !current.organizationMode ? "กลับสรุปปีแรก" : "กลับเกม";
  showDialog2(`<nav class="history-dialog-nav" aria-label="เมนูประวัติรายได้"><span>เส้นทางการเติบโต</span><button class="history-close" type="button" data-v9-close>${closeLabel} ×</button></nav><div class="dialog-kicker">MONTHLY JOURNEY · 2.0</div><h2>${liveMonth ? `ประมาณการเดือน ${current.month}` : entry ? `รายได้และพัฒนาการ · เดือน ${entry.month}` : "ประวัติการเดินทาง 24 เดือน"}</h2>
    <div class="revenue-hero"><div><span>${liveMonth ? "ยังไม่ปิดยอด" : "รายได้เดือนที่เลือก"}</span><strong>${growthValue(shown?.total ?? null, "baht")}</strong></div><div><span>สะสมจาก ${history.length} เดือนที่มีบันทึก</span><strong>${growthValue(received, "baht")}</strong></div></div>
    ${!liveMonth ? controls : ""}${channelCards}${insight}
    ${liveMonth ? '<p class="dialog-note">ประมาณการเปลี่ยนตามงานที่ทำ ปิดเดือนแล้วจึงบันทึกผลจริงไว้ในประวัติด้านล่าง</p>' : ""}
    <section class="income-history"><h3>เทียบรายได้รายเดือน · ${history.length} เดือน</h3><p class="dialog-note">เห็นทั้ง ① ② ③ ก่อนขยาย · แตะแถวเพื่อดู TGV ลูกค้า และทีม</p>
      ${firstTeam || firstOrganization ? `<p class="income-channel-milestones">${firstTeam ? `บันทึกแรกที่มีรายได้ ②: เดือน ${firstTeam.month}` : ""}${firstTeam && firstOrganization ? " · " : ""}${firstOrganization ? `บันทึกแรกที่มีรายได้ ③: เดือน ${firstOrganization.month}` : ""}</p>` : ""}
      ${liveMonth ? controls : ""}
      <div class="income-history-columns" aria-hidden="true"><span>เดือน / ช่องทางที่มีรายได้</span><span>① ลูกค้า</span><span>② Direct G1</span><span>③ Organization</span><span>รวม</span></div><div class="income-history-cards">${historyCards || '<p class="work-empty">ปิดเดือนแรกเพื่อเริ่มบันทึกรายได้และการเติบโต</p>'}</div>
      <details class="income-trend"><summary>ดูกราฟเส้นทางเดือน 1–24</summary><p class="dialog-note">แตะเดือนที่ปิดแล้วเพื่อเทียบผล · ความสูงแสดงรายได้</p><div class="history-timeline" aria-label="ประวัติรายได้ 24 เดือน">${timeline}</div></details>
      ${entry ? `<details class="income-growth-more"><summary>ดูการเติบโตของลูกค้าและทีม · เดือน ${entry.month}</summary>${monthGrowthHtml(current, entry.month, incomeCompareMonth, { historyLink: false })}</details>` : ""}
    </section><p class="dialog-note">ตัวเลขมาจากบันทึกแต่ละเดือนและไม่รับประกันรายได้จริง ข้อมูลเก่าที่ไม่เคยเก็บจะแสดง “ไม่เคยบันทึก”</p>`, "wide", "income");
}

function renderTgvHelp() {
  const state2 = stateNow();
  if (!state2) return;
  const history = getMonthlyHistory(state2);
  const last = history.find(entry => entry.month === Number(state2.month) - 1);
  const best = history.reduce((max, entry) => Math.max(max, Number(entry.tgv || 0)), 0);
  showDialog2(`<div class="dialog-kicker">🏙️ TGV</div><h2>ยอด XV ของคุณและทีมในเดือนนี้</h2><p class="term-definition">TGV เริ่มใหม่ทุกเดือน เดือนที่ปิดไปแล้วจะเก็บไว้เป็นสถิติและจะไม่ถูกนำมาจ่ายซ้ำ</p><div class="summary-grid"><div><span>เดือนนี้</span><strong>${fmt(getEconomyView(state2).tgv)} XV</strong></div><div><span>เดือนที่แล้ว</span><strong>${growthValue(last?.tgv, "XV")}</strong></div><div><span>Best TGV</span><strong>${fmt(best)} XV</strong></div>${state2.career?.xgenQualified ? `<div><span>ถึงเกณฑ์ XGEN</span><strong>เดือน ${fmt(state2.career.xgenQualifiedAtMonth)}</strong></div>` : ""}</div><div class="dialog-actions"><button class="dialog-button dialog-button--secondary" type="button" data-open-income-history>ดูประวัติรายเดือน</button><button class="dialog-button" type="button" data-v9-close>เข้าใจแล้ว</button></div>`, "wide", "tgv");
}
function renderMonthConfirm() {
  const state2 = stateNow();
  if (!state2 || !canDispatch(state2, EVENTS.END_MONTH)) return;
  if (state2.organizationMode) {
    hardClose();
    dispatch(EVENTS.END_MONTH);
    return;
  }
  const economy = getEconomyView(state2);
  const opportunities = getBestNextActions(state2, 3).filter(action => action.event !== EVENTS.END_MONTH && !action.disabled && canDispatch(state2, action.event));
  const remaining = state2.stage === "management" && (Number(state2.energy || 0) > 0 || opportunities.length > 0);
  showDialog2(`<div class="dialog-kicker">ทบทวนเดือน ${state2.month}</div><h2>${remaining ? `ยังเหลือพลังงาน ${fmt(state2.energy)} ⚡` : `พร้อมสรุปเดือน ${state2.month} แล้ว`}</h2><div class="summary-grid"><div><span>🏙️ TGV เดือนนี้</span><strong>${fmt(economy.tgv)} XV</strong></div><div><span>💰 คาดว่าจะได้รับ</span><strong>${baht(economy.projectedIncome)}</strong></div></div>
    <p class="month-review-note">${remaining ? "ยังเลือกทำงานต่อได้ เมื่อจบเดือน พลังงานที่เหลือจะไม่ทบไปเดือนหน้า" : "มาดูผลงานเดือนนี้ แล้วเตรียมพลังงานสำหรับเดือนถัดไป"}</p>
    ${opportunities.length ? `<section class="month-review-opportunities"><h3>โอกาสที่ยังทำได้เดือนนี้</h3><ul>${opportunities.map(action => `<li>${escapeHtml2(action.label)}${action.cost ? ` <span>⚡ ${fmt(action.cost)}</span>` : ""}</li>`).join("")}</ul></section>` : ""}
    <div class="dialog-actions"><button class="dialog-button${remaining ? "" : " dialog-button--secondary"}" type="button" data-v9-close>${remaining ? "กลับไปเลือกงานต่อ" : "กลับกระดาน"}</button>${remaining ? '<button class="dialog-button dialog-button--secondary" type="button" data-dialog-action="work">ดูทางเลือกทั้งหมด</button>' : ""}<button class="dialog-button${remaining ? " dialog-button--secondary" : ""}" type="button" data-v9-end-month>ยืนยันจบเดือน ${fmt(state2.month)}</button></div>`, "wide", "month");
}
function patchPersonActions(state2) {
  const missions = state2?.missions || [];
  for (const button of document.querySelectorAll("#actionBar button[data-event], #gameDialog [data-work-event]")) {
    const event = button.dataset.event || button.dataset.workEvent;
    if (!PERSON_EVENTS.has(event)) continue;
    let id = button.dataset.id;
    const visibleLabel = button.querySelector("strong")?.textContent?.trim() || "";
    if (!id) {
      const mission = missions.find((item) => item.event === event && (!visibleLabel || item.label === visibleLabel || visibleLabel.includes(item.targetName || "")));
      id = mission?.targetId || "";
      if (id) button.dataset.id = id;
    }
    const target = findPerson(state2, id);
    const action = buildPersonAction({ event, target, state: state2 });
    if (!action) {
      button.disabled = true;
      button.hidden = true;
      continue;
    }
    const strong = button.querySelector("strong");
    if (strong && strong.textContent !== action.label) strong.textContent = action.label;
  }
}
function patchMonthSummaryCopy() {
  const root = $2("#sceneDetails");
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = node.nodeValue.replace(/\s*\/\s*3,000,000/g, "").replace(/\s*\/\s*3000000/g, "");
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}
function patchMaxSkillButtons(state2) {
  if (!state2) return;
  const snapshot = getSkillSnapshot(state2);
  for (const button of document.querySelectorAll(`#gameDialog [data-work-event="${EVENTS.TRAIN_SKILL}"][data-skill]`)) {
    if (snapshot.skills?.[button.dataset.skill]?.level >= 10) button.remove();
  }
}
function patchHud() {
  const state2 = stateNow();
  if (!state2) return;
  const economy = getEconomyView(state2);
  const organizationVisible = state2.organizationMode || state2.milestones?.firstG1 || Number(state2.team?.length || 0) > 0;
  const volumeLabel = $2("#hudVolumeLabel");
  const volume = $2("#hudXV");
  if (organizationVisible) {
    if (volumeLabel) volumeLabel.innerHTML = '🏙️ TGV เดือนนี้ <b aria-hidden="true">?</b>';
    if (volume) volume.textContent = `${fmt(economy.tgv)} XV`;
  }
  if (state2.organizationMode) {
    const energy = $2("#hudEnergyButton");
    if (energy) energy.hidden = true;
    const monthButton = $2("#monthButton");
    if (monthButton) {
      monthButton.hidden = false;
      monthButton.textContent = "ผ่านไปอีก 1 เดือน";
    }
    const people = $2("#peopleButton");
    if (people) {
      people.hidden = false;
      const count = state2.organization?.aggregate?.xvisorCount || state2.team?.length || 0;
      people.innerHTML = `Organization <b id="peopleCount">${fmt(count)}</b>`;
    }
  }
  patchPersonActions(state2);
  patchMonthSummaryCopy();
  patchMaxSkillButtons(state2);

}
async function syncCertifiedToCloud() {
  if (cloudSyncAttempted || !profileCertified()) return;
  cloudSyncAttempted = true;
  try {
    const response = await fetch("/api/progress", { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = await response.json();
    const progress = { ...payload.progress || {}, [PROFILE_KEY]: "1" };
    await fetch("/api/progress", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) });
  } catch {
  }
}
function persistCertification() {
  const state2 = stateNow();
  if (!state2?.milestones?.certified) return;
  try {
    localStorage.setItem(PROFILE_KEY, "1");
  } catch {
  }
  syncCertifiedToCloud();
}
document.addEventListener("click", (event) => {
  const close = event.target.closest("[data-v9-close]");
  if (close) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const fromHistory = dialog?.dataset.v9Dialog === "income";
    if (fromHistory && stateNow()?.runComplete) dismissedRun = stateNow().runId;
    hardClose();
    if (fromHistory && stateNow()?.campaignScore?.locked && !stateNow()?.organizationMode) openCampaignGate(stateNow());
    return;
  }
  const finale = event.target.closest('[data-ui="v9-finale"]');
  if (finale) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampaignGate(stateNow());
    return;
  }
  const peopleTrigger = event.target.closest('#peopleButton, [data-open-people], [data-dialog-action="people"]');
  if (peopleTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage = 0;
    peopleFocusId = null;
    renderPeople();
    return;
  }
  const personTrigger = event.target.closest("#sceneDetails [data-person-id]");
  if (personTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage = 0;
    renderPeople(personTrigger.dataset.personId);
    return;
  }
  const historyTrigger = event.target.closest("#historyButton, [data-open-income-history], [data-history-month]");
  if (historyTrigger && !historyTrigger.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderIncome(historyTrigger.dataset.historyMonth || null);
    return;
  }
  const incomeTrigger = event.target.closest("#incomeButton");
  if (incomeTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderIncome(null, null, { live: true });
    return;
  }
  const tgvTrigger = event.target.closest("#hudXVButton");
  if (tgvTrigger) {
    const state2 = stateNow();
    if (state2 && (state2.organizationMode || state2.milestones?.firstG1 || state2.team?.length)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderTgvHelp();
      return;
    }
  }
  const monthTrigger = event.target.closest("#monthButton");
  if (monthTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderMonthConfirm();
    return;
  }
  const orgPass = event.target.closest('#actionBar button[data-event="END_MONTH"]');
  if (orgPass && stateNow()?.organizationMode) {
    event.preventDefault();
    event.stopImmediatePropagation();
    dispatch(EVENTS.END_MONTH);
    return;
  }
  const work = event.target.closest("#gameDialog [data-work-event]");
  if (work && !work.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = {};
    if (work.dataset.id) payload.id = work.dataset.id;
    if (work.dataset.source) payload.source = work.dataset.source;
    if (work.dataset.skill) payload.skill = work.dataset.skill;
    const gameEvent = work.dataset.workEvent;
    hardClose();
    dispatch(gameEvent, payload);
    return;
  }
  const endMonth = event.target.closest("[data-v9-end-month]");
  if (endMonth) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose();
    dispatch(EVENTS.END_MONTH);
    return;
  }
  const tab = event.target.closest("[data-v9-people-tab]");
  if (tab) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peopleTab = tab.dataset.v9PeopleTab;
    peoplePage = 0;
    peopleFocusId = null;
    renderPeople();
    return;
  }
  const clearFocus = event.target.closest("[data-v9-clear-focus]");
  if (clearFocus) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peopleFocusId = null;
    peoplePage = 0;
    renderPeople();
    return;
  }
  const page = event.target.closest("[data-v9-page]");
  if (page && !page.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    peoplePage += page.dataset.v9Page === "next" ? 1 : -1;
    renderPeople();
    return;
  }
  const submit = event.target.closest("[data-v9-submit-score]");
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  const enter = event.target.closest("[data-v9-enter-org]");
  if (enter) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const current = stateNow();
    if (!scoreName(current)) return openCampaignGate(current);
    hardClose();
    dispatch(EVENTS.ENTER_ORGANIZATION);
    return;
  }
  const newRun = event.target.closest("[data-v9-new-run]");
  if (newRun) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
    }
    location.reload();
  }
}, true);
document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-v9-people-search]");
  if (!input) return;
  event.stopImmediatePropagation();
  peopleQuery = input.value;
  peoplePage = 0;
  const position = input.selectionStart;
  renderPeople();
  requestAnimationFrame(() => {
    const next = $2("[data-v9-people-search]");
    if (next) {
      next.focus();
      next.setSelectionRange(position, position);
    }
  });
}, true);
document.addEventListener("change", (event) => {
  const select = event.target.closest("[data-history-select]");
  if (!select) return;
  event.stopImmediatePropagation();
  const key = select.dataset.historySelect;
  const scrollTop = dialog.scrollTop;
  const expandedDetails = [".income-trend", ".income-growth-more"].filter(selector => $2(selector)?.open);
  if (key === "month") renderIncome(Number(select.value), incomeCompareMonth);
  else renderIncome(incomeMonth, Number(select.value));
  for (const selector of expandedDetails) if ($2(selector)) $2(selector).open = true;
  requestAnimationFrame(() => {
    dialog.scrollTop = scrollTop;
    $2(`[data-history-select="${key}"]`)?.focus({ preventScroll: true });
  });
}, true);
dialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  const current = getState();
  if (current.campaignScore?.locked && !current.organizationMode) {
    if (dialog.dataset.v9Dialog === "income") openCampaignGate(current);
    return;
  }
  if (current.runComplete) dismissedRun = current.runId;
  hardClose();
}, true);
var month24DismissedRun = null;
function signed(value) {
  const number = Math.round(Number(value || 0));
  return `${number > 0 ? "+" : ""}${fmt(number)}`;
}
function setText(node, value) {
  if (node && node.textContent !== String(value)) node.textContent = String(value);
}
function setHtml(node, value) {
  if (node && node.innerHTML !== value) node.innerHTML = value;
}
function setHidden(node, hidden) {
  if (node && node.hidden !== Boolean(hidden)) node.hidden = Boolean(hidden);
}
function organizationReportHtml(report) {
  if (!report) return "<p>กด <b>ผ่านไปอีก 1 เดือน</b> แล้วระบบจะรันงานประจำองค์กรให้ครบในครั้งเดียว</p>";
  const xircle = report.activities?.xircle ? '<span class="is-xircle">🏕️ The Xircle ×1</span>' : "";
  const xircleBonus = report.xircleBonus ? `<section class="v1-xircle-bonus"><div><span>THE XIRCLE</span><strong>RESET · RECONNECT · RISE</strong></div><ul><li>❤️ Retention ${escapeHtml2(report.xircleBonus.retention)}</li><li>👥 Referral ${escapeHtml2(report.xircleBonus.referral)}</li><li>🔄 Member comeback ${signed(report.xircleBonus.comeback)}</li><li>🎓 ${escapeHtml2(report.xircleBonus.certification)}</li></ul></section>` : "";
  const trip = report.trip ? `<section class="v1-travel-reward"><span>✈️ RECOGNITION TRIP ${fmt(report.trip.number)}</span><strong>${escapeHtml2(report.trip.destination)}</strong><small>${escapeHtml2(report.trip.landmark)}</small></section>` : "";
  return `<div class="v1-org-report">
    ${monthGrowthHtml(stateNow(), report.month)}
    <section class="v1-auto-plan"><div><span>เดือนนี้ทีมเดินให้คุณ</span><strong>กิจกรรม → คน → ลูกค้า → XV → TGV → รายได้</strong></div><div class="v1-org-rhythm"><span>🎓 Xcademy ×4</span><span>🏠 Open House ×1</span>${xircle}</div></section>
    <details class="organization-detail"><summary>ดูการเคลื่อนไหวของลูกค้าและทีม</summary>
    <section class="v1-flow-section"><h3>ลูกค้า</h3><div class="v1-flow-grid v1-flow-grid--customers"><div><span>คนใหม่</span><b>${fmt(report.newPeople)}</b></div><div><span>ลูกค้าใหม่</span><b>+${fmt(report.newCustomers)}</b></div><div><span>ใช้ต่อ</span><b>${fmt(report.repeatCustomers)}</b></div><div class="is-warning"><span>พัก</span><b>−${fmt(report.pausedCustomers)}</b></div><div class="is-loss"><span>หยุด</span><b>−${fmt(report.stoppedCustomers)}</b></div><div class="is-comeback"><span>กลับมา</span><b>+${fmt(report.comebackCustomers)}</b></div><div class="is-net"><span>สุทธิ</span><b>${signed(report.netCustomers)}</b></div></div></section>
    <section class="v1-flow-section"><h3>ทีมสร้างทีม</h3><div class="v1-flow-grid v1-flow-grid--team"><div><span>X-VISOR ใหม่</span><b>+${fmt(report.newXvisors)}</b></div><div class="is-warning"><span>ช้าลง</span><b>${fmt(report.slowedMembers)}</b></div><div class="is-warning"><span>พักงาน</span><b>−${fmt(report.pausedMembers)}</b></div><div class="is-loss"><span>หยุดทำ</span><b>−${fmt(report.quitMembers)}</b></div><div class="is-comeback"><span>กลับมา active</span><b>+${fmt(report.comebackMembers)}</b></div><div class="is-net"><span>ทีมสุทธิ</span><b>${signed(report.netXvisors)}</b></div><div><span>XLEAD ใหม่</span><b>+${fmt(report.newXleads)}</b></div></div></section>
    </details>${xircleBonus}${trip}

  </div>`;
}
function roleLabel(member) {
  if (member.rank === "xlead") return "👑 XLEAD";
  return member.specialtyLabel || { sales: "💰 ขายเก่ง", care: "❤️ ดูแลเก่ง", builder: "🌱 สร้างทีมเก่ง", balanced: "⚖️ สมดุล" }[member.specialty] || "⚖️ สมดุล";
}
function memberStatusLabel(member) {
  return { active: "🟢 Active", slow: "🟡 Slow", paused: "💤 Paused", inactive: "⚪ Inactive" }[member.organizationStatus] || (member.active === false ? "💤 Paused" : "🟢 Active");
}
function organizationDialogHtml(state2) {
  if (state2.runComplete) return finaleHtml2(state2);
  const report = state2.lastOrganizationReport;
  const agg = state2.organization?.aggregate || {};
  const leaders = (state2.team || []).filter((member) => member.active !== false).sort((a, b) => Number(b.personalXV || 0) - Number(a.personalXV || 0)).slice(0, 8);
  return `<div class="dialog-kicker">🏙️ ORGANIZATION YEAR · MONTH ${state2.month}</div>
    <h2>ระบบที่สร้างไว้กำลังเดินต่อ</h2>
    ${organizationReportHtml(report)}
    <div class="v1-org-grid v1-org-grid--totals">
      <div><span>❤️ Active Customers</span><strong>${fmt(agg.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR ทั้งองค์กร</span><strong>${fmt(agg.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(agg.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(agg.organizationSize ?? agg.xvisorCount)}</strong></div>
    </div>
    <section class="work-section"><h3>คนที่กำลังสร้างผลลัพธ์</h3><div class="income-breakdown">${leaders.map((member) => `<div class="v1-leader"><span><b>${escapeHtml2(member.name)}</b><small>${escapeHtml2(roleLabel(member))} · ${escapeHtml2(memberStatusLabel(member))}</small></span><b>${fmt(member.personalXV)} XV</b></div>`).join("") || "<p>ยังไม่มีทีม</p>"}</div></section>
    <button class="dialog-button" type="button" data-v9-close>กลับกระดาน</button>`;
}
function patchOrganizationDialog(state2) {
  const dialog2 = $2("#gameDialog");
  const content2 = $2("#dialogContent");
  if (!dialog2?.open || !content2 || dialog2.dataset.v9Dialog !== "organization") return;
  const key = `${state2.month}:${state2.lastOrganizationReport?.month || 0}:${state2.runComplete ? 1 : 0}`;
  if (dialog2.dataset.v1OrganizationKey === key) return;
  dialog2.dataset.v1OrganizationKey = key;
  setHtml(content2, organizationDialogHtml(state2));
}
function finaleDetails(state2) {
  const summary = state2.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  return `<div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt(summary.activeCustomers)} ลูกค้า · ${fmt(summary.xvisorCount)} X-VISOR · ${fmt(summary.xleadCount)} XLEAD</strong></div></div>
  <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
    <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
    <div><span>🏆 Best TGV</span><strong>${fmt(summary.bestTGV)} XV</strong></div>
    <div><span>💎 Best Month Income</span><strong>${baht(summary.bestMonthIncome)}</strong></div>
    <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht(summary.total24Income ?? summary.totalIncome)}</strong></div>
    <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
    <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
    <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
    <div><span>🏙️ Organization Size</span><strong>${fmt(summary.organizationSize)}</strong></div>
  </div><div class="v1-trip-stamps" aria-label="ทริปที่ได้รับ">${trips.map((trip) => `<span>✈️ ${escapeHtml2(trip.destination)}<small>M${fmt(trip.month)}</small></span>`).join("") || '<span class="is-empty">ทริปคือรางวัลจากผลงานที่ถึงเงื่อนไข</span>'}</div><blockquote class="v1-ending-quote">คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง</blockquote>`;
}
function patchOrganizationBoard(state2) {
  if (!state2.organizationMode) return;
  const report = state2.lastOrganizationReport;
  const agg = state2.organization?.aggregate || {};
  setHidden($2("#monthButton"), true);
  setHidden($2("#hudEnergyButton"), true);
  const teamChip = $2("#teamChip");
  setHidden(teamChip, false);
  setText(teamChip, `ทีม ${fmt(agg.xvisorCount)} X-VISOR · ${fmt(agg.xleadCount)} XLEAD`);
  setText($2("#hudCustomers"), `${fmt(agg.activeCustomers)} คน`);
  setText($2("#hudVolumeLabel"), report ? `🏙️ TGV ล่าสุด · M${report.month}` : "🏙️ TGV เดือนนี้");
  setText($2("#hudXV"), `${fmt(report?.tgv)} XV`);
  setText($2(".status-item--income span"), "รายได้ล่าสุด · สะสม");
  setText($2("#hudIncome"), `${baht(report?.income)} · Σ${baht(state2.economy?.totalIncome)}`);
  const people = $2("#peopleButton");
  if (people) {
    setHidden(people, false);
    setHtml(people, `Organization <b id="peopleCount">${fmt(agg.xvisorCount)}</b>`);
  }
  setText($2("#goalEyebrow"), state2.runComplete ? "จบเส้นทาง 24 เดือน" : "YEAR 2 · ORGANIZATION");
  setText($2("#goalTitle"), state2.runComplete ? "🏁 2 ปีผ่านไปแล้ว" : `Organization Year · เดือน ${state2.month}`);
  setText($2("#goalReason"), state2.runComplete ? "ดู Best TGV รายได้ 24 เดือน ขนาดองค์กร และทริปที่ทีมปลดล็อกได้ แล้วเลือกเส้นทางถัดไป" : "ปุ่มเดียวรัน Xcademy ×4, Open House ×1 และ The Xircle ตามรอบ · ลูกค้าและทีมมีทั้งโต พัก หยุด และกลับมา");
  setText($2("#dialogueSpeaker"), state2.runComplete ? "24-MONTH FINALE" : "ORGANIZATION REPORT");
  setText($2("#dialogueText"), state2.runComplete ? "ปีแรกคุณสร้างระบบ ปีที่สองระบบเผชิญทั้งแรงส่งและแรงเสียดทาน — และยังเดินมาถึงเส้นชัย" : report ? `เดือน ${report.month} · ลูกค้าสุทธิ ${signed(report.netCustomers)} · ทีมสุทธิ ${signed(report.netXvisors)} · รายได้ ${baht(report.income)}` : "จากนี้ Organization จะดูแลลูกค้า สร้าง Candidate และพัฒนาคนต่อโดยไม่รอคุณทำทุกเรื่อง");
  const details = $2("#sceneDetails");
  setHtml(details, state2.runComplete ? finaleDetails(state2) : organizationReportHtml(report));
  setText($2(".action-dock__heading span"), state2.runComplete ? "เล่นให้ดีกว่าเดิม" : "เดินระบบองค์กร");
  setText($2(".action-dock__heading small"), state2.runComplete ? "เริ่มรอบใหม่ทันที" : "หนึ่งปุ่ม · หนึ่งเดือน");
  const actionBar = $2("#actionBar");
  if (!actionBar) return;
  const mode = state2.runComplete ? "complete" : `month-${state2.month}`;
  if (actionBar.dataset.v1Mode === mode && actionBar.querySelector(state2.runComplete ? "[data-v1-open-finale]" : "[data-v1-org-pass]")) return;
  actionBar.dataset.v1Mode = mode;
  setHtml(actionBar, state2.runComplete ? '<button class="action-button action-button--primary" type="button" data-v1-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>Scoreboard · NEW GAME+ · เล่นใหม่</small></span></button>' : '<button class="action-button action-button--primary" type="button" data-v1-org-pass><span class="action-button__icon" aria-hidden="true">▶</span><span class="action-button__copy"><strong>▶ ผ่านไปอีก 1 เดือน</strong><small>Xcademy ×4 · Open House ×1 · The Xircle ตามรอบ · สรุปครั้งเดียว</small></span></button>');
}
function patchReleaseUi() {
  
  const state2 = stateNow();
  if (!state2) return;
  document.body.dataset.releaseMoment = state2.runComplete ? "month24" : state2.campaignScore?.locked && !state2.organizationMode ? "month12" : state2.runMode === "NEW_GAME_PLUS" && state2.month === 1 ? "new-game-plus" : "play";
  
  if (state2.organizationMode) {
    patchOrganizationBoard(state2);
    patchOrganizationDialog(state2);

  } else {
    
  }
}
document.addEventListener("click", (event) => {
  const submit = event.target.closest("[data-v1-submit-score]");
  if (submit) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  const pass = event.target.closest("[data-v1-org-pass]");
  if (pass) {
    event.preventDefault();
    event.stopImmediatePropagation();
    document.body.classList.add("is-month-passing");
    dispatch(EVENTS.END_MONTH);
    window.setTimeout(() => document.body.classList.remove("is-month-passing"), 720);
    return;
  }
  const openFinale2 = event.target.closest("[data-v1-open-finale]");
  if (openFinale2) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    if (state2?.runComplete) {
      month24DismissedRun = null;
      openFinale(state2);
    }
    return;
  }
  const closeFinale = event.target.closest("[data-v1-close-finale]");
  if (closeFinale) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    month24DismissedRun = state2?.runId || "dismissed";
    dismissedRun = month24DismissedRun;
    const dialog2 = $2("#gameDialog");
    if (dialog2?.open) dialog2.close();
    document.body.style.removeProperty("overflow");
    return;
  }
  const newRun = event.target.closest("[data-v1-new-run]");
  if (newRun) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
    }
    location.reload();
    return;
  }
  const ng = event.target.closest("[data-v1-new-game-plus]");
  if (ng) {
    event.preventDefault();
    event.stopImmediatePropagation();
    
    hardClose2();
    dismissedRun = null;
    dispatch(EVENTS.NEW_GAME_PLUS);
  }
}, true);
$2("#gameDialog")?.addEventListener("cancel", () => {
  const state2 = stateNow();
  if (state2?.runComplete) dismissedRun = month24DismissedRun = state2.runId || "dismissed";
}, true);
var SCORE_SENT_PREFIX3 = "mc_xvisor_1b_score_sent:";
const submittedScores = new Map();
const submittingRuns = new Set();
var dismissedRun = null;
function scoreName(state2) {
  if (submittedScores.has(state2?.runId)) return submittedScores.get(state2.runId);
  try {
    return localStorage.getItem(`${SCORE_SENT_PREFIX3}${state2?.runId || ""}`) || "";
  } catch {
    return "";
  }
}
function hardClose2() {
  const dialog2 = $2("#gameDialog");
  if (dialog2?.open) dialog2.close();
  if (dialog2) {
    delete dialog2.dataset.v1bCampaignGate;
    delete dialog2.dataset.v1bFinale;
  }
  document.body.style.removeProperty("overflow");
}
function show(html, kind, key) {
  const dialog2 = $2("#gameDialog");
  const content2 = $2("#dialogContent");
  if (!dialog2 || !content2) return;
  content2.innerHTML = html;
  dialog2.dataset.kind = kind;
  delete dialog2.dataset.v9Dialog;
  if (key === "campaign") {
    dialog2.dataset.v1bCampaignGate = "1";
    delete dialog2.dataset.v1bFinale;
  } else {
    dialog2.dataset.v1bFinale = key;
    delete dialog2.dataset.v1bCampaignGate;
  }
  document.body.style.overflow = "hidden";
  if (!dialog2.open) dialog2.showModal();
  focusDialogStart(dialog2);
}
function campaignScoreDetails(state2) {
  const score = state2.campaignScore || {};
  const path = state2.campaignOutcome?.xgenByMonth12 || score.xgenByMonth12 ? "XGEN" : "XLEAD";
  return `<div class="dialog-kicker">🏆 MONTH 12 · CAMPAIGN COMPLETE · 2.0</div>
    <h2>12 เดือนแรกจบแล้ว — บันทึกชื่อคุณก่อน</h2>
    <p class="dialog-note">High Score ใช้ผล Month 1–12 เท่านั้น ปีที่ 2 จะไม่แก้คะแนนก้อนนี้</p>
    <div class="v1-finale-grid" aria-label="High Score 12 เดือน">
      <div><span>🏆 Best TGV</span><strong>${fmt(score.bestTgv)} XV</strong></div>
      <div><span>💰 รายได้รวม 12 เดือน</span><strong>${baht(score.totalIncome)}</strong></div>
      <div><span>💎 สูงสุด / เดือน</span><strong>${baht(score.bestMonthlyIncome)}</strong></div>
      <div><span>🏙️ Organization</span><strong>${fmt(score.organizationSize)} คน</strong></div>
    </div>
    <button class="dialog-button dialog-button--secondary" type="button" data-open-income-history>ดูประวัติและเทียบเดือน 1–12</button>
    <blockquote class="v1-ending-quote">${path === "XGEN" ? "⭐ คุณผ่าน XGEN ภายใน 12 เดือน — ปีที่ 2 จะเปิด XGEN Path และ Recognition Trip" : "👑 คุณจบปีแรกใน XLEAD Path — ปีที่ 2 จะทำให้เห็นความต่างของระบบที่สร้างไว้"}</blockquote>`;
}
function campaignGateHtml(state2, status = "") {
  const sent = scoreName(state2);
  if (sent) {
    return `${campaignScoreDetails(state2)}
      <div class="v1-score-lock-success"><strong>✅ High Score บันทึกแล้ว</strong><span>ชื่อบนตาราง: ${escapeHtml2(sent)}</span></div>
      <h3>ทีนี้ดูสิ่งที่คุณสร้างไว้เดินต่อเอง</h3>
      <p class="dialog-note">จาก Month 13 เป็นต้นไป คุณไม่ต้องขายหรือตามรายคนแล้ว กดเดือนละครั้งเพื่อดูระบบเดินต่อจน Month 24</p>
      <div class="dialog-actions v1-finale-actions"><button class="dialog-button" type="button" data-v1b-enter-org>▶ ดูระบบทำงานต่อ 1 เดือน</button></div>`;
  }
  return `${campaignScoreDetails(state2)}
    <div class="v1-score-required">
      <strong>ขั้นสุดท้ายของปีแรก</strong>
      <p>ใส่ชื่ออะไรก็ได้เพื่อขึ้น High Score ก่อน แล้วไปต่อปีที่ 2 ได้ทันที</p>
      <label class="v9-score-name">ชื่อบน High Score <input type="text" maxlength="28" autocomplete="nickname" data-v1b-score-name placeholder="เช่น Teem / Ako / แมวขาว"></label>
      <p class="dialog-note" data-v1b-score-status>${escapeHtml2(status || "ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score")}</p>
      <button class="dialog-button" type="button" data-v1b-submit-score>🏆 บันทึกชื่อขึ้น High Score</button>
    </div>`;
}
function openCampaignGate(state2, status = "") {
  if (!state2?.campaignScore?.locked || state2.organizationMode) return;
  show(campaignGateHtml(state2, status), "wide", "campaign");
}
function finaleDetails2(state2) {
  const summary = state2.twoYearSummary || {};
  const trips = Array.isArray(summary.trips) ? summary.trips : [];
  const path = summary.year2Path || state2.year2Path || "xlead";
  return `<div class="dialog-kicker">🏁 MONTH 24 · TRUE ENDING · 2.0</div>
    <h2>2 ปีผ่านไปแล้ว — นี่คือสิ่งที่ระบบของคุณสร้าง</h2>
    <div class="v1-two-year-journey"><div><span>วันแรก</span><strong>โต๊ะ 1 ตัว · คุณ 1 คน</strong></div><i>→</i><div><span>2 ปีต่อมา</span><strong>${fmt(summary.activeCustomers)} ลูกค้า · ${fmt(summary.xvisorCount)} X-VISOR · ${fmt(summary.xleadCount)} XLEAD</strong></div></div>
    <div class="v1-finale-grid" aria-label="ผลลัพธ์เมื่อจบเดือน 24">
      <div><span>🏙️ Month 24 TGV</span><strong>${fmt(summary.month24TGV)} XV</strong></div>
      <div><span>🏆 Best TGV</span><strong>${fmt(summary.bestTGV)} XV</strong></div>
      <div><span>💎 Best Month Income</span><strong>${baht(summary.bestMonthIncome)}</strong></div>
      <div><span>💰 รายได้สะสม 24 เดือน</span><strong>${baht(summary.total24Income ?? summary.totalIncome)}</strong></div>
      <div><span>❤️ Active Customers</span><strong>${fmt(summary.activeCustomers)}</strong></div>
      <div><span>🌱 X-VISOR</span><strong>${fmt(summary.xvisorCount)}</strong></div>
      <div><span>👑 XLEAD</span><strong>${fmt(summary.xleadCount)}</strong></div>
      <div><span>🏙️ Organization Size</span><strong>${fmt(summary.organizationSize)}</strong></div>
    </div>
    <div class="v1-trip-stamps">${path === "xgen" ? trips.map((trip) => `<span>✈️ ${escapeHtml2(trip.destination)}<small>M${fmt(trip.month)}</small></span>`).join("") : '<span class="is-empty">XLEAD Path · รอบนี้ยังไม่ผ่าน XGEN ก่อนจบ Month 12 จึงไม่มี Recognition Trip</span>'}</div>
    <blockquote class="v1-ending-quote">${path === "xgen" ? "คุณสร้างคนที่สร้างคน และระบบที่ไม่ต้องรอคุณทำทุกอย่างเอง" : "คุณสร้างทีมได้แล้ว — NEW GAME+ รอบหน้า ลองแตะ 3,000,000 XV ในเดือนเดียวก่อนจบ Month 12"}</blockquote>`;
}
function finaleHtml2(state2) {
  const sent = scoreName(state2);
  return `${finaleDetails2(state2)}
    <div class="v1-score-lock-success"><strong>🏆 High Score ปีแรก</strong><span>${sent ? `บันทึกในชื่อ ${escapeHtml2(sent)}` : "คะแนน Month 12 ถูกล็อกไว้ในรอบนี้"}</span></div>
    <button class="dialog-button dialog-button--secondary" type="button" data-open-income-history>ดูประวัติและเทียบเดือน 1–24</button>
    <div class="dialog-actions v1-finale-actions"><button class="dialog-button dialog-button--secondary" type="button" data-v1b-new-run>↺ เล่นใหม่</button><button class="dialog-button" type="button" data-v1b-new-game-plus>⚡ NEW GAME+</button></div>
    <button class="dialog-button dialog-button--ghost" type="button" data-v1b-close-finale>กลับไปดูฉากจบ</button>`;
}
function openFinale(state2) {
  if (!state2?.runComplete) return;
  show(finaleHtml2(state2), "wide", state2.runId || "complete");
}
function patch() {
  
  
  const state2 = stateNow();
  if (!state2) return;
  const browsingHistory = $2("#gameDialog")?.open && $2("#gameDialog")?.dataset.v9Dialog === "income";
  if (state2.campaignScore?.locked && !state2.organizationMode) {
    const dialog3 = $2("#gameDialog");
    if (!browsingHistory && (!dialog3?.open || !dialog3.dataset.v1bCampaignGate)) openCampaignGate(state2);
    const actionBar2 = $2("#actionBar");
    if (actionBar2) actionBar2.innerHTML = scoreName(state2) ? '<button class="action-button action-button--primary" type="button" data-v1b-enter-org><span class="action-button__icon">▶</span><span class="action-button__copy"><strong>ดูระบบทำงานต่อ 1 เดือน</strong><small>Year 2 · กดเดือนละครั้งจน Month 24</small></span></button>' : '<button class="action-button action-button--primary" type="button" data-v1b-open-campaign-gate><span class="action-button__icon">🏆</span><span class="action-button__copy"><strong>ใส่ชื่อ High Score ก่อน</strong><small>บันทึกปีแรก แล้วค่อยเปิด Year 2</small></span></button>';
    return;
  }
  if (!state2.runComplete || browsingHistory) return;
  const actionBar = $2("#actionBar");
  if (actionBar && !actionBar.querySelector("[data-v1b-open-finale]")) {
    actionBar.innerHTML = '<button class="action-button action-button--primary" type="button" data-v1b-open-finale><span class="action-button__icon">🏁</span><span class="action-button__copy"><strong>ดูผลลัพธ์ 24 เดือน</strong><small>จบจริง · NEW GAME+</small></span></button>';
  }
  const dialog2 = $2("#gameDialog");
  if (dialog2?.open && dialog2.dataset.v1bFinale !== state2.runId) openFinale(state2);
  else if (!dialog2?.open && dismissedRun !== state2.runId) openFinale(state2);
}
async function submitScore2() {
  const state2 = stateNow();
  const score = state2?.campaignScore;
  if (!score?.locked || submittingRuns.has(state2.runId)) return;
  const input = $2("[data-v1b-score-name], [data-v9-score-name]");
  const status = $2("[data-v1b-score-status], [data-v9-score-status]");
  const displayName = String(input?.value || "").trim().slice(0, 28);
  if (!displayName) {
    if (status) status.textContent = "ใส่ชื่ออะไรก็ได้ก่อน แล้วค่อยไป Year 2";
    input?.focus();
    return;
  }
  if (status) status.textContent = "กำลังบันทึก High Score 2.0…";
  submittingRuns.add(state2.runId);
  const button = $2("[data-v1b-submit-score]");
  if (button) button.disabled = true;
  const isCurrentCampaignGate = () => {
    const current = stateNow();
    const currentDialog = $2("#gameDialog");
    return current?.runId === state2.runId && current.campaignScore?.locked && !current.organizationMode && currentDialog?.open && currentDialog.dataset.v1bCampaignGate === "1" && currentDialog.dataset.v9Dialog !== "income";
  };
  try {
    const response = await fetch("/api/xvisor-scores", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        runId: score.runId || state2.runId,
        scoreVersion: V1_SCORE_VERSION,
        runMode: state2.runMode || "FIRST_RUN",
        bestTgv: score.bestTgv,
        totalIncome: score.totalIncome,
        bestMonthlyIncome: score.bestMonthlyIncome,
        organizationSize: score.organizationSize,
        completedAt: score.completedAt
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "SUBMIT_FAILED");
    submittedScores.set(state2.runId, displayName);
    try {
      localStorage.setItem(`${SCORE_SENT_PREFIX3}${state2.runId}`, displayName);
    } catch {
    }
    // The player can inspect history while the request is pending. Persist this
    // run's result without replacing the panel they chose in the meantime.
    if (isCurrentCampaignGate()) openCampaignGate(stateNow(), `✅ บันทึก High Score แล้วในชื่อ ${displayName}`);
  } catch {
    if (isCurrentCampaignGate()) {
      const currentStatus = $2("[data-v1b-score-status], [data-v9-score-status]");
      if (currentStatus) currentStatus.textContent = "ส่ง High Score ไม่สำเร็จ · ต้องส่งสำเร็จก่อนจึงจะเปิด Year 2";
    }
  } finally {
    submittingRuns.delete(state2.runId);
    if (isCurrentCampaignGate()) {
      const currentButton = $2("[data-v1b-submit-score]");
      if (currentButton) currentButton.disabled = false;
    }
  }
}
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-v1b-submit-score],[data-v9-submit-score],[data-v1-submit-score]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    submitScore2();
    return;
  }
  if (event.target.closest("[data-v1b-open-campaign-gate]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openCampaignGate(stateNow());
    return;
  }
  if (event.target.closest("[data-v1b-enter-org],[data-v9-enter-org]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    if (!state2?.campaignScore?.locked) return;
    if (!scoreName(state2)) {
      openCampaignGate(state2, "ใส่ชื่อ High Score ให้สำเร็จก่อน แล้วปุ่ม Year 2 จะเปิด");
      return;
    }
    hardClose2();
    dispatch(EVENTS.ENTER_ORGANIZATION);
    return;
  }
  if (event.target.closest("[data-v1b-open-finale]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    if (state2?.runComplete) {
      dismissedRun = null;
      openFinale(state2);
    }
    return;
  }
  if (event.target.closest("[data-v1b-close-finale]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const state2 = stateNow();
    dismissedRun = state2?.runId || "dismissed";
    hardClose2();
    return;
  }
  if (event.target.closest("[data-v1b-new-run]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
    }
    location.reload();
    return;
  }
  if (event.target.closest("[data-v1b-new-game-plus]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    hardClose2();
    dismissedRun = null;
    dispatch(EVENTS.NEW_GAME_PLUS);
  }
}, true);
document.addEventListener("cancel", (event) => {
  const state2 = stateNow();
  if (event.target?.id === "gameDialog" && state2?.campaignScore?.locked && !state2.organizationMode) {
    event.preventDefault();
    openCampaignGate(state2);
  }
}, true);

function sync() {
  const current = getState();
  const app = $2("#gameApp");
  app.classList.toggle("is-organization-mode", Boolean(current.organizationMode));
  app.classList.toggle("is-travel-month", Boolean(current.organizationMode && current.activeTravel));
  persistCertification();
  patchHud();
  patchReleaseUi();
  patch();
  for (const link of app.querySelectorAll("a[href]")) {
    if (link.getAttribute("href").startsWith("#")) continue;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
}
return {
  sync,
  showIncome: renderIncome,
  showMonthConfirmation: renderMonthConfirm,
  showPeople(tab = "all", query = "", focusId = null) {
    peopleTab = tab; peopleQuery = query; peoplePage = 0; peopleFocusId = focusId;
    renderPeople(focusId);
  }
};
}
