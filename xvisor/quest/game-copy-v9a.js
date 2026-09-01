export * from './game-copy-v8.js?v=1.0-core';
import * as v8copy from './game-copy-v8.js?v=1.0-core';
import {
  CAMPAIGN_MONTHS,
  EVENTS,
  XGEN_SINGLE_MONTH_TARGET,
  calculateEconomy,
  getBestNextActions,
} from './game-data.js';

const XGEN_GOAL_VISIBLE_AT = 1_500_000;

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

function realSingleMonthXgen(state, tgv) {
  return Boolean(
    Number(tgv || 0) >= XGEN_SINGLE_MONTH_TARGET ||
    state.career?.xgenQualifiedSingleMonth ||
    state.career?.xgenQualificationRule === 'single-month' ||
    state.career?.xgenCertified1b ||
    state.campaignOutcome?.xgenByMonth12
  );
}

export function getStageContent(state) {
  const base = v8copy.getStageContent(state);

  if (state.organizationMode) {
    const economy = calculateEconomy(state);
    const agg = state.organization?.aggregate || {};
    const xgenPath = state.year2Path === 'xgen';
    return finish(state, {
      ...base,
      scene: base.scene,
      progress: 100,
      eyebrow: `${xgenPath ? '⭐ XGEN' : '👑 XLEAD'} ORGANIZATION · MONTH ${state.month}`,
      title: `องค์กรเดินต่อ · ${fmt(economy.tgv)} XV`,
      reason: 'ปีที่ 2 คุณไม่ต้องกลับไปขายหรือตามรายคน — กดเดือนละครั้งแล้วดูระบบที่สร้างไว้ทำงานต่อ',
      speaker: 'XOS · Organization',
      dialogue: `❤️ ลูกค้า active ${fmt(agg.activeCustomers)} · 🌱 X-VISOR ${fmt(agg.xvisorCount || state.team?.length)} · 👑 XLEAD ${fmt(agg.xleadCount)}`,
      facts: [
        ['🏙️ TGV เดือนนี้', `${fmt(economy.tgv)} XV`],
        ['💰 รายได้เดือนนี้', `฿${fmt(economy.projectedIncome)}`],
        ['เส้นทางปีที่ 2', xgenPath ? 'XGEN · มี ③ Organization 5% + Recognition Trip' : 'XLEAD · ไม่มี ③ และไม่มี Recognition Trip'],
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
      reason: 'High Score ถูกล็อกตรงนี้ — ใส่ชื่อก่อน แล้วค่อยดูสิ่งที่คุณสร้างเดินต่อเองใน Year 2',
      speaker: 'X-VISOR QUEST',
      dialogue: state.campaignOutcome?.xgenByMonth12
        ? '⭐ คุณแตะ 3,000,000 XV ในเดือนเดียวสำเร็จ · Year 2 เปิด XGEN Path'
        : '👑 รอบนี้ยังไม่แตะ 3,000,000 XV ในเดือนเดียว · Year 2 จะเป็น XLEAD Path',
      facts: [
        ['🏆 Best TGV', `${fmt(score.bestTgv)} XV`],
        ['💰 รายได้รวม 12 เดือน', `฿${fmt(score.totalIncome)}`],
        ['💎 สูงสุด / เดือน', `฿${fmt(score.bestMonthlyIncome)}`],
        ['🏙️ Organization', `${fmt(score.organizationSize)} คน`],
      ],
      management: null,
      monthSummary: null,
      actions: [{ label: '🏆 ใส่ชื่อ High Score ก่อน', ui: 'v9-finale', icon: 'certificate' }],
    });
  }

  // Legacy V8/V9 used rolling-3 history to create xgen-qualified/xgen-exam scenes.
  // 1.0b accepts only the current-month 3M rule. A stale scene must never claim success.
  const economy = calculateEconomy(state);
  const tgv = Number(economy.tgv || 0);
  const singleMonthQualified = realSingleMonthXgen(state, tgv);

  if (['xgen-qualified', 'xgen-qualified-1b', 'xgen-exam'].includes(state.sceneReport?.kind) && singleMonthQualified) {
    return finish(state, {
      ...base,
      scene: 'xgen',
      eyebrow: '🏆 XGEN QUALIFIED',
      title: 'แตะ 3,000,000 XV ในเดือนเดียวแล้ว',
      reason: 'ผ่านครั้งเดียวและอยู่ถาวรในรอบนี้ — ③ Organization 5% เริ่มนับตั้งแต่เดือนที่ผ่านทันที',
      speaker: 'XOS · Organization',
      dialogue: `TGV เดือนนี้ ${fmt(tgv)} XV · เกณฑ์ ${fmt(XGEN_SINGLE_MONTH_TARGET)} XV`,
      facts: [
        ['ช่วงที่วัด', 'เดือนปัจจุบันเดือนเดียว'],
        ['Qualification', 'ผ่านแล้วถาวรในรอบนี้'],
        ['③ Organization', '5% ของ TGV เดือนนี้เริ่มทันที'],
      ],
      actions: quick3(state),
    });
  }

  if (!singleMonthQualified && Number(state.month || 0) >= 1 && Number(state.month || 0) <= CAMPAIGN_MONTHS && tgv >= XGEN_GOAL_VISIBLE_AT) {
    const remaining = Math.max(0, XGEN_SINGLE_MONTH_TARGET - tgv);
    return finish(state, {
      ...base,
      scene: base.scene,
      eyebrow: '🏙️ XGEN TARGET',
      title: `เหลืออีก ${fmt(remaining)} XV ในเดือนนี้`,
      reason: 'เกณฑ์เดียวคือ TGV 3,000,000 XV ภายในเดือนเดียว — ตอนนี้ยังไม่ Qualified',
      speaker: 'XOS · Organization',
      dialogue: `TGV เดือนนี้ ${fmt(tgv)} / ${fmt(XGEN_SINGLE_MONTH_TARGET)} XV`,
      facts: [
        ['ช่วงที่วัด', 'เดือนปัจจุบันเดือนเดียว'],
        ['Qualification', 'ยังไม่ผ่าน'],
        ['Rolling 3 เดือน', 'ไม่นับเป็นเกณฑ์ XGEN'],
      ],
      actions: quick3(state),
    });
  }

  if (state.sceneReport?.kind === 'the-xircle' || state.sceneReport?.kind === 'xircle-announcement') {
    return finish(state, {
      ...base,
      scene: 'the-xircle',
      eyebrow: state.sceneReport?.kind === 'xircle-announcement' ? '🏕️ THE XIRCLE · SPECIAL EVENT' : '🏕️ THE XIRCLE',
      title: state.sceneReport?.kind === 'xircle-announcement' ? 'ถึงรอบ The Xircle แล้ว' : 'RESET · RECONNECT · RISE',
      reason: 'กิจกรรมหลักต้องใช้ฉากแคมป์ The Xircle โดยตรง ไม่ใช้ฉาก Open House',
      actions: quick3(state),
    });
  }

  if (state.stage === 'management' || state.sceneReport?.kind === 'xlead-exam') {
    return finish(state, { ...base, actions: quick3(state) });
  }

  if (Number(state.month || 0) > 0 && Number(state.month || 0) <= CAMPAIGN_MONTHS && base.management) {
    return finish(state, { ...base, actions: quick3(state) });
  }

  return finish(state, base);
}
