export * from './game-copy-v8.js?v=8r4';
import * as v8copy from './game-copy-v8.js?v=8r4';
import {
  CAMPAIGN_MONTHS,
  EVENTS,
  XGEN_ROLLING_TARGET,
  calculateEconomy,
  getBestNextActions,
  getRolling3TGV,
} from './game-data-v9.js?v=9pre1';

function fmt(value) {
  return Math.round(Number(value || 0)).toLocaleString('th-TH');
}

function selectedPerson(state) {
  const people = [...(state.prospects || []), ...(state.customers || []), ...(state.team || [])];
  return people.find((person) => person.id === state.selectedPersonId) || people[0] || null;
}

function nameTutorialActions(state, content) {
  const target = selectedPerson(state);
  if (!target?.name || !Array.isArray(content?.actions)) return content;
  const name = target.name;
  const labels = {
    [EVENTS.TALK]: `💬 คุยกับ ${name}`,
    [EVENTS.REQUEST_CONSENT]: `🛡️ ขอ consent จาก ${name}`,
    [EVENTS.START_CUSTOMER_BASELINE]: `⚖️ ดู Baseline กับ ${name}`,
    [EVENTS.OPEN_ROUTINE_BUILDER]: `🧩 วาง Routine ให้ ${name}`,
    [EVENTS.MAKE_OFFER]: `📁 คุยแฟ้ม X กับ ${name}`,
    [EVENTS.CLOSE_RECEIPT]: `❤️ ดูแล ${name} ต่อ`,
    [EVENTS.START_ONBOARDING]: `🧭 Onboarding ${name} และนัดติดตาม`,
    [EVENTS.FOLLOW_UP_CUSTOMER]: `❤️ ติดตาม ${name} ถึง Day 28`,
    [EVENTS.START_CUSTOMER_REVIEW]: `📊 วัดซ้ำกับ ${name}`,
    [EVENTS.SAVE_SUCCESS]: `✅ บันทึก Success Case · ${name}`,
    [EVENTS.CONTINUE_CARE]: `❤️ ดูแล ${name} ต่อ`,
    [EVENTS.EXPLAIN_XVISOR]: `✨ เล่าเส้นทาง X-VISOR ให้ ${name}`,
    [EVENTS.PREPARE_G1]: `🌱 เตรียม ${name} เป็น X-VISOR`,
    [EVENTS.START_WEEKLY]: `🎓 พา ${name} เข้า Xcademy`,
  };
  return {
    ...content,
    actions: content.actions.map((item) => labels[item.event] ? { ...item, label: labels[item.event] } : item),
  };
}

function quick3(state) {
  return getBestNextActions(state, 3).map((item) => (
    item?.targetId && !item.id ? { ...item, id: item.targetId } : item
  ));
}

function finish(state, content) {
  return nameTutorialActions(state, content);
}

export function getStageContent(state) {
  const base = v8copy.getStageContent(state);

  if (state.organizationMode) {
    const economy = calculateEconomy(state);
    const agg = state.organization?.aggregate || {};
    return finish(state, {
      ...base,
      scene: 'management_org',
      progress: 100,
      eyebrow: `🏙️ ORGANIZATION MODE · MONTH ${state.month}`,
      title: `องค์กรเดินต่อ · ${fmt(economy.tgv)} XV`,
      reason: 'หลัง 12 เดือน ไม่มี Energy และไม่มีงานรายคนให้ grind — ดูภาพใหญ่แล้วปล่อยระบบเดินต่อ',
      speaker: 'XOS · Organization',
      dialogue: `❤️ ลูกค้า active ${fmt(agg.activeCustomers)} · 🌱 X-VISOR ${fmt(agg.xvisorCount || state.team?.length)} · 👑 XLEAD ${fmt(agg.xleadCount)}`,
      facts: [
        ['🏙️ TGV เดือนนี้', `${fmt(economy.tgv)} XV`],
        ['💰 รายได้เดือนนี้', `฿${fmt(economy.projectedIncome)}`],
        ['⭐ เรื่องขององค์กร', state.sceneReport?.story || state.lastMessage || 'ระบบยังเดินต่อ'],
      ],
      management: null,
      monthSummary: null,
      actions: [{ label: '▶ ผ่านไปอีก 1 เดือน', event: EVENTS.END_MONTH, icon: 'month' }],
    });
  }

  if (state.campaignComplete && state.campaignScore?.locked && !state.organizationMode) {
    const score = state.campaignScore;
    return finish(state, {
      ...base,
      scene: 'season_review',
      progress: 100,
      eyebrow: '🏆 MONTH 12 · REVELATION',
      title: '12 เดือนแรกจบแล้ว',
      reason: 'จากคนเดียว → ลูกค้า → X-VISOR → XLEAD → Organization ที่เริ่มเดินได้โดยไม่ต้องรอคุณทุกเรื่อง',
      speaker: 'X-VISOR QUEST',
      dialogue: 'คุณไม่ได้หยุดทำธุรกิจ แต่ธุรกิจไม่ต้องรอคุณทำทุกอย่างด้วยตัวเองอีกแล้ว',
      facts: [
        ['🏆 Best TGV', `${fmt(score.bestTgv)} XV`],
        ['💰 รายได้รวม 12 เดือน', `฿${fmt(score.totalIncome)}`],
        ['💎 สูงสุด / เดือน', `฿${fmt(score.bestMonthlyIncome)}`],
        ['🏙️ Organization', `${fmt(score.organizationSize)} คน`],
      ],
      management: null,
      monthSummary: null,
      actions: [{ label: '🏆 ดูผลและลงชื่อ High Score', ui: 'v9-finale', icon: 'certificate' }],
    });
  }

  if (state.sceneReport?.kind === 'xgen-qualified' && !state.career?.xgenCertified) {
    const rolling = Number(state.sceneReport.rolling3TGV || getRolling3TGV(state));
    return finish(state, {
      ...base,
      scene: 'xgen',
      eyebrow: '🔓 XGEN QUALIFICATION',
      title: 'คุณค้นพบเส้นทาง XGEN แล้ว',
      reason: 'องค์กรของคุณโตถึงจุดที่มีสิทธิ์เข้าสอบ XGEN — Qualification เกิดครั้งเดียวและไม่หาย',
      speaker: 'XOS · Organization',
      dialogue: `3-Month TGV ล่าสุด ${fmt(rolling)} XV · ผ่านเกณฑ์ ${fmt(XGEN_ROLLING_TARGET)} XV แล้ว`,
      facts: [
        ['ช่วงที่วัด', '3 เดือนล่าสุด'],
        ['Qualification', 'ผ่านแล้วถาวรในรอบนี้'],
        ['ขั้นถัดไป', 'สอบ XGEN เพื่อปลดล็อก ③'],
      ],
      actions: quick3(state),
    });
  }

  if (state.sceneReport?.kind === 'xgen-exam') {
    return finish(state, {
      ...base,
      scene: 'xgen',
      eyebrow: '🎓 XGEN EXAM · PASSED',
      title: 'Certified XGEN',
      reason: 'ผ่าน Qualification แล้ว และการสอบคือสิ่งที่ปลดล็อกรายได้จากการบริหาร Organization',
      speaker: 'Xcademy',
      dialogue: '③ รายได้จากการบริหาร Organization ปลดล็อกแล้ว',
      actions: quick3(state),
    });
  }

  if (state.stage === 'management' || state.sceneReport?.kind === 'the-xircle' || state.sceneReport?.kind === 'xircle-announcement' || state.sceneReport?.kind === 'xlead-exam') {
    return finish(state, { ...base, actions: quick3(state) });
  }

  if (Number(state.month || 0) > 0 && Number(state.month || 0) <= CAMPAIGN_MONTHS && base.management) {
    return finish(state, { ...base, actions: quick3(state) });
  }

  return finish(state, base);
}
